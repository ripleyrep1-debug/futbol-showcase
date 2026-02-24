import { useState } from "react";
import { Menu, X, User, LogIn, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <img src={bluebetLogo} alt="BlueBet" className="h-10 w-10 object-contain" />
            <span className="font-display text-xl md:text-2xl font-bold tracking-wide text-primary">
              BLUE<span className="text-accent">BET</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-medium"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:border-destructive hover:text-destructive transition-all text-sm font-medium"
                >
                  Çıkış Yap
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/giris"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary hover:text-primary transition-all text-sm font-medium"
                >
                  <LogIn className="h-4 w-4" />
                  Giriş Yap
                </Link>
                <Link to="/kayit" className="btn-primary flex items-center gap-2 !px-4 !py-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Kayıt Ol</span>
                </Link>
              </>
            )}
            <button
              className="lg:hidden p-2 rounded-lg border border-border text-foreground"
              onClick={() => {
                onToggleSidebar?.();
                setMobileOpen(!mobileOpen);
              }}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <nav className="lg:hidden pb-4 border-t border-border pt-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
              >
                {link.label}
              </a>
            ))}
            {user && isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                Admin Panel
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
