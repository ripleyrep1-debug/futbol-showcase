import { useState } from "react";
import { Star, Search, ChevronRight, Trophy, Zap } from "lucide-react";

interface LeagueSidebarProps {
  onLeagueSelect?: (leagueId: string) => void;
  selectedLeague?: string;
  isOpen: boolean;
  onClose: () => void;
}

const leagues = [
  { id: "popular", name: "Popüler Maçlar", icon: "🔥", isHeader: true },
  { id: "super-lig", name: "Türkiye Süper Lig", icon: "🇹🇷" },
  { id: "premier-league", name: "İngiltere Premier Ligi", icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "la-liga", name: "İspanya LaLiga", icon: "🇪🇸" },
  { id: "serie-a", name: "İtalya Serie A", icon: "🇮🇹" },
  { id: "bundesliga", name: "Almanya Bundesliga", icon: "🇩🇪" },
  { id: "ligue-1", name: "Fransa Ligue 1", icon: "🇫🇷" },
  { id: "ucl", name: "UEFA Şampiyonlar Ligi", icon: "⭐" },
  { id: "uel", name: "UEFA Avrupa Ligi", icon: "⭐" },
  { id: "uecl", name: "UEFA Konferans Ligi", icon: "⭐" },
  { id: "world-cup", name: "Dünya Kupası Elemeleri", icon: "🌍" },
  { id: "championship", name: "İngiltere Championship", icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "eredivisie", name: "Hollanda Eredivisie", icon: "🇳🇱" },
  { id: "liga-portugal", name: "Portekiz Liga", icon: "🇵🇹" },
  { id: "super-league-gr", name: "Yunanistan Süper Lig", icon: "🇬🇷" },
  { id: "saudi", name: "Suudi Pro Ligi", icon: "🇸🇦" },
  { id: "mls", name: "MLS", icon: "🇺🇸" },
];

const LeagueSidebar = ({ onLeagueSelect, selectedLeague, isOpen, onClose }: LeagueSidebarProps) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"sports" | "live">("sports");
  const [favorites, setFavorites] = useState<string[]>(["super-lig", "premier-league"]);

  const filtered = leagues.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFav = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[260px] bg-card border-r border-border flex flex-col transition-transform duration-300 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:z-10 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab("sports")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "sports"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Spor Bahisleri
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "live"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Canlı
            <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              LIVE
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="p-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Maçınızı bulun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* League list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-1 py-1">
            {/* All matches toggle */}
            <button
              onClick={() => onLeagueSelect?.("all")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedLeague === "all" || !selectedLeague
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              <span>Tüm Maçlar</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {filtered.map((league) => (
              <button
                key={league.id}
                onClick={() => onLeagueSelect?.(league.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                  selectedLeague === league.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(league.id);
                  }}
                  className="shrink-0"
                >
                  <Star
                    className={`h-3.5 w-3.5 transition-colors ${
                      favorites.includes(league.id)
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground/40 group-hover:text-muted-foreground"
                    }`}
                  />
                </button>
                <span className="text-base shrink-0">{league.icon}</span>
                <span className="truncate text-left">{league.name}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};

export default LeagueSidebar;
