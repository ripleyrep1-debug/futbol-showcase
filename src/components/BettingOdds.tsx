import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Zap, ChevronDown, ChevronUp, Trophy, Star, Loader2, AlertCircle, RefreshCw, Search, X, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTodaysFixtures,
  fetchOddsByDate,
  type ApiFixture,
  type ApiOddsResponse,
  type ApiOddsBet,
  BET_CATEGORIES,
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
  leagueId: number;
  league: string;
  leagueLogo: string;
  leagueFlag: string | null;
  leagueCountry: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  time: string;
  dateStr: string; // YYYY-MM-DD
  dateLabel: string; // "Bugün", "Yarın", "27 Şub Prş" etc.
  isLive: boolean;
  liveMinute: string | null;
  homeScore: number | null;
  awayScore: number | null;
  allBets: ApiOddsBet[];
}

const FINISHED_STATUSES = ["FT", "AET", "PEN", "WO", "AWD", "CANC", "ABD"];
const POSTPONED_STATUSES = ["PST", "SUSP", "INT"];

// Turkish club names (lowercase) for matching in international competitions
const TURKISH_TEAMS = [
  "galatasaray", "fenerbahce", "fenerbahçe", "besiktas", "beşiktaş",
  "trabzonspor", "basaksehir", "başakşehir", "istanbul", "sivasspor",
  "adana demirspor", "antalyaspor", "alanyaspor", "konyaspor",
  "kayserispor", "gaziantep", "hatayspor", "kasimpasa", "kasımpaşa",
  "pendikspor", "rizespor", "samsunspor", "ankaragücü", "ankaragucu",
  "eyupspor", "eyüpspor", "goztepe", "göztepe", "bodrumspor",
];

// Generate default 1X2 odds for matches without API odds
function generateDefaultOdds(): ApiOddsBet[] {
  return [
    {
      id: 1,
      name: "Match Winner",
      values: [
        { value: "Home", odd: "2.10" },
        { value: "Draw", odd: "3.25" },
        { value: "Away", odd: "3.40" },
      ],
    },
  ];
}

// Apply odds_overrides from Supabase on top of API/default odds
function applyOverrides(
  bets: ApiOddsBet[],
  fixtureId: number,
  overrides: any[]
): ApiOddsBet[] {
  const fixtureOverrides = overrides.filter((o) => o.fixture_id === fixtureId && o.is_active);
  if (fixtureOverrides.length === 0) return bets;

  // Clone bets and apply overrides
  const updatedBets = bets.map((bet) => ({
    ...bet,
    values: bet.values.map((v) => {
      const override = fixtureOverrides.find(
        (o) => o.bet_type === bet.name && o.bet_value === v.value
      );
      return override ? { ...v, odd: String(override.custom_odd) } : v;
    }),
  }));

  // Add any overrides for bet types not in API data
  const existingKeys = new Set(
    bets.flatMap((b) => b.values.map((v) => `${b.name}::${v.value}`))
  );
  const newOverrides = fixtureOverrides.filter(
    (o) => !existingKeys.has(`${o.bet_type}::${o.bet_value}`)
  );

  // Group new overrides by bet_type
  const newBetMap = new Map<string, ApiOddsBet>();
  newOverrides.forEach((o) => {
    if (!newBetMap.has(o.bet_type)) {
      newBetMap.set(o.bet_type, { id: 999, name: o.bet_type, values: [] });
    }
    newBetMap.get(o.bet_type)!.values.push({ value: o.bet_value || "", odd: String(o.custom_odd) });
  });

  return [...updatedBets, ...Array.from(newBetMap.values())];
}

