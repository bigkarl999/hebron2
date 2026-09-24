import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWhatsAppMessages, retryWhatsAppMessage } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";
import { format } from "date-fns";

const statusClass = (status) => {
  if (status === "read") return "bg-blue-100 text-blue-700";
  if (status === "delivered") return "bg-green-100 text-green-700";
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "accepted") return "bg-cyan-100 text-cyan-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
};

const statusIcon = (status) => {
  if (["read", "delivered", "sent", "accepted"].includes(status)) return CheckCircle2;
  if (status === "failed") return AlertTriangle;
  return Clock3;
};

const formatWhen = (value) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd MMM yyyy, HH:mm");
  } catch {
    return value;
  }
};

const WhatsAppMessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await getWhatsAppMessages(status, 200);
      setMessages(res.data.messages || []);
    } catch (error) {
      toast.error("Could not load WhatsApp messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [status]);

  const attention = useMemo(
    () => messages.filter((m) => m.needs_attention).length,
    [messages]
  );

  const retryNow = async (message) => {
    setRetryingId(message.id);
    try {
      await retryWhatsAppMessage(message.id);
      toast.success("Retry accepted by Meta");
      await loadMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Retry failed");
      await loadMessages();
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-3 pb-24 sm:p-4 md:p-8 md:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold md:text-3xl">
              WhatsApp Message Centre
            </h1>
            <p className="text-sm text-muted-foreground">
              Delivery tracking, retries and genuine failures in one place.
            </p>
          </div>
          <Button variant="outline" onClick={loadMessages} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {attention > 0 && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                {attention} message{attention === 1 ? "" : "s"} need attention
              </p>
              <p className="mt-1 text-sm">
                These messages failed and are not currently waiting for an automatic retry.
              </p>
            </div>
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Loaded messages</div>
              <div className="mt-1 text-2xl font-bold">{messages.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Needs attention</div>
              <div className="mt-1 text-2xl font-bold text-red-600">{attention}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Filter</div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-orange-600" />
              Message history
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading messages…</div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No messages found.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const Icon = statusIcon(message.status);
                  const timestamp =
                    message.read_at ||
                    message.delivered_at ||
                    message.sent_at ||
                    message.accepted_at ||
                    message.created_at;
                  return (
                    <div
                      key={message.id}
                      className={`rounded-2xl border p-4 ${
                        message.needs_attention
                          ? "border-red-200 bg-red-50/50"
                          : "border-orange-100 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(message.status)}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {message.status || "pending"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                              {message.message_type || "message"}
                            </span>
                            {message.retry_count > 0 && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">
                                Retry {message.retry_count}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 font-semibold">
                            {message.participant_name || "Manual / system message"}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {message.phone || "No number shown"} · {formatWhen(timestamp)}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Template: <span className="font-medium text-foreground">{message.template_name || "—"}</span>
                          </div>
                          {message.last_error && (
                            <div className="mt-3 rounded-xl border border-red-100 bg-white p-3 text-sm text-red-700">
                              {message.last_error}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {message.needs_attention && (
                            <Button
                              size="sm"
                              onClick={() => retryNow(message)}
                              disabled={retryingId === message.id}
                              className="gap-2"
                            >
                              <RotateCcw className={`h-4 w-4 ${retryingId === message.id ? "animate-spin" : ""}`} />
                              Retry now
                            </Button>
                          )}
                          {message.status === "accepted" && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Send className="h-3.5 w-3.5" /> Waiting for Meta status
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default WhatsAppMessagesPage;
