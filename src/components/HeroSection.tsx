import { Trophy, Zap, Star } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative py-16 overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary rounded-full blur-[100px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Featured Match Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-primary/30">
            <Star className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">HAFTANIN MAÇI</span>
          </div>
        </div>

        {/* Main Featured Match */}
        <div className="max-w-4xl mx-auto">
          <div className="card-match p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Team 1 */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-accent">
                  <span className="font-display text-3xl text-accent">GS</span>
                </div>
                <h3 className="font-display text-2xl text-foreground">GALATASARAY</h3>
                <span className="text-sm text-muted-foreground">Ev Sahibi</span>
              </div>

              {/* Match Info */}
              <div className="flex flex-col items-center gap-4">
                <div className="live-badge">
                  <Zap className="h-3 w-3" />
                  CANLI
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-5xl text-accent">2</span>
                  <span className="font-display text-3xl text-muted-foreground">-</span>
                  <span className="font-display text-5xl text-accent">1</span>
                </div>
                <span className="text-sm text-primary font-semibold">67' dk</span>
                <div className="flex gap-2 mt-2">
                  <button className="odds-btn">1: 2.15</button>
                  <button className="odds-btn">X: 3.40</button>
                  <button className="odds-btn">2: 3.10</button>
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-primary">
                  <span className="font-display text-3xl text-primary">FB</span>
                </div>
                <h3 className="font-display text-2xl text-foreground">FENERBAHÇE</h3>
                <span className="text-sm text-muted-foreground">Deplasman</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-8 mt-10">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-accent" />
            <div>
              <span className="font-display text-2xl text-foreground">1250+</span>
              <p className="text-xs text-muted-foreground">Günlük Maç</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <div>
              <span className="font-display text-2xl text-foreground">50+</span>
              <p className="text-xs text-muted-foreground">Canlı Maç</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-accent" />
            <div>
              <span className="font-display text-2xl text-foreground">%95</span>
              <p className="text-xs text-muted-foreground">Ödeme Oranı</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
