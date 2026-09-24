import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import BookSlotPage from "@/pages/BookSlotPage";
import CalendarPage from "@/pages/CalendarPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminReports from "@/pages/AdminReports";
import AdminLogs from "@/pages/AdminLogs";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import NotFoundPage from "@/pages/NotFoundPage";
import WhatsAppMessagesPage from "@/pages/WhatsAppMessagesPage";
import SystemHealthPage from "@/pages/SystemHealthPage";
import AdminTodayPage from "@/pages/AdminTodayPage";
import InstallAppPage from "@/pages/InstallAppPage";
import GuidePage from "@/pages/GuidePage";
import ProtectedRoute from "@/components/ProtectedRoute";

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookSlotPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/install" element={<InstallAppPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route
            path="/admin/today"
            element={
              <ProtectedRoute>
                <AdminTodayPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/whatsapp"
            element={
              <ProtectedRoute>
                <WhatsAppMessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system-health"
            element={
              <ProtectedRoute>
                <SystemHealthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute>
                <AdminLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
