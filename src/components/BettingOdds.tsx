import { useState } from "react";
import { Clock, Zap, ChevronDown, ChevronUp, Trophy, Star } from "lucide-react";

export interface BetSelection {
  id: string;
  matchId: string;
  matchLabel: string;
  selection: string;
  odds: number;
}

interface Match {
  id: string;
  league: string;
  leagueFlag: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  time: string;
  isLive: boolean;
  liveMinute?: string;
  homeScore?: number;
  awayScore?: number;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  overUnder?: {
    over25: number;
    under25: number;
  };
  doubleChance?: {
    homeOrDraw: number;
    awayOrDraw: number;
    homeOrAway: number;
  };
}

const sampleMatches: Match[] = [
  {
    id: "1",
    league: "Süper Lig",
    leagueFlag: "🇹🇷",
    homeTeam: "Galatasaray",
    awayTeam: "Fenerbahçe",
    homeLogo: "⭐",
    awayLogo: "🟡",
    time: "21:00",
    isLive: true,
    liveMinute: "67'",
    homeScore: 2,
    awayScore: 1,
    odds: { home: 1.85, draw: 3.40, away: 4.20 },
    overUnder: { over25: 1.65, under25: 2.15 },
    doubleChance: { homeOrDraw: 1.22, awayOrDraw: 1.80, homeOrAway: 1.35 },
  },
  {
    id: "2",
    league: "Süper Lig",
    leagueFlag: "🇹🇷",
    homeTeam: "Beşiktaş",
    awayTeam: "Trabzonspor",
    homeLogo: "🦅",
    awayLogo: "🔵",
    time: "19:00",
    isLive: true,
    liveMinute: "34'",
    homeScore: 0,
    awayScore: 0,
    odds: { home: 2.10, draw: 3.20, away: 3.50 },
    overUnder: { over25: 1.80, under25: 1.95 },
    doubleChance: { homeOrDraw: 1.28, awayOrDraw: 1.65, homeOrAway: 1.40 },
  },
  {
    id: "3",
    league: "Premier Lig",
    leagueFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    homeTeam: "Manchester City",
    awayTeam: "Arsenal",
    homeLogo: "🔵",
    awayLogo: "🔴",
    time: "22:00",
    isLive: false,
    odds: { home: 1.75, draw: 3.80, away: 4.50 },
    overUnder: { over25: 1.55, under25: 2.35 },
    doubleChance: { homeOrDraw: 1.18, awayOrDraw: 1.95, homeOrAway: 1.30 },
  },
  {
    id: "4",
    league: "La Liga",
    leagueFlag: "🇪🇸",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeLogo: "👑",
    awayLogo: "🔵",
    time: "22:00",
    isLive: false,
    odds: { home: 2.30, draw: 3.40, away: 2.90 },
    overUnder: { over25: 1.60, under25: 2.20 },
    doubleChance: { homeOrDraw: 1.35, awayOrDraw: 1.55, homeOrAway: 1.25 },
  },
  {
    id: "5",
    league: "Serie A",
    leagueFlag: "🇮🇹",
    homeTeam: "Juventus",
    awayTeam: "AC Milan",
    homeLogo: "⚫",
    awayLogo: "🔴",
    time: "20:45",
    isLive: false,
    odds: { home: 2.00, draw: 3.30, away: 3.60 },
    overUnder: { over25: 1.75, under25: 2.00 },
    doubleChance: { homeOrDraw: 1.25, awayOrDraw: 1.70, homeOrAway: 1.38 },
  },
  {
    id: "6",
    league: "Bundesliga",
    leagueFlag: "🇩🇪",
    homeTeam: "Bayern Münih",
    awayTeam: "Dortmund",
    homeLogo: "🔴",
    awayLogo: "🟡",
    time: "20:30",
    isLive: false,
    odds: { home: 1.55, draw: 4.20, away: 5.50 },
    overUnder: { over25: 1.45, under25: 2.60 },
    doubleChance: { homeOrDraw: 1.15, awayOrDraw: 2.30, homeOrAway: 1.28 },
  },
];

interface BettingOddsProps {
  onAddBet: (bet: BetSelection) => void;
  selectedBets: BetSelection[];
}

