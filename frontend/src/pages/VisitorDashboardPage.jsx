import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVisitorAnalytics } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Clock3,
  Eye,
  Globe2,
  Laptop,
  MapPin,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Users,
  Wifi,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";

const prettyDate = (value) => {
  try {
    return new Date(value + "T12:00:00").toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  } catch {
    return value;
  }
};

const prettyWhen = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const locationLabel = (item) => {
  const parts = [item.city, item.region, item.country].filter(Boolean).filter((x) => x !== "Unknown");
  if (parts.length) return parts.join(", ");
  if (item.timezone && item.timezone !== "Unknown") return item.timezone;
  return "Unknown";
};

const StatCard = ({ icon: Icon, label, value, hint, live = false }) => (
  <Card className="border-orange-100">
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold sm:text-3xl">{value ?? "—"}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <Icon className="h-5 w-5" />
          {live && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
        </div>
      </div>
    </CardContent>
  </Card>
);

const VisitorDashboardPage = () => {
  const [days, setDays] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await getVisitorAnalytics(Number(days));
      setData(response.data);
    } catch (error) {
      if (!quiet) toast.error("Could not load visitor analytics");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days]);

  useEffect(() => {
    const timer = window.setInterval(() => load(true), 20000);
    return () => window.clearInterval(timer);
  }, [days]);

  const daily = useMemo(
    () => (data?.daily || []).map((item) => ({ ...item, label: prettyDate(item.date) })),
    [data]
  );

  const activeCutoff = Date.now() - ((data?.active_window_seconds || 90) * 1000);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-3 pb-24 sm:p-4 md:p-8 md:pb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold md:text-3xl">Visitor Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Unique visitors, live activity, page views, locations and device usage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[145px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => load()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900">
          <strong>How counting works:</strong> one browser/device is counted once per day as a unique visitor, even if they open the site many times. Page views count every route view. “Active now” means a visitor has sent activity within the last {data?.active_window_seconds || 90} seconds. A person using another browser/device or private mode may count separately.
        </div>

        {loading ? (
          <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Loading visitor data…</CardContent></Card>
        ) : data && (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard icon={Activity} label="Active now" value={data.active_now} hint="Live visitors" live />
              <StatCard icon={Users} label="Unique today" value={data.today_unique} hint="One per browser/device" />
              <StatCard icon={Eye} label="Views today" value={data.today_page_views} hint="All page views" />
              <StatCard icon={Clock3} label="Sessions today" value={data.today_sessions} hint="Separate browsing sessions" />
              <StatCard icon={MousePointerClick} label="Total page views" value={data.total_page_views} hint="Includes repeat visits" />
              <StatCard icon={Users} label="Known unique visitors" value={data.total_unique_visitors} hint="Within retained analytics data" />
            </div>

            <div className="mb-6 grid gap-5 xl:grid-cols-2">
              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    Daily visitor trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="unique_visitors" name="Unique visitors" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="page_views" name="Page views" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Laptop className="h-5 w-5 text-orange-600" />
                    Device usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.devices || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="device" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="page_views" name="Page views" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid gap-5 xl:grid-cols-2">
              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MousePointerClick className="h-5 w-5 text-orange-600" />
                    Most viewed pages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(data.top_pages || []).length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No page views yet.</div>
                    ) : data.top_pages.map((page, index) => (
                      <div key={page.path} className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white p-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium"><span className="mr-2 text-xs text-muted-foreground">#{index + 1}</span>{page.path}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{page.unique_visitors} unique visitor{page.unique_visitors === 1 ? "" : "s"}</div>
                        </div>
                        <div className="shrink-0 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">{page.page_views} views</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-orange-600" />
                    Visitor locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(data.locations || []).length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No location data yet.</div>
                    ) : data.locations.map((item, index) => (
                      <div key={locationLabel(item) + index} className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white p-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{locationLabel(item)}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.timezone && item.timezone !== "Unknown" ? item.timezone : "No timezone"} · {item.page_views} views
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold">{item.unique_visitors}</div>
                          <div className="text-[10px] text-muted-foreground">unique</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    Location is intentionally coarse. The server uses hosting/CDN location headers when available and the browser timezone as a fallback. Full IP addresses are not stored.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid gap-5 xl:grid-cols-2">
              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wifi className="h-5 w-5 text-orange-600" />
                    Top masked networks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(data.networks || []).length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No network data yet.</div>
                    ) : data.networks.map((item, index) => (
                      <div key={item.network + index} className="flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-white p-3">
                        <div>
                          <div className="font-mono text-sm font-medium">{item.network}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{item.page_views} page views</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{item.unique_visitors}</div>
                          <div className="text-[10px] text-muted-foreground">unique</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    These are masked network prefixes, not full IP addresses. They help show repeated traffic patterns without exposing a visitor's exact address.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Globe2 className="h-5 w-5 text-orange-600" />
                    What “location” means
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Country, region or city is shown only when the hosting/CDN layer supplies that information. Otherwise the dashboard falls back to the browser's timezone.
                  </p>
                  <p>
                    This keeps the dashboard useful while avoiding storage of full IP addresses or exact GPS-style location.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-orange-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wifi className="h-5 w-5 text-orange-600" />
                  Recent visitors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-orange-100 text-left text-xs text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Status</th>
                        <th className="pb-3 pr-4 font-medium">Last seen</th>
                        <th className="pb-3 pr-4 font-medium">Current page</th>
                        <th className="pb-3 pr-4 font-medium">Location</th>
                        <th className="pb-3 pr-4 font-medium">Network</th>
                        <th className="pb-3 pr-4 font-medium">Device</th>
                        <th className="pb-3 font-medium">Browser</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.recent_visitors || []).map((visitor, index) => {
                        const live = visitor.last_seen && new Date(visitor.last_seen).getTime() >= activeCutoff;
                        return (
                          <tr key={visitor.first_seen + "-" + index} className="border-b border-orange-50">
                            <td className="py-3 pr-4">
                              <span className={"inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium " + (live ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>
                                <span className={"h-2 w-2 rounded-full " + (live ? "bg-green-500" : "bg-slate-400")} />
                                {live ? "Active" : "Recent"}
                              </span>
                            </td>
                            <td className="py-3 pr-4 whitespace-nowrap">{prettyWhen(visitor.last_seen)}</td>
                            <td className="py-3 pr-4 max-w-[220px] truncate font-medium">{visitor.current_path || "/"}</td>
                            <td className="py-3 pr-4">{locationLabel(visitor.location || {})}</td>
                            <td className="py-3 pr-4 font-mono text-xs">{visitor.network || "unknown"}</td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex items-center gap-1">
                                {visitor.device === "Mobile" ? <Smartphone className="h-3.5 w-3.5" /> : <Laptop className="h-3.5 w-3.5" />}
                                {visitor.device || "Unknown"}
                              </span>
                            </td>
                            <td className="py-3">{visitor.browser || "Unknown"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
                  Anonymous analytics only: no name, phone number, email address or full IP is attached to a visitor record.
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default VisitorDashboardPage;
