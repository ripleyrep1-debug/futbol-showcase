import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import LiveMatches from "@/components/LiveMatches";
import UpcomingMatches from "@/components/UpcomingMatches";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <LiveMatches />
        <UpcomingMatches />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
