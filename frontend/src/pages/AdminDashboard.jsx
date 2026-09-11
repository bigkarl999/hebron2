import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";
import {
  getAdminBookings,
  getAdminToday,
  getWhatsAppStatus,
  updateBooking,
  deleteBooking,
  unlockSlot,
  exportCSV,
  exportExcel,
  sendManualWhatsApp,
  sendBookingWhatsAppNow,
} from "@/lib/api";
import { formatPhoneInput, phoneValidation } from "@/lib/phone";
import {
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Unlock,
  Loader2,
  Calendar,
  HandHeart,
  Music,
  RefreshCw,
  FileSpreadsheet,
  MessageCircle,
  Send,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ShieldCheck,
  UserRound,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";

const deliveryBadge = (status) => {
  const value = status || "not_requested";
  if (value === "sent") return "bg-green-100 text-green-700";
  if (value === "failed") return "bg-red-100 text-red-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

const deliveryLabel = (status) => {
  if (status === "sent") return "Sent";
  if (status === "failed") return "Failed";
  if (status === "pending") return "Pending";
  return "Not requested";
};

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [today, setToday] = useState(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ date: "", role: "", name: "", status: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [sendNowType, setSendNowType] = useState("reminder");
  const [manualWhatsapp, setManualWhatsapp] = useState({
    phone_number: "",
    template_name: "upperroom_reminder",
    full_name: "",
    date: format(new Date(), "yyyy-MM-dd"),
    role: "Prayer",
    prayer_leader: "",
    worship_leader: "",
  });

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await getAdminBookings(filters);
      setBookings(response.data);
    } catch (error) {
      toast.error("Failed to fetch bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const [todayResponse, statusResponse] = await Promise.all([
        getAdminToday(),
        getWhatsAppStatus(),
      ]);
      setToday(todayResponse.data);
      setWhatsAppStatus(statusResponse.data);
    } catch (error) {
      console.error("Failed to fetch admin overview", error);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchOverview();
  }, []);

  const refreshAll = () => {
    fetchBookings();
    fetchOverview();
  };

  const handleClearFilters = () => {
    setFilters({ date: "", role: "", name: "", status: "" });
    setTimeout(fetchBookings, 0);
  };

  const handleEdit = (booking) => {
    setSelectedBooking(booking);
    setEditData({
      full_name: booking.full_name,
      role: booking.role,
      date: booking.date,
      status: booking.status,
      notes: booking.notes || "",
      phone_number: booking.phone_number ? formatPhoneInput(booking.phone_number) : "",
      whatsapp_opt_in: Boolean(booking.whatsapp_opt_in),
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    const validation = phoneValidation(editData.phone_number || "");
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    try {
      await updateBooking(selectedBooking.id, {
        ...editData,
        whatsapp_opt_in: Boolean(editData.phone_number?.trim()),
      });
      toast.success("Booking updated successfully");
      setEditDialogOpen(false);
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update booking");
    }
  };

  const handleDelete = (booking) => {
    setSelectedBooking(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteBooking(selectedBooking.id);
      toast.success("Booking deleted successfully");
      setDeleteDialogOpen(false);
      refreshAll();
    } catch (error) {
      toast.error("Failed to delete booking");
    }
  };

  const handleUnlock = async (booking) => {
    try {
      await unlockSlot(booking.id);
      toast.success("Slot unlocked successfully");
      refreshAll();
    } catch (error) {
      toast.error("Failed to unlock slot");
    }
  };

  const openSendNow = (booking) => {
    if (!booking.phone_number) {
      toast.error("Add a WhatsApp number to this booking first");
      return;
    }
    setSelectedBooking(booking);
    setSendNowType("reminder");
    setSendDialogOpen(true);
  };

  const handleSendNow = async () => {
    if (!selectedBooking) return;
    setIsSendingWhatsApp(true);
    try {
      await sendBookingWhatsAppNow(selectedBooking.id, sendNowType);
      toast.success(`${sendNowType === "confirmation" ? "Confirmation" : "Reminder"} sent to ${selectedBooking.full_name}`);
      setSendDialogOpen(false);
      refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send WhatsApp message");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleExport = (type) => {
    const token = localStorage.getItem("adminToken");
    const url = type === "csv" ? exportCSV() : exportExcel();
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `bookings.${type === "csv" ? "csv" : "xlsx"}`;
        link.click();
      })
      .catch(() => toast.error("Failed to export"));
  };

  const isPastorTemplate = manualWhatsapp.template_name === "upperroom_pastor_daily_summary";

  const handleManualWhatsAppSend = async () => {
    const validation = phoneValidation(manualWhatsapp.phone_number);
    if (!manualWhatsapp.phone_number.trim() || !validation.valid) {
      toast.error(validation.message || "Enter a WhatsApp number");
      return;
    }
    if (!manualWhatsapp.date) {
      toast.error("Select the date to show in the message");
      return;
    }
    if (isPastorTemplate) {
      if (!manualWhatsapp.prayer_leader.trim() || !manualWhatsapp.worship_leader.trim()) {
        toast.error("Enter both Prayer and Worship leader names");
        return;
      }
    } else if (!manualWhatsapp.full_name.trim()) {
      toast.error("Enter the recipient's full name");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      await sendManualWhatsApp(manualWhatsapp);
      toast.success("WhatsApp message sent successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send WhatsApp message");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const todayLeaderCard = (label, booking, icon) => (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
      {booking ? (
        <>
          <div className="font-semibold">{booking.full_name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{booking.phone_number ? `WhatsApp ${formatPhoneInput(booking.phone_number)}` : "No WhatsApp number"}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-1 ${deliveryBadge(booking.whatsapp_confirmation_status)}`}>Confirmation: {deliveryLabel(booking.whatsapp_confirmation_status)}</span>
            <span className={`rounded-full px-2 py-1 ${deliveryBadge(booking.whatsapp_reminder_status)}`}>Reminder: {deliveryLabel(booking.whatsapp_reminder_status)}</span>
          </div>
        </>
      ) : (
        <div className="font-medium text-muted-foreground">Not booked</div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold text-foreground md:text-3xl">Bookings Management</h1>
            <p className="text-sm text-muted-foreground">Today, delivery status and booking operations in one place</p>
          </div>
          <Button variant="outline" onClick={refreshAll} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5 text-orange-600" />Today</CardTitle>
              <p className="text-sm text-muted-foreground">{today?.date || "Loading..."} · {today?.meeting_time || "8:00 PM - 9:00 PM UK"}</p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {todayLeaderCard("Prayer", today?.prayer, <HandHeart className="h-4 w-4" />)}
              {todayLeaderCard("Worship", today?.worship, <Music className="h-4 w-4" />)}
            </CardContent>
          </Card>

          <Card className={whatsAppStatus?.healthy ? "border-green-200" : "border-amber-200"}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-green-700" />WhatsApp Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span>Service</span><span className={`rounded-full px-2 py-1 text-xs font-medium ${whatsAppStatus?.healthy ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{whatsAppStatus?.healthy ? "Ready" : "Needs attention"}</span></div>
              <div className="flex items-center justify-between"><span>Automatic sends</span><span>{whatsAppStatus?.enabled ? "Enabled" : "Disabled"}</span></div>
              <div className="flex items-center justify-between"><span>Templates</span><span>{whatsAppStatus?.templates_configured ? "Configured" : "Missing"}</span></div>
              <div className="flex items-center justify-between"><span>Pastor number</span><span>{whatsAppStatus?.pastor_number_configured ? "Configured" : "Missing"}</span></div>
              <div className="flex items-center justify-between"><span>Language</span><span className="font-mono text-xs">{whatsAppStatus?.language || "-"}</span></div>
              <div className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">Reminder: {today?.reminder_time || "4:00 PM UK"} · Pastor summary: {today?.pastor_summary_time || "19:00 UK"}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-green-200 bg-green-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><MessageCircle className="h-5 w-5 text-green-700" />Manual WhatsApp Sender</CardTitle>
            <p className="text-sm text-muted-foreground">For testing, last-minute bookings or messages not tied to an existing booking.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-2">
                <Label>WhatsApp Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="tel" placeholder="07xxx xxxxxx or +44..." value={manualWhatsapp.phone_number} onChange={(e) => setManualWhatsapp({ ...manualWhatsapp, phone_number: formatPhoneInput(e.target.value) })} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={manualWhatsapp.template_name} onValueChange={(value) => setManualWhatsapp({ ...manualWhatsapp, template_name: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upperroom_booking_confirmation">Booking confirmation</SelectItem>
                    <SelectItem value="upperroom_reminder">Same-day reminder</SelectItem>
                    <SelectItem value="upperroom_pastor_daily_summary">Pastor daily summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date shown</Label>
                <Input type="date" value={manualWhatsapp.date} onChange={(e) => setManualWhatsapp({ ...manualWhatsapp, date: e.target.value })} />
              </div>
            </div>

            {isPastorTemplate ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Prayer Leader</Label><Input value={manualWhatsapp.prayer_leader} onChange={(e) => setManualWhatsapp({ ...manualWhatsapp, prayer_leader: e.target.value })} placeholder="Full name or Not booked" /></div>
                <div className="space-y-2"><Label>Worship Leader</Label><Input value={manualWhatsapp.worship_leader} onChange={(e) => setManualWhatsapp({ ...manualWhatsapp, worship_leader: e.target.value })} placeholder="Full name or Not booked" /></div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Full Name</Label><Input value={manualWhatsapp.full_name} onChange={(e) => setManualWhatsapp({ ...manualWhatsapp, full_name: e.target.value })} placeholder="Recipient full name" /></div>
                <div className="space-y-2"><Label>Lead</Label><Select value={manualWhatsapp.role} onValueChange={(value) => setManualWhatsapp({ ...manualWhatsapp, role: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Prayer">Prayer</SelectItem><SelectItem value="Worship">Worship</SelectItem></SelectContent></Select></div>
              </div>
            )}
            <div className="flex justify-end"><Button onClick={handleManualWhatsAppSend} disabled={isSendingWhatsApp} className="gap-2 bg-green-600 text-white hover:bg-green-700">{isSendingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send WhatsApp Now</Button></div>
          </CardContent>
        </Card>

        <Card className="card-warm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1"><Label className="text-xs text-muted-foreground">Search Name</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name..." value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} className="pl-9" /></div></div>
              <div className="min-w-[145px]"><Label className="text-xs text-muted-foreground">Date</Label><Input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></div>
              <div className="min-w-[130px]"><Label className="text-xs text-muted-foreground">Role</Label><Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}><SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem><SelectItem value="Prayer">Prayer</SelectItem><SelectItem value="Worship">Worship</SelectItem></SelectContent></Select></div>
              <div className="min-w-[130px]"><Label className="text-xs text-muted-foreground">Status</Label><Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}><SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Booked">Booked</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent></Select></div>
              <Button onClick={fetchBookings} className="gap-2"><Filter className="h-4 w-4" />Filter</Button>
              <Button variant="outline" onClick={handleClearFilters}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleExport("csv")} className="gap-2"><Download className="h-4 w-4" />Export CSV</Button>
          <Button variant="outline" onClick={() => handleExport("excel")} className="gap-2"><FileSpreadsheet className="h-4 w-4" />Export Excel</Button>
        </div>

        <Card className="card-warm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
            ) : bookings.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-muted-foreground"><Calendar className="mb-4 h-12 w-12" /><p>No bookings found</p></div>
            ) : (
              <>
                <div className="grid gap-3 p-3 md:hidden">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="rounded-xl border bg-white p-4">
                      <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{booking.full_name}</div><div className="text-sm text-muted-foreground">Lead {booking.role} · {format(new Date(booking.date), "MMM d, yyyy")}</div></div><span className={`rounded-full px-2 py-1 text-xs ${booking.status === "Booked" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{booking.status}</span></div>
                      <div className="mt-3 text-sm">{booking.phone_number ? formatPhoneInput(booking.phone_number) : <span className="text-muted-foreground">No WhatsApp number</span>}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-2 py-1 ${deliveryBadge(booking.whatsapp_confirmation_status)}`}>Confirmation: {deliveryLabel(booking.whatsapp_confirmation_status)}</span><span className={`rounded-full px-2 py-1 ${deliveryBadge(booking.whatsapp_reminder_status)}`}>Reminder: {deliveryLabel(booking.whatsapp_reminder_status)}</span></div>
                      <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openSendNow(booking)} disabled={!booking.phone_number} className="gap-1"><Send className="h-3.5 w-3.5" />Send now</Button><Button size="sm" variant="outline" onClick={() => handleEdit(booking)}><Edit className="h-3.5 w-3.5" /></Button>{booking.status === "Booked" && <Button size="sm" variant="outline" onClick={() => handleUnlock(booking)}><Unlock className="h-3.5 w-3.5" /></Button>}<Button size="sm" variant="outline" onClick={() => handleDelete(booking)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="data-table">
                    <thead><tr><th>Name</th><th>Role</th><th>Date</th><th>WhatsApp</th><th>Delivery</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="font-medium">{booking.full_name}</td>
                          <td>{booking.role}</td>
                          <td>{format(new Date(booking.date), "MMM d, yyyy")}</td>
                          <td className="text-sm">{booking.phone_number ? formatPhoneInput(booking.phone_number) : "-"}</td>
                          <td><div className="flex flex-col gap-1 text-xs"><span className={`w-fit rounded-full px-2 py-1 ${deliveryBadge(booking.whatsapp_confirmation_status)}`}>Confirmation: {deliveryLabel(booking.whatsapp_confirmation_status)}</span><span className={`w-fit rounded-full px-2 py-1 ${deliveryBadge(booking.whatsapp_reminder_status)}`}>Reminder: {deliveryLabel(booking.whatsapp_reminder_status)}</span></div></td>
                          <td><span className={`rounded-full px-2 py-1 text-xs font-medium ${booking.status === "Booked" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{booking.status}</span></td>
                          <td><div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => openSendNow(booking)} disabled={!booking.phone_number} title="Send WhatsApp now"><Send className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleEdit(booking)}><Edit className="h-4 w-4" /></Button>{booking.status === "Booked" && <Button variant="ghost" size="icon" onClick={() => handleUnlock(booking)}><Unlock className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" onClick={() => handleDelete(booking)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Send WhatsApp Now</DialogTitle></DialogHeader>
            <div className="space-y-4 py-3">
              <div className="rounded-lg bg-muted/50 p-3"><div className="font-medium">{selectedBooking?.full_name}</div><div className="text-sm text-muted-foreground">{selectedBooking?.phone_number ? formatPhoneInput(selectedBooking.phone_number) : ""}</div></div>
              <div className="space-y-2"><Label>Message</Label><Select value={sendNowType} onValueChange={setSendNowType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="confirmation">Booking confirmation</SelectItem><SelectItem value="reminder">Same-day reminder</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button><Button onClick={handleSendNow} disabled={isSendingWhatsApp} className="gap-2 bg-green-600 text-white hover:bg-green-700">{isSendingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Booking</DialogTitle></DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-2"><Label>Full Name</Label><Input value={editData.full_name || ""} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Role</Label><Select value={editData.role} onValueChange={(value) => setEditData({ ...editData, role: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Prayer">Prayer</SelectItem><SelectItem value="Worship">Worship</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={editData.date || ""} onChange={(e) => setEditData({ ...editData, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>WhatsApp Number</Label><Input type="tel" value={editData.phone_number || ""} onChange={(e) => setEditData({ ...editData, phone_number: formatPhoneInput(e.target.value) })} placeholder="07xxx xxxxxx or +44..." /><p className="text-xs text-muted-foreground">If a number is present, WhatsApp notifications are enabled automatically.</p></div>
              <div className="space-y-2"><Label>Status</Label><Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Booked">Booked</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveEdit} className="btn-primary">Save Changes</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Booking</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this booking for {selectedBooking?.full_name}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
