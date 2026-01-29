import venomLogo from "@/assets/venom-logo.jpg";
import { Shield, Lock, Headphones } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={venomLogo} 
                alt="Venom Bet" 
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="font-display text-2xl tracking-wider text-accent glow-text">
                VENOM BET
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Türkiye'nin en güvenilir futbol tahmin platformu. Canlı maçlar, yüksek oranlar ve hızlı ödeme garantisi.
            </p>
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-accent" />
                <span>Güvenli</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 text-accent" />
                <span>SSL Korumalı</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Headphones className="h-4 w-4 text-accent" />
                <span>7/24 Destek</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-lg text-foreground mb-4">HIZLI LİNKLER</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">Ana Sayfa</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">Canlı Maçlar</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">Lig Maçları</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">Promosyonlar</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display text-lg text-foreground mb-4">DESTEK</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">SSS</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">İletişim</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">Kurallar</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-accent transition-colors text-sm">Gizlilik Politikası</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs">
            © 2025 Venom Bet. Tüm hakları saklıdır. Bu site örnek amaçlıdır, gerçek bahis işlemi yapılmamaktadır.
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
