import { useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminToday, sendBookingWhatsAppNow } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HandHeart,
  MessageCircle,
  Music,
  RefreshCw,
  Send,
  UserRound,
} from "lucide-react";

const badge = (status) => {
  if (status === "read") return "bg-blue-100 text-blue-700";
  if (status === "delivered") return "bg-green-100 text-green-700";
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "accepted") return "bg-cyan-100 text-cyan-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

const label = (status) => {
  if (!status || status === "not_requested") return "Not requested";
  if (status === "accepted") return "Accepted by Meta";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const LeaderCard = ({ title, icon: Icon, booking, onSend }) => (
  <Card className={booking ? "border-orange-100" : "border-dashed border-orange-200"}>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="h-5 w-5 text-orange-600" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {booking ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
              <UserRound className="h-5 w-5 text-orange-700" />
            </div>
            <div>
              <div className="font-semibold">{booking.full_name}</div>
              <div className="text-sm text-muted-foreground">{booking.phone_number ? "WhatsApp number on booking" : "No WhatsApp number"}</div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-orange-50/60 p-3">
              <div className="text-xs text-muted-foreground">Confirmation</div>
              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge(booking.whatsapp_confirmation_status)}`}>
                {label(booking.whatsapp_confirmation_status)}
              </span>
            </div>
            <div className="rounded-xl bg-orange-50/60 p-3">
              <div className="text-xs text-muted-foreground">Reminder</div>
              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge(booking.whatsapp_reminder_status)}`}>
                {label(booking.whatsapp_reminder_status)}
              </span>
            </div>
          </div>

          {booking.whatsapp_last_error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {booking.whatsapp_last_error}
            </div>
          )}

          {booking.phone_number && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => onSend(booking, "confirmation")}>
                <Send className="h-4 w-4" /> Send confirmation
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => onSend(booking, "reminder")}>
                <MessageCircle className="h-4 w-4" /> Send reminder
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-amber-50 p-5 text-center text-amber-800">
          <AlertTriangle className="mx-auto h-5 w-5" />
          <div className="mt-2 font-medium">This slot has not been booked</div>
        </div>
      )}
    </CardContent>
  </Card>
);

const AdminTodayPage = () => {
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminToday();
      setToday(res.data);
    } catch {
      toast.error("Could not load today's rota");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const send = async (booking, type) => {
    setSending(true);
    try {
      await sendBookingWhatsAppNow(booking.id, type);
      toast.success(`${type === "confirmation" ? "Confirmation" : "Reminder"} accepted by Meta`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-3 pb-24 sm:p-4 md:p-8 md:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold md:text-3xl">Today</h1>
            <p className="text-sm text-muted-foreground">Tonight's rota and message delivery at a glance.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading || sending} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Loading today's rota…</CardContent></Card>
        ) : today && (
          <>
            {today.unresolved_whatsapp_failures > 0 && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-semibold">{today.unresolved_whatsapp_failures} WhatsApp failure{today.unresolved_whatsapp_failures === 1 ? "" : "s"} need attention</div>
                  <div className="mt-1 text-sm">Open WhatsApp Message Centre to review failed deliveries.</div>
                </div>
              </div>
            )}

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />Date</div><div className="mt-2 font-semibold">{today.date}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" />Meeting</div><div className="mt-2 font-semibold">{today.meeting_time}</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" />Slots filled</div><div className="mt-2 font-semibold">{today.slots_filled}/2</div></CardContent></Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <LeaderCard title="Prayer" icon={HandHeart} booking={today.prayer} onSend={send} />
              <LeaderCard title="Worship" icon={Music} booking={today.worship} onSend={send} />
            </div>

            <div className="mt-5 rounded-2xl border border-orange-100 bg-white p-4 text-sm text-muted-foreground">
              Reminder run: <span className="font-medium text-foreground">{today.reminder_time}</span> · Pastor summary: <span className="font-medium text-foreground">{today.pastor_summary_time}</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminTodayPage;
