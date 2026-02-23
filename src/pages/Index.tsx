import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FootballWidgets from "@/components/FootballWidgets";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FootballWidgets />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
