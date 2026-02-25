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
} from "@/components/ui/dialog";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";
import { getAnalytics, getParticipantHistory } from "@/lib/api";
import {
  BarChart3,
  HandHeart,
  Music,
  Users,
  Search,
  Loader2,
  Calendar,
  TrendingUp,
  User,
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#a855f7"];

const AdminAnalytics = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [participantHistory, setParticipantHistory] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await getAnalytics(month, year);
      setAnalytics(response.data);
    } catch (error) {
      toast.error("Failed to fetch analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [month, year]);

  const handleSearch = async () => {
    if (!searchName.trim()) {
      toast.error("Please enter a name to search");
      return;
    }

    setIsSearching(true);
    try {
      const response = await getParticipantHistory(searchName);
      setParticipantHistory(response.data);
      setHistoryDialogOpen(true);
    } catch (error) {
      toast.error("Failed to fetch participant history");
    } finally {
      setIsSearching(false);
    }
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const pieData = analytics
    ? [
        { name: "Prayer", value: analytics.prayer_slots },
        { name: "Worship", value: analytics.worship_slots },
      ]
    : [];

  const barData = analytics?.participants?.slice(0, 10).map((p) => ({
    name: p.name.split(" ")[0],
    Prayer: p.prayer_count,
    Worship: p.worship_count,
  })) || [];

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-foreground md:text-3xl">
            Ministry Role Tracking
          </h1>
          <p className="text-muted-foreground">Analytics and participation insights</p>
        </div>

        {/* Filters */}
        <Card className="card-warm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[150px]">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[100px]">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1" />

              <div className="flex min-w-[250px] gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search participant..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                    data-testid="search-participant"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  data-testid="btn-search-participant"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card className="card-warm" data-testid="stat-total">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Bookings</p>
                      <p className="text-3xl font-bold text-foreground">
                        {analytics?.total_bookings || 0}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                      <BarChart3 className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="stat-prayer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Prayer Slots</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {analytics?.prayer_slots || 0}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <HandHeart className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="stat-worship">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Worship Slots</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {analytics?.worship_slots || 0}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                      <Music className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="stat-participants">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Members</p>
                      <p className="text-3xl font-bold text-green-600">
                        {analytics?.participants?.length || 0}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="mb-6 grid gap-6 md:grid-cols-2">
              <Card className="card-warm" data-testid="chart-distribution">
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg">
                    Role Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="chart-top-participants">
                <CardHeader>
                  <CardTitle className="font-['Playfair_Display'] text-lg">
                    Top Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="Prayer" fill="#3b82f6" />
                        <Bar dataKey="Worship" fill="#a855f7" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Participants List */}
            <Card className="card-warm" data-testid="participants-list">
              <CardHeader>
                <CardTitle className="font-['Playfair_Display'] text-lg">
                  All Participants This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.participants?.length === 0 ? (
                  <p className="text-center text-muted-foreground">No participants this month</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Total</th>
                          <th>Prayer</th>
                          <th>Worship</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics?.participants?.map((p, index) => (
                          <tr key={index}>
                            <td className="font-medium">{p.name}</td>
                            <td>{p.total_bookings}</td>
                            <td>
                              <span className="role-prayer">{p.prayer_count}</span>
                            </td>
                            <td>
                              <span className="role-worship">{p.worship_count}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Participant History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-['Playfair_Display']">
                Serving History: {participantHistory?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {/* Stats */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-orange-50 p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {participantHistory?.total_services || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Services</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {participantHistory?.prayer_count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Prayer</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {participantHistory?.worship_count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Worship</p>
                </div>
              </div>

              {/* History List */}
              <div className="max-h-[300px] overflow-y-auto">
                {participantHistory?.history?.length === 0 ? (
                  <p className="text-center text-muted-foreground">No history found</p>
                ) : (
                  <div className="space-y-2">
                    {participantHistory?.history?.map((h, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-orange-100 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(h.date), "MMMM d, yyyy")}</span>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            h.role === "Prayer"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {h.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminAnalytics;
