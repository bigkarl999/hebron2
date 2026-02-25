import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  LogOut,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

export const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { href: "/admin/dashboard", label: "Bookings", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/reports", label: "Reports", icon: FileText },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  return (
    <aside
      className={`sticky top-0 h-screen border-r border-orange-100 bg-white transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-orange-100 px-4">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <span className="font-['Playfair_Display'] font-semibold">
                Admin
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-orange-50"
            data-testid="sidebar-toggle"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link to={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full ${
                      collapsed ? "justify-center px-2" : "justify-start gap-3"
                    } ${
                      isActive(item.href)
                        ? "bg-gradient-to-r from-orange-100 to-amber-50 text-orange-600"
                        : "text-muted-foreground hover:text-foreground hover:bg-orange-50"
                    }`}
                    data-testid={`sidebar-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-orange-100 p-3">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full text-red-600 hover:bg-red-50 hover:text-red-700 ${
              collapsed ? "justify-center px-2" : "justify-start gap-3"
            }`}
            data-testid="sidebar-logout"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
