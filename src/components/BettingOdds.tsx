import { useState, useEffect, useMemo } from "react";
import { Clock, Zap, ChevronDown, ChevronUp, Trophy, Star, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  fetchTodaysFixtures,
  fetchOddsByDate,
  POPULAR_LEAGUES,
  type ApiFixture,
  type ApiOddsResponse,
  type ApiOddsBet,
} from "@/lib/api-football";

export interface BetSelection {
  id: string;
  matchId: string;
  matchLabel: string;
  selection: string;
  odds: number;
}

interface ParsedMatch {
  id: string;
  fixtureId: number;
  league: string;
  leagueLogo: string;
  leagueFlag: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  time: string;
  isLive: boolean;
  liveMinute: string | null;
  homeScore: number | null;
  awayScore: number | null;
  odds: { home: number; draw: number; away: number } | null;
  overUnder: { over25: number; under25: number } | null;
  doubleChance: { homeOrDraw: number; awayOrDraw: number; homeOrAway: number } | null;
}

function parseOddsForFixture(oddsData: ApiOddsResponse | undefined): {
  matchResult: { home: number; draw: number; away: number } | null;
  overUnder: { over25: number; under25: number } | null;
  doubleChance: { homeOrDraw: number; awayOrDraw: number; homeOrAway: number } | null;
} {
  if (!oddsData || !oddsData.bookmakers?.length) {
    return { matchResult: null, overUnder: null, doubleChance: null };
  }

  const bookmaker = oddsData.bookmakers[0];
  const betsMap = new Map<number, ApiOddsBet>();
  bookmaker.bets.forEach((b) => betsMap.set(b.id, b));

  // Match Winner (bet id 1)
  let matchResult = null;
  const mw = betsMap.get(1);
  if (mw && mw.values.length >= 3) {
    const home = mw.values.find((v) => v.value === "Home");
    const draw = mw.values.find((v) => v.value === "Draw");
    const away = mw.values.find((v) => v.value === "Away");
    if (home && draw && away) {
      matchResult = {
        home: parseFloat(home.odd),
        draw: parseFloat(draw.odd),
        away: parseFloat(away.odd),
      };
    }
  }

  // Over/Under 2.5 (bet id 5)
  let overUnder = null;
  const ou = betsMap.get(5);
  if (ou) {
    const over = ou.values.find((v) => v.value === "Over 2.5");
    const under = ou.values.find((v) => v.value === "Under 2.5");
    if (over && under) {
      overUnder = {
        over25: parseFloat(over.odd),
        under25: parseFloat(under.odd),
      };
    }
  }

  // Double Chance (bet id 12)
  let doubleChance = null;
  const dc = betsMap.get(12);
  if (dc) {
    const hd = dc.values.find((v) => v.value === "Home/Draw");
    const ad = dc.values.find((v) => v.value === "Draw/Away");
    const ha = dc.values.find((v) => v.value === "Home/Away");
    if (hd && ad && ha) {
      doubleChance = {
        homeOrDraw: parseFloat(hd.odd),
        awayOrDraw: parseFloat(ad.odd),
        homeOrAway: parseFloat(ha.odd),
      };
    }
  }

  return { matchResult, overUnder, doubleChance };
}

function buildMatches(fixtures: ApiFixture[], oddsMap: Map<number, ApiOddsResponse>): ParsedMatch[] {
  return fixtures.map((f) => {
    const { matchResult, overUnder, doubleChance } = parseOddsForFixture(oddsMap.get(f.fixture.id));
    const date = new Date(f.fixture.date);
    const isLive = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(f.fixture.status.short);

    return {
      id: String(f.fixture.id),
      fixtureId: f.fixture.id,
      league: f.league.name,
      leagueLogo: f.league.logo,
      leagueFlag: f.league.flag,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeLogo: f.teams.home.logo,
      awayLogo: f.teams.away.logo,
      time: date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      isLive,
      liveMinute: isLive && f.fixture.status.elapsed ? `${f.fixture.status.elapsed}'` : null,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      odds: matchResult,
      overUnder,
      doubleChance,
    };
  });
}

interface BettingOddsProps {
  onAddBet: (bet: BetSelection) => void;
  selectedBets: BetSelection[];
}

