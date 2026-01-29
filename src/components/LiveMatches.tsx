import { Zap, ChevronRight } from "lucide-react";

interface Match {
  id: number;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  minute: number;
  odds1: number;
  oddsX: number;
  odds2: number;
  league: string;
}

const liveMatches: Match[] = [
  { id: 1, team1: "Beşiktaş", team2: "Trabzonspor", score1: 1, score2: 1, minute: 45, odds1: 2.10, oddsX: 3.25, odds2: 3.50, league: "Süper Lig" },
  { id: 2, team1: "Başakşehir", team2: "Antalyaspor", score1: 0, score2: 2, minute: 78, odds1: 4.50, oddsX: 3.80, odds2: 1.65, league: "Süper Lig" },
  { id: 3, team1: "Real Madrid", team2: "Barcelona", score1: 2, score2: 2, minute: 88, odds1: 2.80, oddsX: 3.10, odds2: 2.60, league: "La Liga" },
  { id: 4, team1: "Man City", team2: "Liverpool", score1: 1, score2: 0, minute: 23, odds1: 1.85, oddsX: 3.60, odds2: 4.20, league: "Premier League" },
];

const LiveMatches = () => {
  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="live-badge">
              <Zap className="h-3 w-3" />
              CANLI
            </div>
            <h2 className="font-display text-3xl text-foreground">CANLI MAÇLAR</h2>
          </div>
          <a href="#" className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium">
            Tümünü Gör
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* Matches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveMatches.map((match) => (
            <div key={match.id} className="card-match">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{match.league}</span>
                <span className="text-xs font-semibold text-live-red">{match.minute}' dk</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{match.team1}</p>
                </div>
                <div className="flex items-center gap-2 px-4">
                  <span className="font-display text-2xl text-accent">{match.score1}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-display text-2xl text-accent">{match.score2}</span>
                </div>
                <div className="flex-1 text-right">
                  <p className="font-semibold text-foreground">{match.team2}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="odds-btn flex-1">
                  <span className="text-xs text-muted-foreground block">1</span>
                  <span className="text-accent font-bold">{match.odds1.toFixed(2)}</span>
                </button>
                <button className="odds-btn flex-1">
                  <span className="text-xs text-muted-foreground block">X</span>
                  <span className="text-accent font-bold">{match.oddsX.toFixed(2)}</span>
                </button>
                <button className="odds-btn flex-1">
                  <span className="text-xs text-muted-foreground block">2</span>
                  <span className="text-accent font-bold">{match.odds2.toFixed(2)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveMatches;
