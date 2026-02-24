import { Trophy, Zap, Star, TrendingUp } from "lucide-react";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

const HeroSection = () => {
  return (
    <section className="relative py-12 md:py-20 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-[140px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Logo */}
          <img
            src={bluebetLogo}
            alt="BlueBet"
            className="h-24 w-24 md:h-32 md:w-32 object-contain mb-6"
          />

          {/* Tagline */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-primary">Canlı</span>{" "}
            <span className="text-foreground">Futbol Verileri</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-lg">
            Gerçek zamanlı maç skorları, lig tabloları ve detaylı istatistikler — tek platformda.
          </p>

          {/* CTA */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            <a href="#live" className="btn-primary flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Canlı Maçları Gör
            </a>
            <a href="#standings" className="btn-outline flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Puan Durumu
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 md:gap-12 w-full max-w-md">
            <div className="flex flex-col items-center gap-1">
              <Trophy className="h-5 w-5 text-accent mb-1" />
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">100+</span>
              <span className="text-xs text-muted-foreground">Lig</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="h-5 w-5 text-primary mb-1" />
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">Canlı</span>
              <span className="text-xs text-muted-foreground">Skor Takibi</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Star className="h-5 w-5 text-accent mb-1" />
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">7/24</span>
              <span className="text-xs text-muted-foreground">Güncel Veri</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
