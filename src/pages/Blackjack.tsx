import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Volume2, VolumeX, Info } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Types ───
type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
interface Card { suit: Suit; rank: Rank; }
type GameState = "betting" | "dealing" | "playing" | "dealer-turn" | "finished";

interface HandState {
  cards: Card[];
  bet: number;
  standing: boolean;
  busted: boolean;
  result: string;
  winAmount: number;
}

// ─── Constants ───
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const QUICK_BETS = [100, 250, 500, 1000, 2500, 5000];

// ─── Sound Engine ───
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private getCtx() { if (!this.ctx) this.ctx = new AudioContext(); return this.ctx; }
  play(type: "deal" | "hit" | "win" | "lose" | "chip" | "flip" | "bust" | "split") {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      switch (type) {
        case "deal": case "hit":
          osc.type = "sine"; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
          gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now); osc.stop(now + 0.1); break;
        case "flip":
          osc.type = "sine"; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
          gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now); osc.stop(now + 0.08); break;
        case "chip":
          osc.type = "triangle"; osc.frequency.setValueAtTime(2000, now); osc.frequency.exponentialRampToValueAtTime(3000, now + 0.05);
          gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.start(now); osc.stop(now + 0.06); break;
        case "split":
          osc.type = "sine"; osc.frequency.setValueAtTime(500, now); osc.frequency.linearRampToValueAtTime(900, now + 0.1);
          gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now); osc.stop(now + 0.15); break;
        case "win": {
          [523, 659, 784, 1047].forEach((freq, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination); o.type = "sine";
            o.frequency.setValueAtTime(freq, now + i * 0.12);
            g.gain.setValueAtTime(0.12, now + i * 0.12); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
            o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.2);
          }); return; }
        case "lose": case "bust":
          osc.type = "sawtooth"; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
          gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now); osc.stop(now + 0.35); break;
      }
    } catch { /* silent */ }
  }
}
const sfx = new SoundEngine();

