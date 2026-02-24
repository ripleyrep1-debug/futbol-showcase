import { useEffect, useRef } from "react";

const Widget = ({ attrs, className }: { attrs: Record<string, string>; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = "";
      const el = document.createElement("api-sports-widget");
      Object.entries(attrs).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
      ref.current.appendChild(el);
    }
  }, []);

  return <div ref={ref} className={className} />;
};

const FootballWidgets = () => {
  return (
    <div className="space-y-10 py-8">

      {/* Live Games */}
      <section id="live" className="container mx-auto px-4">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <span className="inline-block w-1 h-7 rounded-full bg-primary" />
          Canlı Maçlar
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <Widget attrs={{
            "data-type": "games",
            "data-show-toolbar": "true",
            "data-tab": "live",
            "data-refresh": "15",
            "data-target-game": "modal",
            "data-target-standings": "modal",
            "data-games-style": "1",
          }} />
        </div>
      </section>

      {/* Today's Games */}
      <section className="container mx-auto px-4">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <span className="inline-block w-1 h-7 rounded-full bg-accent" />
          Bugünün Maçları
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <Widget attrs={{
            "data-type": "games",
            "data-show-toolbar": "true",
            "data-tab": "all",
            "data-refresh": "30",
            "data-target-game": "modal",
            "data-games-style": "1",
          }} />
        </div>
      </section>

      {/* Süper Lig */}
      <section id="leagues" className="container mx-auto px-4">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <span className="inline-block w-1 h-7 rounded-full bg-primary" />
          🇹🇷 Süper Lig
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <Widget attrs={{
            "data-type": "league",
            "data-league": "203",
            "data-standings": "true",
            "data-target-game": "modal",
            "data-refresh": "30",
          }} />
        </div>
      </section>

      {/* Standings */}
      <section id="standings" className="container mx-auto px-4">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <span className="inline-block w-1 h-7 rounded-full bg-accent" />
          Premier Lig Puan Durumu
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <Widget attrs={{
            "data-type": "standings",
            "data-league": "39",
            "data-season": "2025",
            "data-target-team": "modal",
          }} />
        </div>
      </section>

      {/* La Liga */}
      <section className="container mx-auto px-4">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <span className="inline-block w-1 h-7 rounded-full bg-primary" />
          🇪🇸 La Liga Puan Durumu
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <Widget attrs={{
            "data-type": "standings",
            "data-league": "140",
            "data-season": "2025",
            "data-target-team": "modal",
          }} />
        </div>
      </section>

      {/* All Leagues */}
      <section className="container mx-auto px-4">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <span className="inline-block w-1 h-7 rounded-full bg-accent" />
          Tüm Ligler
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <Widget attrs={{
            "data-type": "leagues",
            "data-target-league": "modal",
          }} />
        </div>
      </section>

      {/* H2H */}
      <section id="stats" className="container mx-auto px-4">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <span className="inline-block w-1 h-7 rounded-full bg-primary" />
          🔥 Galatasaray vs Fenerbahçe
        </h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <Widget attrs={{
            "data-type": "h2h",
            "data-h2h": "645-611",
            "data-target-game": "modal",
          }} />
        </div>
      </section>
    </div>
  );
};

export default FootballWidgets;
