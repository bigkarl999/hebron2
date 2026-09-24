import { useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystemHealth } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  CheckCircle2,
  Database,
  Mail,
  MessageCircle,
  RefreshCw,
  Server,
  TimerReset,
  TriangleAlert,
} from "lucide-react";

const HealthRow = ({ icon: Icon, label, value, ok = true }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-100 bg-white px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
        <Icon className="h-4 w-4 text-orange-600" />
      </div>
      <span className="font-medium">{label}</span>
    </div>
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
      {value}
    </span>
  </div>
);

const SystemHealthPage = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSystemHealth();
      setHealth(res.data);
    } catch (error) {
      toast.error("Could not load system health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-3 pb-24 sm:p-4 md:p-8 md:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold md:text-3xl">System Health</h1>
            <p className="text-sm text-muted-foreground">Quick checks for the services that keep Upper Room running.</p>
          </div>
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Checking services…</CardContent></Card>
        ) : health && (
          <>
            <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${
              health.healthy ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              {health.healthy ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <TriangleAlert className="mt-0.5 h-5 w-5" />}
              <div>
                <p className="font-semibold">{health.healthy ? "Core services look healthy" : "One or more services need attention"}</p>
                <p className="mt-1 text-sm">This checks configuration and live backend state, not just whether the page loaded.</p>
              </div>
            </div>

            {health.unresolved_whatsapp_failures > 0 && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                <div className="flex items-center gap-2 font-semibold">
                  <TriangleAlert className="h-5 w-5" />
                  {health.unresolved_whatsapp_failures} unresolved WhatsApp failure{health.unresolved_whatsapp_failures === 1 ? "" : "s"}
                </div>
                <p className="mt-1 text-sm">Open WhatsApp Message Centre to review or retry them.</p>
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-orange-600" />Services</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <HealthRow icon={Server} label="Backend" value={health.backend} ok={health.backend === "online"} />
                  <HealthRow icon={Database} label="MongoDB" value={health.database} ok={health.database === "connected"} />
                  <HealthRow icon={MessageCircle} label="WhatsApp" value={health.whatsapp} ok={health.whatsapp === "configured"} />
                  <HealthRow icon={Mail} label="Email" value={health.email} ok={health.email === "configured"} />
                  <HealthRow icon={TimerReset} label="Scheduler" value={health.scheduler} ok={health.scheduler === "running"} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">WhatsApp delivery monitor</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Last status event</div>
                    <div className="mt-1 font-medium">{health.last_whatsapp_event_at ? new Date(health.last_whatsapp_event_at).toLocaleString() : "No status event recorded yet"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last Meta status</div>
                    <div className="mt-1 font-medium capitalize">{health.last_whatsapp_status || "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Automatic retry policy</div>
                    <div className="mt-1 font-medium">
                      {health.retry_policy?.max_retries ?? 0} retry max · {health.retry_policy?.delay_seconds ?? 0}s delay · transient failures only
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-2">
                <CardHeader><CardTitle className="text-lg">Scheduled jobs</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    {Object.entries(health.scheduler_jobs || {}).map(([name, next]) => (
                      <div key={name} className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
                        <div className="font-medium">{name.replaceAll("_", " ")}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Next run: {next ? new Date(next).toLocaleString() : "Not scheduled"}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SystemHealthPage;
