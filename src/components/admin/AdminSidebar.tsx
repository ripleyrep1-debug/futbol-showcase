import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Trophy, CreditCard, Settings, LogOut, ChevronLeft, ChevronRight, TrendingUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();

  const { data: pendingBets = 0 } = useQuery({
    queryKey: ["admin-pending-bets-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("bets").select("*", { count: "exact", head: true }).eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: pendingPayments = 0 } = useQuery({
    queryKey: ["admin-pending-payments-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const navItems = [
    { label: "Genel Bakış", to: "/admin", icon: LayoutDashboard, end: true, badge: 0 },
    { label: "Kullanıcılar", to: "/admin/kullanicilar", icon: Users, badge: 0 },
    { label: "Bahis Yönetimi", to: "/admin/bahisler", icon: Trophy, badge: pendingBets },
    { label: "Oran Yönetimi", to: "/admin/oranlar", icon: TrendingUp, badge: 0 },
    { label: "Ödemeler", to: "/admin/odemeler", icon: CreditCard, badge: pendingPayments },
    { label: "Site Ayarları", to: "/admin/ayarlar", icon: Settings, badge: 0 },
  ];

  return (
    <aside className={`sticky top-0 h-screen flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
        <img src={bluebetLogo} alt="BlueBet" className="h-8 w-8 shrink-0" />
        {!collapsed && <span className="font-display text-lg font-bold text-primary">BLUE<span className="text-accent">BET</span></span>}
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {item.badge > 0 && (
              <span className={`${collapsed ? "absolute -top-1 -right-1" : "ml-auto"} bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-2 space-y-1">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full">
          <ExternalLink className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Siteye Git</span>}
        </a>
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
