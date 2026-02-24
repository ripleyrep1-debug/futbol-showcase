import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Trophy, CreditCard, Settings, LogOut, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

const navItems = [
  { label: "Genel Bakış", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Kullanıcılar", to: "/admin/kullanicilar", icon: Users },
  { label: "Bahis Yönetimi", to: "/admin/bahisler", icon: Trophy },
  { label: "Oran Yönetimi", to: "/admin/oranlar", icon: TrendingUp },
  { label: "Ödemeler", to: "/admin/odemeler", icon: CreditCard },
  { label: "Site Ayarları", to: "/admin/ayarlar", icon: Settings },
];

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();

  return (
    <aside className={`sticky top-0 h-screen flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
        <img src={bluebetLogo} alt="BlueBet" className="h-8 w-8 shrink-0" />
        {!collapsed && <span className="font-display text-lg font-bold text-primary">BLUE<span className="text-accent">BET</span></span>}
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-2 space-y-1">
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full">
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full">
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!collapsed && <span>Daralt</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
