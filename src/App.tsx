import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import MyBets from "./pages/MyBets";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Rules from "./pages/Rules";
import Privacy from "./pages/Privacy";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Bets from "./pages/admin/Bets";
import OddsControl from "./pages/admin/OddsControl";
import Payments from "./pages/admin/Payments";
import Settings from "./pages/admin/Settings";
import Analytics from "./pages/admin/Analytics";
import DataManagement from "./pages/admin/DataManagement";
import TransactionHistory from "./pages/admin/TransactionHistory";
import BetHistory from "./pages/admin/BetHistory";
import BetTypeSettings from "./pages/admin/BetTypeSettings";
import Support from "./pages/admin/Support";
import LiveSupportChat from "./components/LiveSupportChat";
import ScrollToTop from "./components/ScrollToTop";
import Blackjack from "./pages/Blackjack";
const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const hideSupport = location.pathname === "/blackjack";
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/bahislerim" element={<MyBets />} />
        <Route path="/sss" element={<FAQ />} />
        <Route path="/iletisim" element={<Contact />} />
        <Route path="/kurallar" element={<Rules />} />
        <Route path="/gizlilik" element={<Privacy />} />
        <Route path="/blackjack" element={<Blackjack />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="kullanicilar" element={<Users />} />
          <Route path="bahisler" element={<Bets />} />
          <Route path="oranlar" element={<OddsControl />} />
          <Route path="odemeler" element={<Payments />} />
          <Route path="ayarlar" element={<Settings />} />
          <Route path="analiz" element={<Analytics />} />
          <Route path="veri-yonetimi" element={<DataManagement />} />
          <Route path="islem-gecmisi" element={<TransactionHistory />} />
          <Route path="bahis-gecmisi" element={<BetHistory />} />
          <Route path="bahis-turleri" element={<BetTypeSettings />} />
          <Route path="destek" element={<Support />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideSupport && <LiveSupportChat />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
