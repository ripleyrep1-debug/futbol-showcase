import { Zap, TrendingUp } from "lucide-react";
import heroBanner from "@/assets/hero-banner.png";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Banner Image */}
      <div className="relative w-full">
        <img
          src={heroBanner}
          alt="BlueBet - Canlı Futbol Verileri"
          className="w-full h-[220px] sm:h-[300px] md:h-[400px] lg:h-[480px] object-cover object-center"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 lg:p-12">
          <div className="container mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3">
              <span className="text-primary">Canlı Oranlar</span>{" "}
              <span className="text-foreground">& Bahis</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base mb-4 max-w-md">
              En iyi oranlarla canlı bahis yap. Anlık skorlar, detaylı istatistikler ve güvenli bahis deneyimi.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <a href="#odds" className="btn-primary flex items-center gap-2 text-xs sm:text-sm !px-3 !py-2 sm:!px-4 sm:!py-2.5">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Bahis Oranlarını Gör
              </a>
              <a href="#live" className="btn-outline flex items-center gap-2 text-xs sm:text-sm !px-3 !py-2 sm:!px-4 sm:!py-2.5">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Canlı Maçlar
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
