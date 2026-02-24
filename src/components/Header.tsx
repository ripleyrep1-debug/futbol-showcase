import { useState } from "react";
import { Menu, X, User, LogIn, Shield, LogOut, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AuthModal from "@/components/AuthModal";
import DepositModal from "@/components/DepositModal";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

const navLinks = [
  { label: "Ana Sayfa", href: "#" },
  { label: "Bahis Oranları", href: "#odds" },
  { label: "Canlı Maçlar", href: "#live" },
  { label: "Puan Durumu", href: "#standings" },
  { label: "İstatistikler", href: "#stats" },
];

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [depositOpen, setDepositOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  // Fetch user balance
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance, display_name")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const balance = profile?.balance ?? 0;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 shrink-0">
              <img src={bluebetLogo} alt="BlueBet" className="h-10 w-10 object-contain" />
              <span className="font-display text-xl md:text-2xl font-bold tracking-wide text-primary">
                BLUE<span className="text-accent">BET</span>
              </span>
            </a>

            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {/* Balance Button */}
                  <button
                    onClick={() => setDepositOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all"
                  >
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-primary">
                      ₺{balance.toFixed(2)}
                    </span>
                  </button>

                  {isAdmin && (
                    <Link to="/admin" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all text-sm font-medium">
                      <Shield className="h-4 w-4" />
                      <span className="hidden md:inline">Admin</span>
                    </Link>
                  )}
                  <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground hover:border-destructive hover:text-destructive transition-all text-sm">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Çıkış</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => openAuth("login")} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary hover:text-primary transition-all text-sm font-medium">
                    <LogIn className="h-4 w-4" />
                    Giriş Yap
                  </button>
                  <button onClick={() => openAuth("register")} className="btn-primary flex items-center gap-2 !px-4 !py-2 text-sm">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Kayıt Ol</span>
                  </button>
                </>
              )}
              <button className="lg:hidden p-2 rounded-lg border border-border text-foreground" onClick={() => { onToggleSidebar?.(); setMobileOpen(!mobileOpen); }}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="lg:hidden pb-4 border-t border-border pt-4 space-y-1">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary transition-colors">
                  {link.label}
                </a>
              ))}
              {!user && (
                <>
                  <button onClick={() => { setMobileOpen(false); openAuth("login"); }} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                    Giriş Yap
                  </button>
                  <button onClick={() => { setMobileOpen(false); openAuth("register"); }} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                    Kayıt Ol
                  </button>
                </>
              )}
              {user && isAdmin && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                  Admin Panel
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
    </>
  );
};

export default Header;
