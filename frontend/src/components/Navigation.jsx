import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Calendar, BookOpen, Shield, Video } from "lucide-react";

const ZOOM_LINK = "https://us02web.zoom.us/j/9033071964";
const LOGO_URL = "https://customer-assets.emergentagent.com/job_hebron-schedule/artifacts/o14uwphq_hpalogo.png";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/book", label: "Book a Slot", icon: BookOpen },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/admin/login", label: "Admin", icon: Shield },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-orange-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold"
            data-testid="nav-logo"
          >
            <img 
              src={LOGO_URL} 
              alt="Hebron PA UK" 
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant={isActive(link.href) ? "default" : "ghost"}
                  className={`gap-2 ${
                    isActive(link.href)
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-orange-50"
                  }`}
                  data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            {/* Join Zoom Button */}
            <a href={ZOOM_LINK} target="_blank" rel="noopener noreferrer">
              <Button
                className="ml-2 gap-2 bg-blue-600 text-white hover:bg-blue-700"
                data-testid="nav-join-zoom"
              >
                <Video className="h-4 w-4" />
                Join Zoom
              </Button>
            </a>
          </div>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                data-testid="mobile-menu-toggle"
              >
                {isOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-white">
              <div className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant={isActive(link.href) ? "default" : "ghost"}
                      className={`w-full justify-start gap-3 ${
                        isActive(link.href)
                          ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-orange-50"
                      }`}
                      data-testid={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
                {/* Mobile Join Zoom Button */}
                <a
                  href={ZOOM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    className="w-full justify-start gap-3 bg-blue-600 text-white hover:bg-blue-700"
                    data-testid="mobile-nav-join-zoom"
                  >
                    <Video className="h-5 w-5" />
                    Join Zoom
                  </Button>
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
