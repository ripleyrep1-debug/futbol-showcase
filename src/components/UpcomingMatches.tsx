import { Calendar, ChevronRight } from "lucide-react";

interface UpcomingMatch {
  id: number;
  team1: string;
  team2: string;
  date: string;
  time: string;
  odds1: number;
  oddsX: number;
  odds2: number;
  league: string;
}

const upcomingMatches: UpcomingMatch[] = [
  { id: 1, team1: "Galatasaray", team2: "Beşiktaş", date: "30 Ocak", time: "20:00", odds1: 1.95, oddsX: 3.40, odds2: 3.80, league: "Süper Lig" },
  { id: 2, team1: "Fenerbahçe", team2: "Konyaspor", date: "31 Ocak", time: "19:00", odds1: 1.45, oddsX: 4.50, odds2: 6.50, league: "Süper Lig" },
  { id: 3, team1: "Bayern Münih", team2: "Dortmund", date: "01 Şubat", time: "21:30", odds1: 1.70, oddsX: 3.80, odds2: 4.75, league: "Bundesliga" },
  { id: 4, team1: "PSG", team2: "Lyon", date: "02 Şubat", time: "22:00", odds1: 1.55, oddsX: 4.20, odds2: 5.50, league: "Ligue 1" },
  { id: 5, team1: "Juventus", team2: "AC Milan", date: "02 Şubat", time: "22:45", odds1: 2.30, oddsX: 3.20, odds2: 3.10, league: "Serie A" },
  { id: 6, team1: "Chelsea", team2: "Arsenal", date: "03 Şubat", time: "18:30", odds1: 2.60, oddsX: 3.30, odds2: 2.70, league: "Premier League" },
];

const UpcomingMatches = () => {
  return (
    <section className="py-12 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-accent" />
            <h2 className="font-display text-3xl text-foreground">YAKLAŞAN MAÇLAR</h2>
          </div>
          <a href="#" className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium">
            Tüm Program
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* Matches Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 text-muted-foreground font-medium text-sm">Lig</th>
                <th className="text-left py-4 px-4 text-muted-foreground font-medium text-sm">Maç</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-medium text-sm">Tarih</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-medium text-sm">1</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-medium text-sm">X</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-medium text-sm">2</th>
              </tr>
            </thead>
            <tbody>
              {upcomingMatches.map((match) => (
                <tr key={match.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">{match.league}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-semibold text-foreground">{match.team1}</span>
                    <span className="text-muted-foreground mx-2">vs</span>
                    <span className="font-semibold text-foreground">{match.team2}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="text-sm text-foreground">{match.date}</div>
                    <div className="text-xs text-muted-foreground">{match.time}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button className="odds-btn min-w-[60px]">
                      <span className="text-accent font-bold">{match.odds1.toFixed(2)}</span>
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button className="odds-btn min-w-[60px]">
                      <span className="text-accent font-bold">{match.oddsX.toFixed(2)}</span>
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button className="odds-btn min-w-[60px]">
                      <span className="text-accent font-bold">{match.odds2.toFixed(2)}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default UpcomingMatches;