function buildMatches(
  fixtures: ApiFixture[],
  oddsMap: Map<number, ApiOddsResponse>,
  oddsOverrides: any[] = []
): ParsedMatch[] {
  return fixtures
    .filter((f) => !FINISHED_STATUSES.includes(f.fixture.status.short) && !POSTPONED_STATUSES.includes(f.fixture.status.short))
    .map((f) => {
      const oddsData = oddsMap.get(f.fixture.id);
      let allBets = oddsData?.bookmakers?.[0]?.bets || [];
      
      // If no API odds, generate defaults
      if (allBets.length === 0) {
        allBets = generateDefaultOdds();
      }
      
      // Apply admin overrides
      allBets = applyOverrides(allBets, f.fixture.id, oddsOverrides);
      
      const date = new Date(f.fixture.date);
      const isLive = ["1H", "2H", "HT", "ET", "P", "BT", "LIVE"].includes(f.fixture.status.short);
      
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      const dateStr = date.toISOString().split("T")[0];
      const todayStr = today.toISOString().split("T")[0];
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      
      let dateLabel: string;
      if (dateStr === todayStr) dateLabel = "Bugün";
      else if (dateStr === tomorrowStr) dateLabel = "Yarın";
      else dateLabel = date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
      
      return {
        id: String(f.fixture.id),
        fixtureId: f.fixture.id,
        leagueId: f.league.id,
        league: f.league.name,
        leagueLogo: f.league.logo,
        leagueFlag: f.league.flag,
        leagueCountry: f.league.country,
        homeTeam: f.teams.home.name,
        awayTeam: f.teams.away.name,
        homeLogo: f.teams.home.logo,
        awayLogo: f.teams.away.logo,
        time: date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        dateStr,
        dateLabel,
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
  selectedLeague?: string;
}

/* ─── Collapsible bet market group ─── */
const BetCategoryGroup = ({
  label,
  bets,
  matchId,
  matchLabel,
  selectedBets,
  onAddBet,
  defaultOpen,
}: {
  label: string;
  bets: ApiOddsBet[];
  matchId: string;
  matchLabel: string;
  selectedBets: BetSelection[];
  onAddBet: (b: BetSelection) => void;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen ?? false);
  if (bets.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary/50 hover:bg-secondary transition-colors"
      >
        <span className="text-xs font-bold text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{bets.length} pazar</span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="p-2 space-y-3">
          {bets.map((bet) => {
            const betName = getBetTypeName(bet.id, bet.name);
            const cols = bet.values.length <= 2 ? 2 : bet.values.length === 3 ? 3 : bet.values.length <= 4 ? 2 : 3;
            return (
              <div key={bet.id}>
                <span className="text-[10px] text-muted-foreground mb-1 block font-medium uppercase tracking-wider">{betName}</span>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(cols, bet.values.length)}, 1fr)` }}>
                  {bet.values.map((v, i) => {
                    const selKey = `${betName}: ${v.value}`;
                    const selected = selectedBets.some((b) => b.matchId === matchId && b.selection === selKey);
                    return (
                      <button
                        key={`${v.value}-${i}`}
                        onClick={() =>
                          onAddBet({
                            id: `${matchId}-${bet.id}-${v.value}`,
                            matchId,
                            matchLabel,
                            selection: selKey,
                            odds: parseFloat(v.odd),
                          })
                        }
                        className={`flex justify-between items-center py-1.5 px-2 rounded border text-xs transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        <span className={`text-[10px] ${selected ? "text-primary-foreground/70" : "text-muted-foreground"} truncate mr-1`}>
                          {translateValue(v.value)}
                        </span>
                        <span className="font-bold shrink-0">{parseFloat(v.odd).toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Match Card ─── */
const MatchCard = ({
  match,
  selectedBets,
  onAddBet,
  disabledBetIds,
}: {
  match: ParsedMatch;
  selectedBets: BetSelection[];
  onAddBet: (b: BetSelection) => void;
  disabledBetIds: Set<number>;
}) => {
  const [expanded, setExpanded] = useState(false);
  const matchLabel = `${match.homeTeam} vs ${match.awayTeam}`;
  const hasBets = match.allBets.length > 0;

  // Group bets by category, filtering out disabled ones
  const groupedBets = useMemo(() => {
    const groups: { label: string; bets: ApiOddsBet[] }[] = [];
    const usedIds = new Set<number>();

    Object.entries(BET_CATEGORIES).forEach(([, cat]) => {
      const catBets = match.allBets.filter((b) => cat.betIds.includes(b.id) && !usedIds.has(b.id) && !disabledBetIds.has(b.id));
      catBets.forEach((b) => usedIds.add(b.id));
      if (catBets.length > 0) {
        groups.push({ label: cat.label, bets: catBets });
      }
    });

    const remaining = match.allBets.filter((b) => !usedIds.has(b.id) && !disabledBetIds.has(b.id));
    if (remaining.length > 0) {
      groups.push({ label: "📊 Diğer Bahisler", bets: remaining });
    }

    return groups;
  }, [match.allBets, disabledBetIds]);

  // Quick 1X2 odds for collapsed view
  const matchWinner = match.allBets.find((b) => b.id === 1);

  return (
    <div className="card-match">
      {/* League + time header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {match.leagueFlag ? (
            <img src={match.leagueFlag} alt="" className="h-3.5 w-3.5 rounded-sm object-cover" />
          ) : (
            <img src={match.leagueLogo} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
          )}
          {match.league}
        </span>
        {match.isLive ? (
          <span className="live-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            CANLI {match.liveMinute}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {match.dateLabel !== "Bugün" && <span className="text-[10px] opacity-75">{match.dateLabel}</span>}
            {match.time}
          </span>
        )}
      </div>

      {/* Teams row + quick 1X2 */}
      <div className="flex items-center gap-2 mb-1">
        <img src={match.homeLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
        <span className="font-semibold text-sm text-foreground flex-1 truncate">{match.homeTeam}</span>
        {(match.isLive || match.homeScore !== null) && (
          <span className="font-bold text-sm text-foreground w-5 text-right">{match.homeScore ?? 0}</span>
        )}
        {matchWinner && (
          <OddsChip
            value={matchWinner.values.find((v) => v.value === "Home")?.odd || ""}
            label="1"
            matchId={match.id}
            betId={matchWinner.id}
            betName={getBetTypeName(1, "Match Winner")}
            rawValue="Home"
            matchLabel={matchLabel}
            selectedBets={selectedBets}
            onAddBet={onAddBet}
          />
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <img src={match.awayLogo} alt="" className="h-5 w-5 object-contain shrink-0" />
        <span className="font-semibold text-sm text-foreground flex-1 truncate">{match.awayTeam}</span>
        {(match.isLive || match.awayScore !== null) && (
          <span className="font-bold text-sm text-foreground w-5 text-right">{match.awayScore ?? 0}</span>
        )}
        {matchWinner && (
          <OddsChip
            value={matchWinner.values.find((v) => v.value === "Away")?.odd || ""}
            label="2"
            matchId={match.id}
            betId={matchWinner.id}
            betName={getBetTypeName(1, "Match Winner")}
            rawValue="Away"
            matchLabel={matchLabel}
            selectedBets={selectedBets}
            onAddBet={onAddBet}
          />
        )}
      </div>

      {/* Draw chip centered */}
      {matchWinner && (
        <div className="flex justify-center mb-2">
          <OddsChip
            value={matchWinner.values.find((v) => v.value === "Draw")?.odd || ""}
            label="X"
            matchId={match.id}
            betId={matchWinner.id}
            betName={getBetTypeName(1, "Match Winner")}
            rawValue="Draw"
            matchLabel={matchLabel}
            selectedBets={selectedBets}
            onAddBet={onAddBet}
            wide
          />
        </div>
      )}

      {/* Expand for all bets */}
      {hasBets && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1.5 border-t border-border mt-1"
          >
            {expanded ? (
              <>Bahisleri Gizle <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>{match.allBets.length} Bahis Pazarı <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {groupedBets.map((group, idx) => (
                <BetCategoryGroup
                  key={idx}
                  label={group.label}
                  bets={group.bets}
                  matchId={match.id}
                  matchLabel={matchLabel}
                  selectedBets={selectedBets}
                  onAddBet={onAddBet}
                  defaultOpen={idx === 0}
                />
              ))}
            </div>
          )}
        </>
      )}

      {!hasBets && (
        <div className="text-center py-1 border-t border-border mt-1">
          <span className="text-[10px] text-muted-foreground">Oran bilgisi mevcut değil</span>
        </div>
      )}
    </div>
  );
};

/* ─── Odds Chip (inline small button) ─── */
const OddsChip = ({
  value,
  label,
  matchId,
  betId,
  betName,
  rawValue,
  matchLabel,
  selectedBets,
  onAddBet,
  wide,
}: {
  value: string;
  label: string;
  matchId: string;
  betId: number;
  betName: string;
  rawValue: string;
  matchLabel: string;
  selectedBets: BetSelection[];
  onAddBet: (b: BetSelection) => void;
  wide?: boolean;
}) => {
  if (!value) return null;
  const selKey = `${betName}: ${rawValue}`;
  const selected = selectedBets.some((b) => b.matchId === matchId && b.selection === selKey);

  return (
    <button
      onClick={() =>
        onAddBet({
          id: `${matchId}-${betId}-${rawValue}`,
          matchId,
          matchLabel,
          selection: selKey,
          odds: parseFloat(value),
        })
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold transition-all shrink-0 ${wide ? "min-w-[80px] justify-center" : ""} ${
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary border-border text-foreground hover:border-primary/50"
      }`}
    >
      <span className={`text-[10px] font-normal ${selected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</span>
      {parseFloat(value).toFixed(2)}
    </button>
  );
};

/* ─── Main Component ─── */
const BettingOdds = ({ onAddBet, selectedBets, selectedLeague }: BettingOddsProps) => {
  const [activeFilter, setActiveFilter] = useState<"all" | "live" | "upcoming" | "popular">("popular");
  const [activeDay, setActiveDay] = useState<string>("all"); // "all" or YYYY-MM-DD
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch site settings for disabled bet categories
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 60000,
  });

  const disabledBetIds = useMemo(() => {
    const disabled = new Set<number>();
    if (!siteSettings) return disabled;
    Object.entries(BET_CATEGORIES).forEach(([key, cat]) => {
      if (siteSettings[`bet_category_${key}`] === "false") {
        cat.betIds.forEach((id) => disabled.add(id));
      }
    });
    return disabled;
  }, [siteSettings]);

  // Fetch odds overrides from Supabase
  const { data: oddsOverrides = [] } = useQuery({
    queryKey: ["odds-overrides-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("odds_overrides")
        .select("*")
        .eq("is_active", true);
      return data || [];
    },
    staleTime: 30000,
  });

  // Use React Query for match data with proper cache invalidation
  const { data: allMatches = [], isLoading: loading, error: queryError, refetch: loadData } = useQuery({
    queryKey: ["betting-matches", oddsOverrides],
    queryFn: async () => {
      const [fixtures, oddsArr] = await Promise.all([
        fetchTodaysFixtures(),
        fetchOddsByDate().catch(() => [] as ApiOddsResponse[]),
      ]);
      const oddsMap = new Map<number, ApiOddsResponse>();
      oddsArr.forEach((o) => oddsMap.set(o.fixture.id, o));
      return buildMatches(fixtures, oddsMap, oddsOverrides);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  const error = queryError ? (queryError as Error).message : null;

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Get unique days for day filter tabs
  const availableDays = useMemo(() => {
    const dayMap = new Map<string, string>();
    allMatches.forEach((m) => {
      if (!dayMap.has(m.dateStr)) dayMap.set(m.dateStr, m.dateLabel);
    });
    return Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allMatches]);

  const filteredMatches = useMemo(() => {
    let filtered = allMatches;

    // Apply league filter from sidebar
    if (selectedLeague && selectedLeague !== "all" && selectedLeague !== "popular") {
      if (selectedLeague === "turkish_teams") {
        // Show any match involving a Turkish team (domestic + international)
        filtered = filtered.filter((m) =>
          m.leagueCountry === "Turkey" || TURKISH_TEAMS.some((t) =>
            m.homeTeam.toLowerCase().includes(t) || m.awayTeam.toLowerCase().includes(t)
          )
        );
      } else if (selectedLeague.startsWith("country:")) {
        const country = selectedLeague.replace("country:", "");
        filtered = filtered.filter((m) => m.leagueCountry === country);
      } else if (selectedLeague.startsWith("league:")) {
        const leagueId = parseInt(selectedLeague.replace("league:", ""), 10);
        filtered = filtered.filter((m) => m.leagueId === leagueId);
      }
    }

    // Apply day filter
    if (activeDay !== "all") {
      filtered = filtered.filter((m) => m.dateStr === activeDay);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.league.toLowerCase().includes(q)
      );
    } else {
      // Apply category filter only when not searching and no specific sidebar filter active
      const hasSpecificFilter = selectedLeague && selectedLeague !== "all" && selectedLeague !== "popular";
      if (!hasSpecificFilter) {
        if (activeFilter === "live") filtered = filtered.filter((m) => m.isLive);
        else if (activeFilter === "upcoming") filtered = filtered.filter((m) => !m.isLive);
        else if (activeFilter === "popular") {
          filtered = filtered.filter((m) => m.allBets.length > 0);
          filtered.sort((a, b) => b.allBets.length - a.allBets.length);
        }
        else if (activeFilter === "all") { /* show all */ }
      }
    }

    // Sort: live first, then matches with odds first, then by date+time
    filtered = [...filtered].sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      const aHasOdds = a.allBets.length > 0 ? 1 : 0;
      const bHasOdds = b.allBets.length > 0 ? 1 : 0;
      if (aHasOdds !== bHasOdds) return bHasOdds - aHasOdds;
      if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
      return a.time.localeCompare(b.time);
    });

    return filtered.slice(0, 60);
  }, [allMatches, activeFilter, activeDay, searchQuery, selectedLeague]);

  const matchesWithOdds = allMatches.filter((m) => m.allBets.length > 0).length;
  const liveCount = allMatches.filter((m) => m.isLive).length;

  if (loading) {
    return (
      <section id="odds" className="py-4 sm:py-8">
        <div className="container mx-auto px-2 sm:px-4 flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Maçlar ve oranlar yükleniyor...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="odds" className="py-4 sm:py-8">
        <div className="container mx-auto px-2 sm:px-4 flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive text-sm text-center">{error}</p>
          <button onClick={() => loadData()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
            <RefreshCw className="h-4 w-4" /> Tekrar Dene
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="odds" className="py-4 sm:py-8">
      <div className="container mx-auto px-2 sm:px-4">
        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Maçını bul... (takım veya lig adı)"
              className="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
              "{searchQuery}" için {filteredMatches.length} sonuç bulundu
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title flex items-center gap-2">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Bahis Oranları
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {allMatches.length} maç • {matchesWithOdds} oranlı • {liveCount} canlı
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            {[
              { key: "popular" as const, label: "Popüler", icon: Star },
              { key: "live" as const, label: `Canlı (${liveCount})`, icon: Zap },
              { key: "upcoming" as const, label: "Yaklaşan", icon: Clock },
              { key: "all" as const, label: "Tümü", icon: Trophy },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveFilter(key); setSearchQuery(""); }}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                  activeFilter === key && !searchQuery
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {label}
              </button>
            ))}
            <button onClick={() => loadData()} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Yenile">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Day filter tabs */}
        {availableDays.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveDay("all")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap ${
                activeDay === "all"
                  ? "bg-accent text-accent-foreground shadow"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="h-3 w-3" />
              Tümü
            </button>
            {availableDays.map(([dateStr, label]) => (
              <button
                key={dateStr}
                onClick={() => setActiveDay(dateStr)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap ${
                  activeDay === dateStr
                    ? "bg-accent text-accent-foreground shadow"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery.trim()
                ? `"${searchQuery}" ile eşleşen maç bulunamadı.`
                : "Bu kategoride maç bulunamadı."}
            </p>
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Aramayı temizle
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                selectedBets={selectedBets}
                onAddBet={onAddBet}
                disabledBetIds={disabledBetIds}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BettingOdds;
