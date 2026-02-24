import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BettingOdds, { BetSelection } from "@/components/BettingOdds";
import FootballWidgets from "@/components/FootballWidgets";
import BetSlip from "@/components/BetSlip";
import Footer from "@/components/Footer";
import LeagueSidebar from "@/components/LeagueSidebar";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  const [bets, setBets] = useState<BetSelection[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string>("all");

  const handleAddBet = (bet: BetSelection) => {
    setBets((prev) => {
      const exists = prev.find((b) => b.id === bet.id);
      if (exists) {
        return prev.filter((b) => b.id !== bet.id);
      }
      return [...prev.filter((b) => b.matchId !== bet.matchId || b.selection.split(":")[0] !== bet.selection.split(":")[0]), bet];
    });
  };

  const handleRemoveBet = (id: string) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearAll = () => setBets([]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        {/* League Sidebar */}
        <LeagueSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedLeague={selectedLeague}
          onLeagueSelect={(id) => {
            setSelectedLeague(id);
            setSidebarOpen(false);
          }}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          <HeroSection />
          <BettingOdds onAddBet={handleAddBet} selectedBets={bets} />
          <FootballWidgets />
          <Footer />
        </main>
      </div>

      <BetSlip bets={bets} onRemoveBet={handleRemoveBet} onClearAll={handleClearAll} />
      <BottomNav />
    </div>
  );
};

export default Index;
