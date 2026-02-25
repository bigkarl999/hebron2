import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";
import { getMonthlyReport, exportCSV, exportExcel } from "@/lib/api";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Calendar,
  HandHeart,
  Music,
  Users,
  TrendingUp,
  UserMinus,
  Award,
  Loader2,
} from "lucide-react";

const AdminReports = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const response = await getMonthlyReport(month, year);
      setReport(response.data);
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (type) => {
    const token = localStorage.getItem("adminToken");
    const url = type === "csv" ? exportCSV(month, year) : exportExcel(month, year);
    
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `report_${year}_${month}.${type === "csv" ? "csv" : "xlsx"}`;
        link.click();
        toast.success(`Report exported as ${type.toUpperCase()}`);
      })
      .catch(() => toast.error("Failed to export report"));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-foreground md:text-3xl">
            Monthly Reports
          </h1>
          <p className="text-muted-foreground">Generate and download monthly activity reports</p>
        </div>

        {/* Report Generator */}
        <Card className="card-warm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Playfair_Display'] text-lg">
              <FileText className="h-5 w-5 text-orange-500" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[150px]">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger data-testid="report-month">
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
                  <SelectTrigger data-testid="report-year">
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

              <Button
                onClick={generateReport}
                disabled={isLoading}
                className="btn-primary gap-2"
                data-testid="btn-generate-report"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Display */}
        {report && (
          <>
            {/* Export Buttons */}
            <div className="mb-6 flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport("csv")}
                className="gap-2"
                data-testid="btn-export-report-csv"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("excel")}
                className="gap-2"
                data-testid="btn-export-report-excel"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download Excel
              </Button>
            </div>

            {/* Report Header */}
            <Card className="card-warm mb-6" data-testid="report-header">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-['Playfair_Display'] text-2xl font-bold">
                      {months.find((m) => m.value === report.month)?.label} {report.year}
                    </h2>
                    <p className="text-muted-foreground">Monthly Activity Report</p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="card-warm" data-testid="report-available-slots">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Available Slots</p>
                      <p className="text-3xl font-bold text-foreground">
                        {report.total_available_slots}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Calendar className="h-6 w-6 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="report-prayer-bookings">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Prayer Bookings</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {report.total_prayer_bookings}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <HandHeart className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="report-worship-bookings">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Worship Bookings</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {report.total_worship_bookings}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                      <Music className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="report-participation-rate">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Participation Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        {report.participation_rate}%
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Participants & Inactive Members */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="card-warm" data-testid="report-top-participants">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-['Playfair_Display'] text-lg">
                    <Award className="h-5 w-5 text-orange-500" />
                    Top Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.top_participants?.length === 0 ? (
                    <p className="text-center text-muted-foreground">No participants this month</p>
                  ) : (
                    <div className="space-y-3">
                      {report.top_participants?.map((p, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-orange-100 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                index === 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : index === 1
                                  ? "bg-gray-100 text-gray-700"
                                  : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-orange-50 text-orange-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <span className="font-medium">{p.name}</span>
                          </div>
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                            {p.count} slots
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="card-warm" data-testid="report-inactive-members">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-['Playfair_Display'] text-lg">
                    <UserMinus className="h-5 w-5 text-red-500" />
                    Inactive Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Members who served last month but not this month
                  </p>
                  {report.inactive_members?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Users className="mb-2 h-8 w-8" />
                      <p>Everyone is active!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {report.inactive_members?.map((name, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3"
                        >
                          <UserMinus className="h-4 w-4 text-red-500" />
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty State */}
        {!report && !isLoading && (
          <Card className="card-warm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
              <h3 className="font-['Playfair_Display'] text-xl font-semibold">No Report Generated</h3>
              <p className="mt-2 text-muted-foreground">
                Select a month and year, then click "Generate Report"
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminReports;
