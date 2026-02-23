import { useEffect, useRef } from "react";

interface WidgetProps {
  attrs: Record<string, string>;
  className?: string;
}

const Widget = ({ attrs, className }: WidgetProps) => {
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
    <div className="space-y-12 py-8">

      {/* Live Games */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-display tracking-wider text-accent mb-6">
          ⚽ CANLI MAÇLAR
        </h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--gradient-card)" }}>
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
        <h2 className="text-3xl font-display tracking-wider text-accent mb-6">
          📅 BUGÜNÜN MAÇLARI
        </h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--gradient-card)" }}>
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
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-display tracking-wider text-accent mb-6">
          🇹🇷 SÜPER LİG
        </h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--gradient-card)" }}>
          <Widget attrs={{
            "data-type": "league",
            "data-league": "203",
            "data-standings": "true",
            "data-target-game": "modal",
            "data-refresh": "30",
          }} />
        </div>
      </section>

      {/* Premier League Standings */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-display tracking-wider text-accent mb-6">
          🏴󠁧󠁢󠁥󠁮󠁧󠁿 PREMİER LİG PUAN DURUMU
        </h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--gradient-card)" }}>
          <Widget attrs={{
            "data-type": "standings",
            "data-league": "39",
            "data-season": "2025",
            "data-target-team": "modal",
          }} />
        </div>
      </section>

      {/* La Liga Standings */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-display tracking-wider text-accent mb-6">
          🇪🇸 LA LIGA PUAN DURUMU
        </h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--gradient-card)" }}>
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
        <h2 className="text-3xl font-display tracking-wider text-accent mb-6">
          🌍 TÜM LİGLER
        </h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--gradient-card)" }}>
          <Widget attrs={{
            "data-type": "leagues",
            "data-target-league": "modal",
          }} />
        </div>
      </section>

      {/* H2H: Galatasaray vs Fenerbahçe */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-display tracking-wider text-accent mb-6">
          🔥 GALATASARAY vs FENERBAHÇE
        </h2>
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--gradient-card)" }}>
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
