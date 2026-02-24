import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Trophy, CreditCard, Settings, LogOut,
  ChevronLeft, ChevronRight, TrendingUp, ExternalLink, BarChart3,
  Database, History, FileText, ToggleLeft, Headphones,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

interface NavGroup {
  label: string;
  items: {
    label: string;
    to: string;
    icon: any;
    end?: boolean;
    badge?: number;
  }[];
}

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

  const navGroups: NavGroup[] = [
    {
      label: "GENEL",
      items: [
        { label: "Genel Bakış", to: "/admin", icon: LayoutDashboard, end: true },
        { label: "Gelir & Analiz", to: "/admin/analiz", icon: BarChart3 },
      ],
    },
    {
      label: "KULLANICILAR",
      items: [
        { label: "Kullanıcı Listesi", to: "/admin/kullanicilar", icon: Users },
      ],
    },
    {
      label: "BAHİS",
      items: [
        { label: "Bahis Yönetimi", to: "/admin/bahisler", icon: Trophy, badge: pendingBets },
        { label: "Oran Yönetimi", to: "/admin/oranlar", icon: TrendingUp },
        { label: "Bahis Türleri", to: "/admin/bahis-turleri", icon: ToggleLeft },
        { label: "Bahis Geçmişi", to: "/admin/bahis-gecmisi", icon: History },
      ],
    },
    {
      label: "FİNANS",
      items: [
        { label: "Ödemeler", to: "/admin/odemeler", icon: CreditCard, badge: pendingPayments },
        { label: "İşlem Geçmişi", to: "/admin/islem-gecmisi", icon: FileText },
      ],
    },
    {
      label: "DESTEK",
      items: [
        { label: "Canlı Destek", to: "/admin/destek", icon: Headphones },
      ],
    },
    {
      label: "SİSTEM",
      items: [
        { label: "Site Ayarları", to: "/admin/ayarlar", icon: Settings },
        { label: "Veri Yönetimi", to: "/admin/veri-yonetimi", icon: Database },
      ],
    },
  ];

  return (
    <aside className={`sticky top-0 h-screen flex flex-col border-r border-border bg-card transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <img src={bluebetLogo} alt="BlueBet" className="h-8 w-8 shrink-0" />
        {!collapsed && <span className="font-display text-lg font-bold text-primary">BLUE<span className="text-accent">BET</span></span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-2">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5 px-2">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {(item.badge ?? 0) > 0 && (
                    <span className={`${collapsed ? "absolute -top-1 -right-1" : "ml-auto"} bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-0.5">
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
