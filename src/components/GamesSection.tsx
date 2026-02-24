import { Link } from "react-router-dom";
import { Star, Zap } from "lucide-react";

const GamesSection = () => {
  return (
    <section className="px-4 py-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Zap className="h-4 w-4 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground font-rajdhani">Casino Oyunları</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Blackjack Card */}
        <Link
          to="/blackjack"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-accent/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--accent)/0.15)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="p-5 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-card border border-border flex items-center justify-center text-2xl shadow-lg">
                🃏
              </div>
              <div className="flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-full">
                <Star className="h-3 w-3 text-accent fill-accent" />
                <span className="text-[10px] font-bold text-accent">Popüler</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-accent transition-colors">Blackjack</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Klasik 21 kart oyunu. Kasayı yen ve bahsini katla!
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground">Min ₺100</span>
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground">Max ₺10,000</span>
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground">2.5x BJ</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        {/* Roulette Card */}
        <Link
          to="/rulet"
          className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-accent/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--accent)/0.15)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="p-5 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-card border border-border flex items-center justify-center text-2xl shadow-lg">
                🎡
              </div>
              <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                <span className="text-[10px] font-bold text-green-400">Yeni</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-accent transition-colors">Rulet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Avrupa ruleti. Şansını dene, büyük kazan!
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground">Min ₺10</span>
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground">Max ₺10,000</span>
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-md text-muted-foreground">35x Direkt</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-accent to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        {/* Coming Soon */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 opacity-60 cursor-not-allowed">
          <div className="p-5">
            <div className="w-12 h-12 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center text-2xl mb-4">
              🎲
            </div>
            <h3 className="text-lg font-bold text-foreground/50 mb-1">Zar</h3>
            <p className="text-xs text-muted-foreground/50 mb-4">Klasik zar oyunu</p>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-muted px-2 py-1 rounded-full text-muted-foreground">
              Yakında
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GamesSection;
