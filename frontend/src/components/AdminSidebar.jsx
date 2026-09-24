import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  CalendarClock,
  MessageCircle,
  HeartPulse,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_hebron-schedule/artifacts/o14uwphq_hpalogo.png";

export const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { href: "/admin/today", label: "Today", icon: CalendarClock },
    { href: "/admin/dashboard", label: "Bookings", icon: LayoutDashboard },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/admin/system-health", label: "Health", icon: HeartPulse },
    { href: "/admin/logs", label: "Logs", icon: Activity },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/visitors", label: "Visitors", icon: UsersRound },
    { href: "/admin/reports", label: "Reports", icon: FileText },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen border-r border-orange-100 bg-white transition-all duration-300 md:block ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-orange-100 px-4">
            {!collapsed && (
              <Link to="/" className="flex items-center gap-2">
                <img src={LOGO_URL} alt="Logo" className="h-10 w-auto" />
                <span className="font-['Playfair_Display'] font-semibold">Admin</span>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="hover:bg-orange-50">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 p-3">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link to={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full ${collapsed ? "justify-center px-2" : "justify-start gap-3"} ${
                        isActive(item.href)
                          ? "bg-gradient-to-r from-orange-100 to-amber-50 text-orange-600"
                          : "text-muted-foreground hover:bg-orange-50 hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-orange-100 p-3">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={`w-full text-red-600 hover:bg-red-50 hover:text-red-700 ${collapsed ? "justify-center px-2" : "justify-start gap-3"}`}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-full items-center gap-1 overflow-x-auto">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href} className="min-w-[72px] flex-1">
              <div className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] ${isActive(item.href) ? "bg-orange-50 text-orange-600" : "text-muted-foreground"}`}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
          <button type="button" onClick={handleLogout} className="flex min-w-[72px] flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] text-red-600">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default AdminSidebar;
