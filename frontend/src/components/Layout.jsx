import { useEffect, useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Receipt,
  BarChart3,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { Button } from "./ui/button";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "POS", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/purchases", label: "Purchases", icon: Truck },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/users", label: "Users", icon: Users },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const { data } = await api.get("/notifications");
        if (mounted) setUnread(data.filter((n) => !n.read).length);
      } catch {}
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 15000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 border-r bg-card transition-transform md:relative md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar"
      >
        <div className="flex items-center justify-between border-b px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-foreground text-background font-black">
              P
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">POS PRO</div>
              <div className="label-cap text-[10px]">Retail Control</div>
            </div>
          </div>
          <button className="md:hidden" onClick={() => setOpen(false)} aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-secondary"
                }`
              }
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" strokeWidth={2.25} />
                {item.label}
              </span>
              {item.to === "/notifications" && unread > 0 && (
                <span className="mono rounded-sm bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t p-3">
          <div className="mb-2 px-2">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="label-cap text-[10px]">{user?.role}</div>
          </div>
          <Button
            data-testid="logout-btn"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 rounded-sm"
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col md:ml-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/80 px-4 py-3 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)} aria-label="menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm font-bold tracking-tight">POS PRO</div>
          <div className="w-5" />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
