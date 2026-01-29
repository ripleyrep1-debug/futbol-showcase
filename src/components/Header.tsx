import { Menu, User, LogIn } from "lucide-react";
import venomLogo from "@/assets/venom-logo.jpg";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={venomLogo} 
              alt="Venom Bet" 
              className="h-12 w-12 rounded-lg object-cover"
            />
            <span className="font-display text-2xl tracking-wider text-accent glow-text">
              VENOM BET
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-foreground hover:text-accent transition-colors font-medium">
              Ana Sayfa
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition-colors font-medium">
              Canlı Maçlar
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition-colors font-medium">
              Lig Maçları
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition-colors font-medium">
              Sonuçlar
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition-colors font-medium">
              İstatistikler
            </a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary hover:text-primary transition-all">
              <LogIn className="h-4 w-4" />
              <span className="font-medium">Giriş Yap</span>
            </button>
            <button className="btn-gold flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Kayıt Ol</span>
            </button>
            <button className="md:hidden p-2 rounded-lg border border-border">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