const BettingOdds = ({ onAddBet, selectedBets }: BettingOddsProps) => {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "upcoming" | "popular">("popular");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<ParsedMatch[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fixtures, oddsArr] = await Promise.all([
        fetchTodaysFixtures(),
        fetchOddsByDate().catch(() => [] as ApiOddsResponse[]),
      ]);

      const oddsMap = new Map<number, ApiOddsResponse>();
      oddsArr.forEach((o) => oddsMap.set(o.fixture.id, o));

      const matches = buildMatches(fixtures, oddsMap);
      setAllMatches(matches);
    } catch (err: any) {
      setError(err.message || "Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredMatches = useMemo(() => {
    let filtered = allMatches;

    if (activeFilter === "live") {
      filtered = allMatches.filter((m) => m.isLive);
    } else if (activeFilter === "upcoming") {
      filtered = allMatches.filter((m) => !m.isLive && m.odds !== null);
    } else if (activeFilter === "popular") {
      filtered = allMatches.filter((m) => {
        const leagueId = parseInt(m.id); // we need league id
        return true; // show matches with odds from popular leagues
      });
      // Sort: popular leagues first, then matches with odds first
      filtered = [...allMatches].sort((a, b) => {
        const aHasOdds = a.odds ? 1 : 0;
        const bHasOdds = b.odds ? 1 : 0;
        return bHasOdds - aHasOdds;
      });
    }

    // Only show matches that have odds
    if (activeFilter !== "all") {
      filtered = filtered.filter((m) => m.odds !== null);
    }

    return filtered.slice(0, 50); // Limit for performance
  }, [allMatches, activeFilter]);

  const isSelected = (matchId: string, selection: string) =>
    selectedBets.some((b) => b.matchId === matchId && b.selection === selection);

  const handleOddsClick = (match: ParsedMatch, selection: string, odds: number) => {
    onAddBet({
      id: `${match.id}-${selection}`,
      matchId: match.id,
      matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
      selection,
      odds,
    });
  };

  if (loading) {
    return (
      <section id="odds" className="py-8">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Maçlar ve oranlar yükleniyor...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="odds" className="py-8">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive text-sm text-center">{error}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            <RefreshCw className="h-4 w-4" /> Tekrar Dene
          </button>
        </div>
      </section>
    );
  }

  const matchesWithOdds = allMatches.filter((m) => m.odds !== null).length;
  const liveCount = allMatches.filter((m) => m.isLive).length;

  return (
    <section id="odds" className="py-8">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Trophy className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              Bahis Oranları
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {allMatches.length} maç • {matchesWithOdds} oran mevcut • {liveCount} canlı
            </p>
          </div>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "popular" as const, label: "Popüler", icon: Star },
              { key: "live" as const, label: `Canlı (${liveCount})`, icon: Zap },
              { key: "upcoming" as const, label: "Yaklaşan", icon: Clock },
              { key: "all" as const, label: "Tümü", icon: Trophy },
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
            <button
              onClick={loadData}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-primary transition-colors"
              title="Yenile"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Bu kategoride maç bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => (
              <div key={match.id} className="card-match">
                {/* League Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {match.leagueFlag ? (
                      <img src={match.leagueFlag} alt="" className="h-3.5 w-3.5 rounded-sm object-cover" />
                    ) : (
                      <img src={match.leagueLogo} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
                    )}
                    {match.league}
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
                      <img src={match.homeLogo} alt={match.homeTeam} className="h-6 w-6 object-contain" />
                      <span className="font-semibold text-sm sm:text-base text-foreground">{match.homeTeam}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img src={match.awayLogo} alt={match.awayTeam} className="h-6 w-6 object-contain" />
                      <span className="font-semibold text-sm sm:text-base text-foreground">{match.awayTeam}</span>
                    </div>
                  </div>
                  {(match.isLive || match.homeScore !== null) && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground font-display">
                        {match.homeScore ?? 0} - {match.awayScore ?? 0}
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Odds (1X2) */}
                {match.odds ? (
                  <>
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
                    {(match.overUnder || match.doubleChance) && (
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
                    )}

                    {/* Expanded Odds */}
                    {expandedMatch === match.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-3">
                        {match.overUnder && (
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
                        )}

                        {match.doubleChance && (
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
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-xs text-muted-foreground">Oran bilgisi mevcut değil</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BettingOdds;
