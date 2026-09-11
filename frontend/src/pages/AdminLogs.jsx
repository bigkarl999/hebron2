import { useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminLogs } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

const eventLabels = {
  booking_created: "Booking created",
  booking_updated: "Booking updated",
  booking_deleted: "Booking deleted",
  booking_cancelled: "Booking cancelled",
  whatsapp_confirmation: "WhatsApp confirmation",
  whatsapp_reminder: "WhatsApp reminder",
  manual_whatsapp: "Manual WhatsApp",
  admin_send_now: "Admin send now",
  scheduler_reminders: "Reminder scheduler",
  pastor_summary: "Pastor summary",
  admin_login: "Admin login",
  admin_login_failed: "Failed admin login",
};

const levelStyles = {
  success: "border-green-200 bg-green-50/50",
  error: "border-red-200 bg-red-50/50",
  warning: "border-amber-200 bg-amber-50/50",
  info: "border-slate-200 bg-white",
};

const levelIcon = (level) => {
  if (level === "success") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (level === "error") return <AlertCircle className="h-5 w-5 text-red-600" />;
  if (level === "warning") return <ShieldAlert className="h-5 w-5 text-amber-600" />;
  return <Info className="h-5 w-5 text-slate-500" />;
};

const formatTimestamp = (value) => {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const DetailRows = ({ details }) => {
  const entries = Object.entries(details || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!entries.length) return null;
  return (
    <div className="mt-3 grid gap-2 rounded-lg bg-white/70 p-3 text-xs sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <span className="text-muted-foreground">{key.replaceAll("_", " ")}: </span>
          <span className="break-words font-medium">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
        </div>
      ))}
    </div>
  );
};

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ event_type: "all", level: "all", search: "", limit: 100 });

  const fetchLogs = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const response = await getAdminLogs(nextFilters);
      setLogs(response.data.logs || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const clearFilters = () => {
    const cleared = { event_type: "all", level: "all", search: "", limit: 100 };
    setFilters(cleared);
    fetchLogs(cleared);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-['Playfair_Display'] text-2xl font-bold md:text-3xl">
              <Activity className="h-6 w-6 text-orange-600" />Activity Logs
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Easy-to-read history of bookings, admin changes and WhatsApp activity. Visitor IPs are privacy-masked before being stored.
            </p>
          </div>
          <Button variant="outline" onClick={() => fetchLogs()} className="gap-2">
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
        </div>

        <Card className="mb-5">
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="sm:col-span-2 xl:col-span-2">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                    placeholder="Name, action or description..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Event</Label>
                <Select value={filters.event_type} onValueChange={(value) => setFilters({ ...filters, event_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {Object.entries(eventLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Level</Label>
                <Select value={filters.level} onValueChange={(value) => setFilters({ ...filters, level: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => fetchLogs()} className="flex-1">Apply</Button>
                <Button variant="outline" onClick={clearFilters}>Clear</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
        ) : logs.length === 0 ? (
          <Card><CardContent className="flex h-48 flex-col items-center justify-center text-muted-foreground"><Activity className="mb-3 h-10 w-10" /><p>No matching activity yet.</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className={levelStyles[log.level] || levelStyles.info}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{levelIcon(log.level)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{log.title}</div>
                          <div className="mt-0.5 text-sm text-muted-foreground">{log.description}</div>
                        </div>
                        <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          {eventLabels[log.event_type] || log.event_type}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTimestamp(log.timestamp)}</span>
                        {log.participant_name && <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />{log.participant_name}</span>}
                        {log.client_ip && <span>IP: {log.client_ip}</span>}
                        {log.booking_id && <span className="font-mono">Booking: {log.booking_id.slice(0, 8)}…</span>}
                      </div>

                      <DetailRows details={log.details} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLogs;
