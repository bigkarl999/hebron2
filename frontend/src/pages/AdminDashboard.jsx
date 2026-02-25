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
  updateBooking,
  deleteBooking,
  unlockSlot,
  exportCSV,
  exportExcel,
} from "@/lib/api";
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
} from "lucide-react";
import { format } from "date-fns";

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: "",
    role: "",
    name: "",
    status: "",
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editData, setEditData] = useState({});

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

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleFilter = () => {
    fetchBookings();
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
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateBooking(selectedBooking.id, editData);
      toast.success("Booking updated successfully");
      setEditDialogOpen(false);
      fetchBookings();
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
      fetchBookings();
    } catch (error) {
      toast.error("Failed to delete booking");
    }
  };

  const handleUnlock = async (booking) => {
    try {
      await unlockSlot(booking.id);
      toast.success("Slot unlocked successfully");
      fetchBookings();
    } catch (error) {
      toast.error("Failed to unlock slot");
    }
  };

  const handleExport = (type) => {
    const token = localStorage.getItem("adminToken");
    const url = type === "csv" ? exportCSV() : exportExcel();
    
    // Open in new window with auth header via fetch
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `bookings.${type === "csv" ? "csv" : "xlsx"}`;
        link.click();
      })
      .catch(() => toast.error("Failed to export"));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-foreground md:text-3xl">
            Bookings Management
          </h1>
          <p className="text-muted-foreground">View and manage all booking slots</p>
        </div>

        {/* Filters */}
        <Card className="card-warm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[150px] flex-1">
                <Label className="text-xs text-muted-foreground">Search Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    className="pl-9"
                    data-testid="filter-name"
                  />
                </div>
              </div>

              <div className="min-w-[130px]">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  data-testid="filter-date"
                />
              </div>

              <div className="min-w-[120px]">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Select
                  value={filters.role}
                  onValueChange={(value) => setFilters({ ...filters, role: value })}
                >
                  <SelectTrigger data-testid="filter-role">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Prayer">Prayer</SelectItem>
                    <SelectItem value="Worship">Worship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[120px]">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger data-testid="filter-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Booked">Booked</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleFilter} className="gap-2" data-testid="btn-filter">
                <Filter className="h-4 w-4" />
                Filter
              </Button>

              <Button variant="outline" onClick={handleClearFilters} data-testid="btn-clear">
                Clear
              </Button>

              <Button
                variant="outline"
                onClick={fetchBookings}
                className="gap-2"
                data-testid="btn-refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Buttons */}
        <div className="mb-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            className="gap-2"
            data-testid="btn-export-csv"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("excel")}
            className="gap-2"
            data-testid="btn-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Bookings Table */}
        <Card className="card-warm overflow-hidden" data-testid="bookings-table">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                <Calendar className="mb-4 h-12 w-12" />
                <p>No bookings found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} data-testid={`booking-row-${booking.id}`}>
                        <td className="font-medium">{booking.full_name}</td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                              booking.role === "Prayer"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {booking.role === "Prayer" ? (
                              <HandHeart className="h-3 w-3" />
                            ) : (
                              <Music className="h-3 w-3" />
                            )}
                            {booking.role}
                          </span>
                        </td>
                        <td>{format(new Date(booking.date), "MMM d, yyyy")}</td>
                        <td>8:00 PM - 9:00 PM</td>
                        <td>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              booking.status === "Booked"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="max-w-[150px] truncate text-sm text-muted-foreground">
                          {booking.notes || "-"}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(booking)}
                              className="h-8 w-8 hover:bg-orange-50"
                              data-testid={`btn-edit-${booking.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {booking.status === "Booked" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUnlock(booking)}
                                className="h-8 w-8 hover:bg-orange-50"
                                data-testid={`btn-unlock-${booking.id}`}
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(booking)}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              data-testid={`btn-delete-${booking.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-['Playfair_Display']">Edit Booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editData.full_name || ""}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  data-testid="edit-full-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editData.role}
                  onValueChange={(value) => setEditData({ ...editData, role: value })}
                >
                  <SelectTrigger data-testid="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Prayer">Prayer</SelectItem>
                    <SelectItem value="Worship">Worship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editData.date || ""}
                  onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  data-testid="edit-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger data-testid="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Booked">Booked</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="btn-primary" data-testid="btn-save-edit">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this booking for {selectedBooking?.full_name}? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                data-testid="btn-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
