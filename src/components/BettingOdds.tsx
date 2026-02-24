import { useState, useEffect, useMemo } from "react";
import { Clock, Zap, ChevronDown, ChevronUp, Trophy, Star, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  fetchTodaysFixtures,
  fetchOddsByDate,
  type ApiFixture,
  type ApiOddsResponse,
  type ApiOddsBet,
  BET_CATEGORIES,
  PRIMARY_BET_IDS,
  getBetTypeName,
  translateValue,
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
  allBets: ApiOddsBet[];
}

function buildMatches(fixtures: ApiFixture[], oddsMap: Map<number, ApiOddsResponse>): ParsedMatch[] {
  return fixtures.map((f) => {
    const oddsData = oddsMap.get(f.fixture.id);
    const allBets = oddsData?.bookmakers?.[0]?.bets || [];
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
      allBets,
    };
  });
}

interface BettingOddsProps {
  onAddBet: (bet: BetSelection) => void;
  selectedBets: BetSelection[];
}

const OddsButton = ({
  matchId,
  label,
  odds,
  selectionKey,
  isSelected,
  onClick,
  compact,
}: {
  matchId: string;
  label: string;
  odds: string;
  selectionKey: string;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`flex ${compact ? "justify-between" : "flex-col items-center"} py-2 px-2 rounded-lg border font-semibold transition-all text-sm ${
      isSelected
        ? "bg-primary text-primary-foreground border-primary shadow-lg"
        : "bg-secondary border-border text-foreground hover:border-primary/50 hover:bg-primary/10"
    }`}
  >
    <span className={`text-[10px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"} ${compact ? "" : "mb-0.5"} font-normal`}>
      {label}
    </span>
    <span className="font-bold">{parseFloat(odds).toFixed(2)}</span>
  </button>
);

const BetMarketSection = ({
  bet,
  matchId,
  matchLabel,
  selectedBets,
  onAddBet,
}: {
  bet: ApiOddsBet;
  matchId: string;
  matchLabel: string;
  selectedBets: BetSelection[];
  onAddBet: (bet: BetSelection) => void;
}) => {
  const betName = getBetTypeName(bet.id, bet.name);
  const cols = bet.values.length <= 2 ? 2 : bet.values.length === 3 ? 3 : bet.values.length <= 4 ? 2 : 3;

  const isSelectedCheck = (selKey: string) =>
    selectedBets.some((b) => b.matchId === matchId && b.selection === selKey);

  return (
    <div>
      <span className="text-xs text-muted-foreground mb-1.5 block font-medium">{betName}</span>
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${Math.min(cols, bet.values.length)}, 1fr)` }}>
        {bet.values.map((v, i) => {
          const selKey = `${betName}: ${v.value}`;
          const label = translateValue(v.value);
          return (
            <OddsButton
              key={`${v.value}-${i}`}
              matchId={matchId}
              label={label}
              odds={v.odd}
              selectionKey={selKey}
              isSelected={isSelectedCheck(selKey)}
              compact={bet.values.length > 3}
              onClick={() =>
                onAddBet({
                  id: `${matchId}-${bet.id}-${v.value}`,
                  matchId,
                  matchLabel,
                  selection: selKey,
                  odds: parseFloat(v.odd),
                })
              }
            />
          );
        })}
      </div>
    </div>
  );
};

const BettingOdds = ({ onAddBet, selectedBets }: BettingOddsProps) => {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "upcoming" | "popular">("popular");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<ParsedMatch[]>([]);
  const [activeBetCategory, setActiveBetCategory] = useState<string>("main");

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
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredMatches = useMemo(() => {
    let filtered = allMatches;

    if (activeFilter === "live") {
      filtered = allMatches.filter((m) => m.isLive);
    } else if (activeFilter === "upcoming") {
      filtered = allMatches.filter((m) => !m.isLive && m.allBets.length > 0);
    } else if (activeFilter === "popular") {
      filtered = [...allMatches].sort((a, b) => b.allBets.length - a.allBets.length);
    }

    if (activeFilter !== "all") {
      filtered = filtered.filter((m) => m.allBets.length > 0);
    }

    return filtered.slice(0, 50);
  }, [allMatches, activeFilter]);

  const isSelected = (matchId: string, selection: string) =>
    selectedBets.some((b) => b.matchId === matchId && b.selection === selection);

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
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
            <RefreshCw className="h-4 w-4" /> Tekrar Dene
          </button>
        </div>
      </section>
    );
  }

  const matchesWithOdds = allMatches.filter((m) => m.allBets.length > 0).length;
  const liveCount = allMatches.filter((m) => m.isLive).length;

  return (
    <section id="odds" className="py-8">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Trophy className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              Bahis Oranları
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {allMatches.length} maç • {matchesWithOdds} oran mevcut • {liveCount} canlı
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
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
            <button onClick={loadData} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-primary transition-colors" title="Yenile">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Bet Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {Object.entries(BET_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setActiveBetCategory(key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeBetCategory === key
                  ? "bg-accent text-accent-foreground shadow"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Bu kategoride maç bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((match) => {
              const activeCat = BET_CATEGORIES[activeBetCategory];
              const primaryBets = match.allBets.filter((b) => PRIMARY_BET_IDS.includes(b.id) && activeCat.betIds.includes(b.id));
              const categoryBets = match.allBets.filter((b) => activeCat.betIds.includes(b.id));
              const displayBets = primaryBets.length > 0 ? primaryBets : categoryBets.slice(0, 3);
              const expandedBets = categoryBets.filter((b) => !displayBets.includes(b));
              const isExpanded = expandedMatch === match.id;
              const matchLabel = `${match.homeTeam} vs ${match.awayTeam}`;

              return (
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

                  {/* Bets for active category */}
                  {categoryBets.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {displayBets.map((bet) => (
                          <BetMarketSection
                            key={bet.id}
                            bet={bet}
                            matchId={match.id}
                            matchLabel={matchLabel}
                            selectedBets={selectedBets}
                            onAddBet={onAddBet}
                          />
                        ))}
                      </div>

                      {expandedBets.length > 0 && (
                        <>
                          <button
                            onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-2 mt-2"
                          >
                            {isExpanded ? (
                              <>Daha Az <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>+{expandedBets.length} Bahis Daha <ChevronDown className="h-3 w-3" /></>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 pt-3 border-t border-border space-y-3">
                              {expandedBets.map((bet) => (
                                <BetMarketSection
                                  key={bet.id}
                                  bet={bet}
                                  matchId={match.id}
                                  matchLabel={matchLabel}
                                  selectedBets={selectedBets}
                                  onAddBet={onAddBet}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <span className="text-xs text-muted-foreground">Bu kategori için oran mevcut değil</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default BettingOdds;
