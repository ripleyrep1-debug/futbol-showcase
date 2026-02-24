import { Link } from "react-router-dom";
import bluebetLogo from "@/assets/bluebet-logo-new.png";
import { Shield, Lock, Headphones } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src={bluebetLogo}
                alt="BlueBet"
                className="h-10 w-10 rounded-lg object-contain"
              />
              <span className="font-display text-xl font-bold tracking-wide text-primary">
                BLUE<span className="text-accent">BET</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-5 max-w-sm">
              Türkiye'nin en güvenilir bahis platformu. Canlı oranlar, anlık skorlar ve güvenli bahis deneyimi.
            </p>
            <div className="flex flex-wrap gap-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Güvenli</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 text-primary" />
                <span>SSL Korumalı</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Headphones className="h-4 w-4 text-primary" />
                <span>7/24 Destek</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-base font-bold text-foreground mb-4">HIZLI LİNKLER</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">Ana Sayfa</Link></li>
              <li><Link to="/#odds" className="text-muted-foreground hover:text-primary transition-colors text-sm">Canlı Maçlar</Link></li>
              <li><Link to="/#leagues" className="text-muted-foreground hover:text-primary transition-colors text-sm">Lig Maçları</Link></li>
              <li><Link to="/#standings" className="text-muted-foreground hover:text-primary transition-colors text-sm">Puan Durumu</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display text-base font-bold text-foreground mb-4">DESTEK</h4>
            <ul className="space-y-2">
              <li><Link to="/sss" className="text-muted-foreground hover:text-primary transition-colors text-sm">SSS</Link></li>
              <li><Link to="/iletisim" className="text-muted-foreground hover:text-primary transition-colors text-sm">İletişim</Link></li>
              <li><Link to="/kurallar" className="text-muted-foreground hover:text-primary transition-colors text-sm">Kurallar</Link></li>
              <li><Link to="/gizlilik" className="text-muted-foreground hover:text-primary transition-colors text-sm">Gizlilik Politikası</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs text-center sm:text-left">
            © 2025 BlueBet. Tüm hakları saklıdır. Bu site örnek amaçlıdır, gerçek bahis işlemi yapılmamaktadır.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">18+</span>
            <span className="text-xs text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground">Sorumlu Oyun</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