const BettingOdds = ({ onAddBet, selectedBets }: BettingOddsProps) => {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "upcoming">("all");

  const filteredMatches = sampleMatches.filter((m) => {
    if (activeFilter === "live") return m.isLive;
    if (activeFilter === "upcoming") return !m.isLive;
    return true;
  });

  const isSelected = (matchId: string, selection: string) =>
    selectedBets.some((b) => b.matchId === matchId && b.selection === selection);

  const handleOddsClick = (match: Match, selection: string, odds: number) => {
    onAddBet({
      id: `${match.id}-${selection}`,
      matchId: match.id,
      matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
      selection,
      odds,
    });
  };

  return (
    <section id="odds" className="py-8">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="section-title flex items-center gap-2">
            <Trophy className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Bahis Oranları
          </h2>
          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: "all" as const, label: "Tümü", icon: Star },
              { key: "live" as const, label: "Canlı", icon: Zap },
              { key: "upcoming" as const, label: "Yaklaşan", icon: Clock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeFilter === key
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Match Cards */}
        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <div key={match.id} className="card-match">
              {/* League Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {match.leagueFlag} {match.league}
                </span>
                <div className="flex items-center gap-2">
                  {match.isLive ? (
                    <span className="live-badge">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      CANLI {match.liveMinute}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {match.time}
                    </span>
                  )}
                </div>
              </div>

              {/* Teams + Score */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{match.homeLogo}</span>
                    <span className="font-semibold text-sm sm:text-base text-foreground">{match.homeTeam}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{match.awayLogo}</span>
                    <span className="font-semibold text-sm sm:text-base text-foreground">{match.awayTeam}</span>
                  </div>
                </div>
                {match.isLive && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground font-display">
                      {match.homeScore} - {match.awayScore}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Odds (1X2) */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { key: "1", label: "1", odds: match.odds.home },
                  { key: "X", label: "X", odds: match.odds.draw },
                  { key: "2", label: "2", odds: match.odds.away },
                ].map(({ key, label, odds }) => (
                  <button
                    key={key}
                    onClick={() => handleOddsClick(match, `Maç Sonucu: ${label}`, odds)}
                    className={`flex flex-col items-center py-2.5 px-2 rounded-lg border font-semibold transition-all text-sm ${
                      isSelected(match.id, `Maç Sonucu: ${label}`)
                        ? "bg-primary text-primary-foreground border-primary shadow-lg"
                        : "bg-secondary border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground mb-0.5 font-normal">{label}</span>
                    <span className="font-bold">{odds.toFixed(2)}</span>
                  </button>
                ))}
              </div>

              {/* Expand button */}
              <button
                onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
              >
                {expandedMatch === match.id ? (
                  <>Daha Az <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Daha Fazla Bahis <ChevronDown className="h-3 w-3" /></>
                )}
              </button>

              {/* Expanded Odds */}
              {expandedMatch === match.id && match.overUnder && match.doubleChance && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {/* Over/Under 2.5 */}
                  <div>
                    <span className="text-xs text-muted-foreground mb-1.5 block font-medium">Üst/Alt 2.5 Gol</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "Üst 2.5", odds: match.overUnder.over25 },
                        { key: "Alt 2.5", odds: match.overUnder.under25 },
                      ].map(({ key, odds }) => (
                        <button
                          key={key}
                          onClick={() => handleOddsClick(match, key, odds)}
                          className={`flex justify-between items-center py-2 px-3 rounded-lg border text-sm transition-all ${
                            isSelected(match.id, key)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary border-border text-foreground hover:border-primary/50"
                          }`}
                        >
                          <span className="text-xs">{key}</span>
                          <span className="font-bold">{odds.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Double Chance */}
                  <div>
                    <span className="text-xs text-muted-foreground mb-1.5 block font-medium">Çifte Şans</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "1X", odds: match.doubleChance.homeOrDraw },
                        { key: "X2", odds: match.doubleChance.awayOrDraw },
                        { key: "12", odds: match.doubleChance.homeOrAway },
                      ].map(({ key, odds }) => (
                        <button
                          key={key}
                          onClick={() => handleOddsClick(match, `Çifte Şans: ${key}`, odds)}
                          className={`flex flex-col items-center py-2 px-2 rounded-lg border text-sm transition-all ${
                            isSelected(match.id, `Çifte Şans: ${key}`)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary border-border text-foreground hover:border-primary/50"
                          }`}
                        >
                          <span className="text-[10px] text-muted-foreground mb-0.5 font-normal">{key}</span>
                          <span className="font-bold">{odds.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BettingOdds;
