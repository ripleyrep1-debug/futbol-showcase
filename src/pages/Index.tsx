import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BettingOdds, { BetSelection } from "@/components/BettingOdds";
import FootballWidgets from "@/components/FootballWidgets";
import BetSlip from "@/components/BetSlip";
import Footer from "@/components/Footer";

const Index = () => {
  const [bets, setBets] = useState<BetSelection[]>([]);

  const handleAddBet = (bet: BetSelection) => {
    setBets((prev) => {
      const exists = prev.find((b) => b.id === bet.id);
      if (exists) {
        // Toggle off
        return prev.filter((b) => b.id !== bet.id);
      }
      // Remove any existing bet on same match, then add new
      return [...prev.filter((b) => b.matchId !== bet.matchId || b.selection.split(":")[0] !== bet.selection.split(":")[0]), bet];
    });
  };

  const handleRemoveBet = (id: string) => {
    setBets((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearAll = () => setBets([]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <BettingOdds onAddBet={handleAddBet} selectedBets={bets} />
        <FootballWidgets />
      </main>
      <Footer />
      <BetSlip bets={bets} onRemoveBet={handleRemoveBet} onClearAll={handleClearAll} />
    </div>
  );
};

export default Index;
