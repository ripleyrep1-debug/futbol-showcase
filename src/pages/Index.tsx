import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BettingOdds, { BetSelection } from "@/components/BettingOdds";
import FootballWidgets from "@/components/FootballWidgets";
import BetSlip from "@/components/BetSlip";
import Footer from "@/components/Footer";
import LeagueSidebar from "@/components/LeagueSidebar";
import BottomNav from "@/components/BottomNav";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import DepositModal from "@/components/DepositModal";
import AuthModal from "@/components/AuthModal";

const Index = () => {
  const [bets, setBets] = useState<BetSelection[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [depositOpen, setDepositOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

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

  const maintenanceMode = siteSettings?.maintenance_mode === "true";
  const announcement = siteSettings?.announcement || "";

  const handleAddBet = (bet: BetSelection) => {
    if (maintenanceMode) return;
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

  const handleOpenAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBanner announcement={announcement} maintenanceMode={maintenanceMode} />
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <LeagueSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          selectedLeague={selectedLeague}
          onLeagueSelect={(id) => {
            setSelectedLeague(id);
            setSidebarOpen(false);
          }}
        />

        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <HeroSection />
          <BettingOdds onAddBet={handleAddBet} selectedBets={bets} selectedLeague={selectedLeague} />
          <FootballWidgets />
          <Footer />
        </main>
      </div>

      {!maintenanceMode && (
        <BetSlip bets={bets} onRemoveBet={handleRemoveBet} onClearAll={handleClearAll} />
      )}
      <BottomNav onOpenDeposit={() => setDepositOpen(true)} onOpenAuth={handleOpenAuth} />
      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </div>
  );
};

export default Index;
