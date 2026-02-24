import { useState, useRef, useEffect } from "react";
import { Menu, X, User, LogIn, Shield, LogOut, Wallet, Receipt, History, ChevronRight } from "lucide-react";
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin, signOut } = useAuth();

  // Fetch user balance
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance, display_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const balance = profile?.balance ?? 0;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Kullanıcı";

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

                  {/* Profile dropdown */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                      className="flex items-center gap-1.5 p-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-secondary transition-all"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </button>

                    {profileMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* User info header */}
                        <div className="p-4 border-b border-border bg-secondary/30">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
                            <span className="text-xs text-muted-foreground">Bakiye</span>
                            <span className="text-sm font-bold text-primary">₺{balance.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Menu items */}
                        <div className="p-2">
                          <button
                            onClick={() => { setProfileMenuOpen(false); setDepositOpen(true); }}
                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <Wallet className="h-4 w-4 text-primary" />
                              Para Yatır
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>

                          <Link
                            to="/bahislerim"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <Receipt className="h-4 w-4 text-primary" />
                              Bahislerim
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>

                          <Link
                            to="/bahislerim"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <History className="h-4 w-4 text-primary" />
                              İşlem Geçmişi
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm text-accent hover:bg-secondary transition-colors"
                            >
                              <span className="flex items-center gap-2.5">
                                <Shield className="h-4 w-4" />
                                Admin Panel
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          )}
                        </div>

                        {/* Logout */}
                        <div className="p-2 border-t border-border">
                          <button
                            onClick={() => { setProfileMenuOpen(false); signOut(); }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Çıkış Yap
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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