// ─── Deck Logic ───
function createDeck(): Card[] { const d: Card[] = []; for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r }); return d; }
function shuffleDeck(deck: Card[]): Card[] { const d = [...deck]; for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function cardValue(c: Card): number { if (["J","Q","K"].includes(c.rank)) return 10; if (c.rank === "A") return 11; return parseInt(c.rank); }
function handValue(hand: Card[]): number { let t = hand.reduce((s, c) => s + cardValue(c), 0); let a = hand.filter(c => c.rank === "A").length; while (t > 21 && a > 0) { t -= 10; a--; } return t; }
function isBlackjack(hand: Card[]): boolean { return hand.length === 2 && handValue(hand) === 21; }
function canSplit(hand: Card[]): boolean { return hand.length === 2 && cardValue(hand[0]) === cardValue(hand[1]); }

function riggedDeal(deck: Card[], houseEdge: number): { playerHand: Card[]; dealerHand: Card[]; remainingDeck: Card[] } {
  const d = [...deck];
  const houseWins = Math.random() * 100 < houseEdge;
  if (houseWins) {
    const dc1 = d.find(c => ["10","J","Q","K"].includes(c.rank))!; d.splice(d.indexOf(dc1), 1);
    const dc2 = d.find(c => ["7","8","9","10","J","Q","K","A"].includes(c.rank))!; d.splice(d.indexOf(dc2), 1);
    const pc1 = d.find(c => ["4","5","6","7","8"].includes(c.rank))!; d.splice(d.indexOf(pc1), 1);
    const pc2 = d.find(c => ["2","3","4","5","6","7"].includes(c.rank))!; d.splice(d.indexOf(pc2), 1);
    return { playerHand: [pc1, pc2], dealerHand: [dc1, dc2], remainingDeck: d };
  } else {
    const pc1 = d.find(c => ["10","J","Q","K"].includes(c.rank))!; d.splice(d.indexOf(pc1), 1);
    const pc2 = d.find(c => ["9","10","J","Q","K","A"].includes(c.rank))!; d.splice(d.indexOf(pc2), 1);
    const dc1 = d.find(c => ["3","4","5","6"].includes(c.rank))!; d.splice(d.indexOf(dc1), 1);
    const dc2 = d.find(c => ["2","3","4","5","6"].includes(c.rank))!; d.splice(d.indexOf(dc2), 1);
    return { playerHand: [pc1, pc2], dealerHand: [dc1, dc2], remainingDeck: d };
  }
}

// ─── Card Component ───
const CardDisplay = ({ card, hidden = false, index = 0, animate = false }: { card: Card; hidden?: boolean; index?: number; animate?: boolean }) => {
  const isRed = card.suit === "♥" || card.suit === "♦";
  const [flipped, setFlipped] = useState(hidden);
  const [entered, setEntered] = useState(!animate);

  useEffect(() => { if (animate) { const t = setTimeout(() => setEntered(true), index * 150); return () => clearTimeout(t); } }, [animate, index]);
  useEffect(() => {
    if (!hidden && flipped) { sfx.play("flip"); const t = setTimeout(() => setFlipped(false), 300); return () => clearTimeout(t); }
    setFlipped(hidden);
  }, [hidden]);

  return (
    <div className={`transition-all duration-500 ${entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-75"}`}
      style={{ transitionDelay: `${index * 100}ms`, perspective: "600px" }}>
      <div className={`relative w-[52px] h-[76px] sm:w-[68px] sm:h-[100px] transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
        style={{ transformStyle: "preserve-3d" }}>
        <div className="absolute inset-0 rounded-xl bg-[hsl(var(--foreground))] border border-border/50 flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)] [backface-visibility:hidden]">
          <span className={`text-sm sm:text-lg font-black leading-none ${isRed ? "text-destructive" : "text-background"}`}>{card.rank}</span>
          <span className={`text-lg sm:text-2xl leading-none mt-0.5 ${isRed ? "text-destructive" : "text-background"}`}>{card.suit}</span>
          <span className={`absolute top-1 left-1.5 text-[8px] sm:text-[10px] font-bold ${isRed ? "text-destructive" : "text-background"}`}>{card.rank}</span>
        </div>
        <div className="absolute inset-0 rounded-xl border border-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.4)] [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
          <div className="absolute inset-1 rounded-lg border border-primary-foreground/20 flex items-center justify-center">
            <span className="text-primary-foreground/60 text-xs font-bold">B</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Hand Value Badge ───
const HandBadge = ({ value, bust, bj }: { value: number; bust?: boolean; bj?: boolean }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${bj ? "bg-accent/20 text-accent animate-pulse" : bust ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"}`}>
    {bj ? "BJ!" : value}
  </span>
);

// ─── Main ───
const Blackjack = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>("betting");
  const [deck, setDeck] = useState<Card[]>([]);
  const [hands, setHands] = useState<HandState[]>([]);
  const [activeHandIdx, setActiveHandIdx] = useState(0);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [customBet, setCustomBet] = useState("");
  const [result, setResult] = useState("");
  const [totalWin, setTotalWin] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["user-profile-bj", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance, display_name").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user, refetchInterval: 5000,
  });

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
    staleTime: 30000,
  });

  const balance = profile?.balance ?? 0;
  const minBet = Number(settings?.blackjack_min_bet) || 100;
  const maxBet = Number(settings?.blackjack_max_bet) || 10000;
  const bjPayout = Number(settings?.blackjack_payout) || 2.5;
  const houseEdge = Number(settings?.blackjack_house_edge) || 67;
  const allowSplit = settings?.blackjack_allow_split !== "false";
  const allowDouble = settings?.blackjack_allow_double !== "false";
  const bjEnabled = settings?.blackjack_enabled !== "false";

  const toggleMute = () => { sfx.muted = !muted; setMuted(!muted); };
  const invalidateProfiles = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profile-bj"] });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  };

  const startGame = useCallback(async (betAmount: number) => {
    // Enforce limits strictly
    if (betAmount < minBet) { toast({ title: `Minimum bahis ₺${minBet}`, variant: "destructive" }); return; }
    if (betAmount > maxBet) { toast({ title: `Maksimum bahis ₺${maxBet}`, variant: "destructive" }); return; }
    if (!user || betAmount > balance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }

    setProcessing(true);
    sfx.play("chip");

    // Re-fetch balance to prevent race conditions
    const { data: freshProfile } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
    const freshBalance = freshProfile?.balance ?? 0;
    if (betAmount > freshBalance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); setProcessing(false); return; }

    const { error } = await supabase.from("profiles").update({ balance: freshBalance - betAmount }).eq("id", user.id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); setProcessing(false); return; }
    await supabase.from("transactions").insert({ user_id: user.id, amount: -betAmount, type: "blackjack", description: "Blackjack bahis" });
    invalidateProfiles();

    const newDeck = shuffleDeck(createDeck());
    const { playerHand: ph, dealerHand: dh, remainingDeck } = riggedDeal(newDeck, houseEdge);

    setDeck(remainingDeck);
    setDealerHand([]);
    setHands([]);
    setResult("");
    setTotalWin(0);
    setActiveHandIdx(0);
    setGameState("dealing");
    setAnimateCards(true);

    // Animated dealing
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    await delay(200);
    sfx.play("deal"); setHands([{ cards: [ph[0]], bet: betAmount, standing: false, busted: false, result: "", winAmount: 0 }]);
    await delay(300);
    sfx.play("deal"); setDealerHand([dh[0]]);
    await delay(300);
    sfx.play("deal"); setHands([{ cards: ph, bet: betAmount, standing: false, busted: false, result: "", winAmount: 0 }]);
    await delay(300);
    sfx.play("deal"); setDealerHand(dh);
    await delay(250);

    setProcessing(false);

    if (isBlackjack(ph)) {
      const win = Math.floor(betAmount * bjPayout);
      setHands([{ cards: ph, bet: betAmount, standing: true, busted: false, result: "BLACKJACK! 🎉", winAmount: win }]);
      setTotalWin(win);
      setResult("BLACKJACK! 🎉");
      sfx.play("win");
      await supabase.from("profiles").update({ balance: freshBalance - betAmount + win }).eq("id", user.id);
      await supabase.from("transactions").insert({ user_id: user.id, amount: win, type: "blackjack_win", description: "Blackjack kazanç" });
      invalidateProfiles();
      setGameState("finished");
    } else {
      setGameState("playing");
    }
  }, [user, balance, minBet, maxBet, bjPayout, houseEdge]);

  const activeHand = hands[activeHandIdx];

  const hit = () => {
    if (!activeHand || activeHand.standing || activeHand.busted) return;
    sfx.play("hit");
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newCards = [...activeHand.cards, card];
    const newHands = [...hands];
    newHands[activeHandIdx] = { ...activeHand, cards: newCards };

    if (handValue(newCards) > 21) {
      newHands[activeHandIdx].busted = true;
      newHands[activeHandIdx].result = "BUST! 💥";
      sfx.play("bust");
    }

    setHands(newHands);
    setDeck(newDeck);

    // If busted or only hand, advance
    if (newHands[activeHandIdx].busted) advanceHand(newHands, activeHandIdx);
  };

  const stand = () => {
    if (!activeHand) return;
    sfx.play("chip");
    const newHands = [...hands];
    newHands[activeHandIdx] = { ...activeHand, standing: true };
    setHands(newHands);
    advanceHand(newHands, activeHandIdx);
  };

  const doubleDown = async () => {
    if (!user || !activeHand || !allowDouble) return;
    const extraBet = activeHand.bet;
    if (extraBet > balance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }
    if (activeHand.bet + extraBet > maxBet) { toast({ title: `Maksimum bahis ₺${maxBet}`, variant: "destructive" }); return; }

    sfx.play("chip");
    // Re-fetch balance
    const { data: fp } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
    const fb = fp?.balance ?? 0;
    if (extraBet > fb) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }

    await supabase.from("profiles").update({ balance: fb - extraBet }).eq("id", user.id);
    await supabase.from("transactions").insert({ user_id: user.id, amount: -extraBet, type: "blackjack", description: "Blackjack double down" });
    invalidateProfiles();

    const newDeck = [...deck];
    const card = newDeck.pop()!;
    sfx.play("deal");
    const newCards = [...activeHand.cards, card];
    const newHands = [...hands];
    newHands[activeHandIdx] = { ...activeHand, cards: newCards, bet: activeHand.bet * 2, standing: true };

    if (handValue(newCards) > 21) {
      newHands[activeHandIdx].busted = true;
      newHands[activeHandIdx].result = "BUST! 💥";
      sfx.play("bust");
    }

    setHands(newHands);
    setDeck(newDeck);
    advanceHand(newHands, activeHandIdx);
  };

  const split = async () => {
    if (!user || !activeHand || !allowSplit || !canSplit(activeHand.cards)) return;
    const extraBet = activeHand.bet;
    if (extraBet > balance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }
    if (activeHand.bet > maxBet) { toast({ title: `Maksimum bahis ₺${maxBet}`, variant: "destructive" }); return; }

    sfx.play("split");
    const { data: fp } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
    const fb = fp?.balance ?? 0;
    if (extraBet > fb) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }

    await supabase.from("profiles").update({ balance: fb - extraBet }).eq("id", user.id);
    await supabase.from("transactions").insert({ user_id: user.id, amount: -extraBet, type: "blackjack", description: "Blackjack split" });
    invalidateProfiles();

    const newDeck = [...deck];
    const card1 = newDeck.pop()!;
    const card2 = newDeck.pop()!;
    sfx.play("deal");

    const hand1: HandState = { cards: [activeHand.cards[0], card1], bet: activeHand.bet, standing: false, busted: false, result: "", winAmount: 0 };
    const hand2: HandState = { cards: [activeHand.cards[1], card2], bet: activeHand.bet, standing: false, busted: false, result: "", winAmount: 0 };

    const newHands = [...hands];
    newHands.splice(activeHandIdx, 1, hand1, hand2);
    setHands(newHands);
    setDeck(newDeck);
  };

  const advanceHand = (currentHands: HandState[], currentIdx: number) => {
    // Find next playable hand
    for (let i = currentIdx + 1; i < currentHands.length; i++) {
      if (!currentHands[i].standing && !currentHands[i].busted) {
        setActiveHandIdx(i);
        return;
      }
    }
    // All hands done → dealer turn
    setGameState("dealer-turn");
  };

  // Dealer auto-play
  useEffect(() => {
    if (gameState !== "dealer-turn") return;
    let cancelled = false;
    const playDealer = async () => {
      let currentDeck = [...deck];
      let currentDealerHand = [...dealerHand];
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      // Check if all hands busted
      const allBusted = hands.every(h => h.busted);
      if (!allBusted) {
        while (handValue(currentDealerHand) < 17 && !cancelled) {
          await delay(800);
          sfx.play("deal");
          const card = currentDeck.pop()!;
          currentDealerHand = [...currentDealerHand, card];
          setDealerHand([...currentDealerHand]);
          setDeck([...currentDeck]);
        }
      }

      await delay(500);
      if (cancelled) return;

      const dv = handValue(currentDealerHand);
      let totalWinAmt = 0;
      const finalHands = hands.map(h => {
        if (h.busted) return { ...h, result: "BUST! 💥", winAmount: 0 };
        const pv = handValue(h.cards);
        if (dv > 21) { const w = h.bet * 2; totalWinAmt += w; return { ...h, result: "Kazandınız! 🎉", winAmount: w }; }
        if (dv > pv) { return { ...h, result: "Kaybettiniz 😞", winAmount: 0 }; }
        if (pv > dv) { const w = h.bet * 2; totalWinAmt += w; return { ...h, result: "Kazandınız! 🎉", winAmount: w }; }
        totalWinAmt += h.bet;
        return { ...h, result: "Berabere 🤝", winAmount: h.bet };
      });

      setHands(finalHands);
      setTotalWin(totalWinAmt);

      if (totalWinAmt > 0) {
        sfx.play(totalWinAmt === hands.reduce((s, h) => s + h.bet, 0) ? "chip" : "win");
        const { data: fp } = await supabase.from("profiles").select("balance").eq("id", user!.id).maybeSingle();
        await supabase.from("profiles").update({ balance: (fp?.balance ?? 0) + totalWinAmt }).eq("id", user!.id);
        await supabase.from("transactions").insert({ user_id: user!.id, amount: totalWinAmt, type: "blackjack_win", description: "Blackjack kazanç" });
      } else {
        sfx.play("lose");
      }

      const wins = finalHands.filter(h => h.winAmount > 0 && !h.result.includes("Berabere")).length;
      const losses = finalHands.filter(h => h.winAmount === 0).length;
      const draws = finalHands.filter(h => h.result.includes("Berabere")).length;

      let summaryResult = "";
      if (finalHands.length === 1) {
        summaryResult = finalHands[0].result;
      } else {
        const parts: string[] = [];
        if (wins > 0) parts.push(`${wins} kazanç`);
        if (losses > 0) parts.push(`${losses} kayıp`);
        if (draws > 0) parts.push(`${draws} berabere`);
        summaryResult = parts.join(" • ");
      }

      setResult(summaryResult);
      invalidateProfiles();
      setGameState("finished");
    };
    playDealer();
    return () => { cancelled = true; };
  }, [gameState]);

  const resetGame = () => {
    setGameState("betting"); setHands([]); setDealerHand([]); setResult(""); setTotalWin(0);
    setActiveHandIdx(0); setAnimateCards(false); setCustomBet("");
  };

  const handleCustomBet = () => {
    const amount = Math.floor(Number(customBet));
    if (!amount || amount < minBet || amount > maxBet) {
      toast({ title: `₺${minBet} - ₺${maxBet} arası bir tutar girin`, variant: "destructive" });
      return;
    }
    startGame(amount);
  };

  const showDealerValue = gameState === "dealer-turn" || gameState === "finished";

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-6xl mb-4">🃏</div>
            <h2 className="text-2xl font-bold text-foreground">Blackjack</h2>
            <p className="text-muted-foreground">Oynamak için giriş yapmalısınız.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!bjEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-foreground">Blackjack Kapalı</h2>
            <p className="text-muted-foreground">Bu oyun şu anda aktif değil.</p>
            <Link to="/"><Button variant="outline">Ana Sayfa</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 max-w-lg mx-auto w-full px-3 sm:px-4 pt-4 pb-24 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-2 mb-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-foreground font-rajdhani">♠ Blackjack</h1>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleMute} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="bg-secondary px-3 py-1.5 rounded-xl border border-border">
              <span className="text-xs text-muted-foreground">₺</span>
              <span className="text-sm font-bold text-accent ml-0.5">{balance.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Limits info */}
        {gameState === "betting" && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2 justify-center">
            <Info className="h-3 w-3" />
            <span>Limit: ₺{minBet} - ₺{maxBet}</span>
          </div>
        )}

        {/* Game Table */}
        <div
          className="flex-1 rounded-2xl border border-border overflow-hidden flex flex-col min-h-[380px] sm:min-h-[440px] relative"
          style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(var(--secondary)) 0%, hsl(var(--card)) 70%, hsl(var(--background)) 100%)" }}
        >
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\")" }} />

          {/* Dealer */}
          <div className="px-4 pt-4 pb-2 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">Kasa</span>
              {dealerHand.length > 0 && showDealerValue && <HandBadge value={handValue(dealerHand)} bust={handValue(dealerHand) > 21} bj={isBlackjack(dealerHand)} />}
            </div>
            <div className="flex gap-1.5 min-h-[76px] sm:min-h-[100px] items-end">
              {dealerHand.map((c, i) => <CardDisplay key={`d${i}`} card={c} hidden={i === 1 && gameState === "playing"} index={i} animate={animateCards} />)}
              {dealerHand.length === 0 && <span className="text-muted-foreground/40 text-xs italic h-[76px] flex items-center">Bahis yaparak başlayın</span>}
            </div>
          </div>

          {/* Center */}
          <div className="flex-1 flex items-center justify-center px-4">
            {gameState === "finished" && (
              <div className="text-center animate-scale-in space-y-1">
                <p className={`text-base sm:text-lg font-black ${result.includes("Kazandınız") || result.includes("BLACKJACK") || result.includes("kazanç") ? "text-accent" : result.includes("Berabere") || result.includes("berabere") ? "text-muted-foreground" : "text-destructive"}`}>{result}</p>
                {totalWin > 0 && <p className="text-sm font-bold text-accent animate-pulse">+₺{totalWin.toFixed(0)}</p>}
              </div>
            )}
            {gameState === "dealer-turn" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm text-muted-foreground">Kasa oynuyor...</span>
              </div>
            )}
            {(gameState === "playing" || gameState === "dealing") && hands.length > 0 && (
              <div className="bg-background/30 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30">
                <span className="text-xs text-muted-foreground">Toplam: </span>
                <span className="text-sm font-bold text-foreground">₺{hands.reduce((s, h) => s + h.bet, 0)}</span>
              </div>
            )}
          </div>

          {/* Player Hands */}
          <div className="px-4 pb-4 pt-2 relative z-10 space-y-3">
            {hands.map((hand, hIdx) => (
              <div key={hIdx} className={`${hands.length > 1 ? `p-2 rounded-xl border ${hIdx === activeHandIdx && gameState === "playing" ? "border-accent/50 bg-accent/5" : "border-border/30"}` : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                    {hands.length > 1 ? `El ${hIdx + 1}` : "Siz"}
                  </span>
                  {hand.cards.length > 0 && <HandBadge value={handValue(hand.cards)} bust={hand.busted} bj={isBlackjack(hand.cards)} />}
                  <span className="text-[10px] text-muted-foreground ml-auto">₺{hand.bet}</span>
                  {gameState === "finished" && hand.result && (
                    <span className={`text-[10px] font-bold ${hand.winAmount > 0 ? "text-accent" : "text-destructive"}`}>{hand.result}</span>
                  )}
                </div>
                <div className="flex gap-1.5 min-h-[76px] sm:min-h-[100px] items-end">
                  {hand.cards.map((c, i) => <CardDisplay key={`p${hIdx}-${i}`} card={c} index={i} animate={animateCards} />)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 space-y-3">
          {gameState === "betting" && (
            <div className="animate-fade-in space-y-4">
              {/* Custom bet input */}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`₺${minBet} - ₺${maxBet}`}
                  value={customBet}
                  onChange={(e) => setCustomBet(e.target.value)}
                  className="text-center text-base font-bold"
                  min={minBet}
                  max={maxBet}
                />
                <Button onClick={handleCustomBet} disabled={processing || !customBet} className="px-6 font-bold whitespace-nowrap">
                  Oyna
                </Button>
              </div>

              {/* Quick bet chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_BETS.filter(a => a >= minBet && a <= maxBet).map(amount => (
                  <button
                    key={amount}
                    onClick={() => { sfx.play("chip"); startGame(amount); }}
                    disabled={amount > balance || processing}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] font-bold text-xs sm:text-sm transition-all duration-200 active:scale-90
                      ${amount > balance || processing
                        ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-40"
                        : "border-accent bg-gradient-to-br from-secondary to-card text-foreground hover:scale-110 hover:shadow-[0_0_20px_hsl(var(--accent)/0.4)] cursor-pointer"
                      }`}
                  >
                    <div className="absolute inset-1 rounded-full border border-border/50" />
                    <span className="relative z-10">₺{amount}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState === "playing" && activeHand && !activeHand.standing && !activeHand.busted && (
            <div className="grid grid-cols-2 gap-2 animate-fade-in">
              <Button onClick={hit} className="h-13 text-sm sm:text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all">
                🃏 Kart Çek
              </Button>
              <Button onClick={stand} variant="secondary" className="h-13 text-sm sm:text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all">
                ✋ Dur
              </Button>
              {allowDouble && activeHand.cards.length === 2 && activeHand.bet <= balance && activeHand.bet * 2 <= maxBet && (
                <Button onClick={doubleDown} variant="outline" className="h-13 text-sm sm:text-base font-bold rounded-xl border-accent text-accent hover:bg-accent/10 shadow-lg active:scale-95 transition-all">
                  2× Katla
                </Button>
              )}
              {allowSplit && canSplit(activeHand.cards) && activeHand.bet <= balance && hands.length < 4 && (
                <Button onClick={split} variant="outline" className="h-13 text-sm sm:text-base font-bold rounded-xl border-primary text-primary hover:bg-primary/10 shadow-lg active:scale-95 transition-all">
                  ✂️ Böl
                </Button>
              )}
            </div>
          )}

          {gameState === "dealing" && (
            <div className="h-14 flex items-center justify-center">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
              </div>
            </div>
          )}

          {gameState === "finished" && (
            <Button onClick={resetGame} className="w-full h-14 text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all animate-fade-in">
              Tekrar Oyna
            </Button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Blackjack;
