import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Volume2, VolumeX, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Types ───
type BetType =
  | { kind: "straight"; number: number }
  | { kind: "red" }
  | { kind: "black" }
  | { kind: "even" }
  | { kind: "odd" }
  | { kind: "low" }   // 1-18
  | { kind: "high" }  // 19-36
  | { kind: "dozen"; dozen: 1 | 2 | 3 }
  | { kind: "column"; column: 1 | 2 | 3 };

interface PlacedBet {
  type: BetType;
  amount: number;
  label: string;
}

// ─── Roulette Data ───
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMBERS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

// European wheel order
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

function getColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.includes(n) ? "red" : "black";
}

function getPayout(bet: BetType): number {
  switch (bet.kind) {
    case "straight": return 35;
    case "red": case "black": case "even": case "odd": case "low": case "high": return 1;
    case "dozen": case "column": return 2;
  }
}

function isWin(bet: BetType, result: number): boolean {
  switch (bet.kind) {
    case "straight": return bet.number === result;
    case "red": return RED_NUMBERS.includes(result);
    case "black": return BLACK_NUMBERS.includes(result);
    case "even": return result > 0 && result % 2 === 0;
    case "odd": return result > 0 && result % 2 === 1;
    case "low": return result >= 1 && result <= 18;
    case "high": return result >= 19 && result <= 36;
    case "dozen":
      if (bet.dozen === 1) return result >= 1 && result <= 12;
      if (bet.dozen === 2) return result >= 13 && result <= 24;
      return result >= 25 && result <= 36;
    case "column":
      return result > 0 && result % 3 === (bet.column === 3 ? 0 : bet.column);
  }
}

// ─── Sound Engine ───
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private getCtx() { if (!this.ctx) this.ctx = new AudioContext(); return this.ctx; }
  play(type: "chip" | "spin" | "win" | "lose" | "ball") {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      switch (type) {
        case "chip":
          osc.type = "triangle"; osc.frequency.setValueAtTime(2000, now); osc.frequency.exponentialRampToValueAtTime(3000, now + 0.05);
          gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.start(now); osc.stop(now + 0.06); break;
        case "spin":
          osc.type = "sine"; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
          gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.start(now); osc.stop(now + 0.6); break;
        case "ball":
          osc.type = "sine"; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
          gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now); osc.stop(now + 0.2); break;
        case "win":
          [523, 659, 784, 1047].forEach((freq, i) => {
            const o = ctx.createOscillator(); const g = ctx.createGain();
            o.connect(g); g.connect(ctx.destination); o.type = "sine";
            o.frequency.setValueAtTime(freq, now + i * 0.12);
            g.gain.setValueAtTime(0.12, now + i * 0.12); g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
            o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.2);
          }); return;
        case "lose":
          osc.type = "sawtooth"; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
          gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now); osc.stop(now + 0.35); break;
      }
    } catch { /* silent */ }
  }
}
const sfx = new SoundEngine();

// ─── Chip Selector ───
const CHIPS = [10, 25, 50, 100, 250, 500, 1000];

// ─── Main Component ───
const Roulette = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [muted, setMuted] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const { data: profile } = useQuery({
    queryKey: ["user-profile-roulette", user?.id],
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
  const minBet = Number(settings?.roulette_min_bet) || 10;
  const maxBet = Number(settings?.roulette_max_bet) || 10000;
  const houseEdge = Number(settings?.roulette_house_edge) || 65;
  const rouletteEnabled = settings?.roulette_enabled !== "false";

  const toggleMute = () => { sfx.muted = !muted; setMuted(!muted); };

  const invalidateProfiles = () => {
    queryClient.invalidateQueries({ queryKey: ["user-profile-roulette"] });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  };

  const totalBetAmount = bets.reduce((s, b) => s + b.amount, 0);

  const placeBet = (type: BetType, label: string) => {
    if (spinning) return;
    const newTotal = totalBetAmount + selectedChip;
    if (newTotal > balance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }
    if (newTotal > maxBet) { toast({ title: `Maksimum bahis ₺${maxBet}`, variant: "destructive" }); return; }
    sfx.play("chip");
    // Merge with existing bet of same type
    const existing = bets.findIndex(b => JSON.stringify(b.type) === JSON.stringify(type));
    if (existing >= 0) {
      const updated = [...bets];
      updated[existing] = { ...updated[existing], amount: updated[existing].amount + selectedChip };
      setBets(updated);
    } else {
      setBets([...bets, { type, amount: selectedChip, label }]);
    }
  };

  const clearBets = () => { if (!spinning) { setBets([]); setShowResult(false); setResult(null); } };

  // Biased result selection — house edge
  const pickResult = useCallback((): number => {
    const houseWins = Math.random() * 100 < houseEdge;

    if (houseWins && bets.length > 0) {
      // Find numbers that lose ALL bets
      const losingNumbers: number[] = [];
      for (let n = 0; n <= 36; n++) {
        const allLose = bets.every(b => !isWin(b.type, n));
        if (allLose) losingNumbers.push(n);
      }
      if (losingNumbers.length > 0) {
        return losingNumbers[Math.floor(Math.random() * losingNumbers.length)];
      }
      // If no number loses all bets, pick the one with minimal payout
      let minPay = Infinity;
      let minN = 0;
      for (let n = 0; n <= 36; n++) {
        const pay = bets.reduce((s, b) => s + (isWin(b.type, n) ? b.amount * getPayout(b.type) : -b.amount), 0);
        if (pay < minPay) { minPay = pay; minN = n; }
      }
      return minN;
    }

    // Let player win — pick a number that wins at least one bet
    if (bets.length > 0) {
      const winningNumbers: number[] = [];
      for (let n = 0; n <= 36; n++) {
        if (bets.some(b => isWin(b.type, n))) winningNumbers.push(n);
      }
      if (winningNumbers.length > 0) {
        return winningNumbers[Math.floor(Math.random() * winningNumbers.length)];
      }
    }

    return Math.floor(Math.random() * 37);
  }, [bets, houseEdge]);

  const spin = async () => {
    if (!user || bets.length === 0 || spinning) return;
    if (totalBetAmount < minBet) { toast({ title: `Minimum bahis ₺${minBet}`, variant: "destructive" }); return; }

    setSpinning(true);
    setShowResult(false);
    setResult(null);
    setWinAmount(0);

    // Deduct balance
    const { data: fp } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
    const freshBalance = fp?.balance ?? 0;
    if (totalBetAmount > freshBalance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); setSpinning(false); return; }

    await supabase.from("profiles").update({ balance: freshBalance - totalBetAmount }).eq("id", user.id);
    await supabase.from("transactions").insert({ user_id: user.id, amount: -totalBetAmount, type: "roulette", description: "Rulet bahis" });
    invalidateProfiles();

    sfx.play("spin");

    const winningNumber = pickResult();
    const slotIdx = WHEEL_ORDER.indexOf(winningNumber);
    const degreesPerSlot = 360 / WHEEL_ORDER.length;
    const targetAngle = 360 - (slotIdx * degreesPerSlot) - degreesPerSlot / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = wheelRotation + fullSpins * 360 + targetAngle - (wheelRotation % 360);

    setWheelRotation(finalRotation);

    // Wait for spin animation
    await new Promise(r => setTimeout(r, 4000));
    sfx.play("ball");
    await new Promise(r => setTimeout(r, 500));

    // Calculate winnings
    let totalWin = 0;
    bets.forEach(b => {
      if (isWin(b.type, winningNumber)) {
        totalWin += b.amount + b.amount * getPayout(b.type);
      }
    });

    setResult(winningNumber);
    setWinAmount(totalWin);
    setShowResult(true);
    setHistory(prev => [winningNumber, ...prev.slice(0, 19)]);

    if (totalWin > 0) {
      sfx.play("win");
      const { data: fp2 } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
      await supabase.from("profiles").update({ balance: (fp2?.balance ?? 0) + totalWin }).eq("id", user.id);
      await supabase.from("transactions").insert({ user_id: user.id, amount: totalWin, type: "roulette_win", description: `Rulet kazanç - ${winningNumber}` });
    } else {
      sfx.play("lose");
    }

    invalidateProfiles();
    setSpinning(false);
  };

  const numColor = (n: number) => {
    if (n === 0) return "bg-green-600";
    return RED_NUMBERS.includes(n) ? "bg-red-600" : "bg-gray-900";
  };

  const numTextColor = (n: number) => {
    if (n === 0) return "text-green-400";
    return RED_NUMBERS.includes(n) ? "text-red-400" : "text-gray-400";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-6xl mb-4">🎰</div>
            <h2 className="text-2xl font-bold text-foreground">Rulet</h2>
            <p className="text-muted-foreground">Oynamak için giriş yapmalısınız.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!rouletteEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-foreground">Rulet Kapalı</h2>
            <p className="text-muted-foreground">Bu oyun şu anda aktif değil.</p>
            <Link to="/"><Button variant="outline">Ana Sayfa</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Grid layout: 3 rows x 12 columns for numbers 1-36
  const gridRows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 pt-4 pb-24 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-2 mb-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-foreground font-rajdhani">🎡 Rulet</h1>
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

        {/* Wheel */}
        <div className="flex justify-center mb-4 relative">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[16px] border-t-accent drop-shadow-lg" />
            {/* Wheel */}
            <div
              className="w-full h-full rounded-full border-4 border-accent/30 relative overflow-hidden shadow-[0_0_40px_hsl(var(--accent)/0.2)]"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
              }}
            >
              {WHEEL_ORDER.map((num, i) => {
                const angle = (i * 360) / WHEEL_ORDER.length;
                const color = getColor(num);
                const bgColor = color === "green" ? "#16a34a" : color === "red" ? "#dc2626" : "#1a1a2e";
                return (
                  <div
                    key={num}
                    className="absolute w-full h-full flex items-start justify-center"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <div
                      className="w-5 h-[48%] flex items-start justify-center pt-1 text-[7px] sm:text-[8px] font-bold text-white"
                      style={{
                        background: bgColor,
                        clipPath: "polygon(35% 0%, 65% 0%, 55% 100%, 45% 100%)",
                      }}
                    >
                      {num}
                    </div>
                  </div>
                );
              })}
              <div className="absolute inset-[30%] rounded-full bg-background border-2 border-border flex items-center justify-center">
                {showResult && result !== null ? (
                  <span className={`text-lg sm:text-xl font-black ${result === 0 ? "text-green-400" : RED_NUMBERS.includes(result) ? "text-red-400" : "text-foreground"}`}>
                    {result}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">RULET</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Result Display */}
        {showResult && result !== null && (
          <div className="text-center mb-3 animate-scale-in">
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
              <div className={`w-8 h-8 rounded-full ${numColor(result)} flex items-center justify-center text-white font-bold text-sm`}>
                {result}
              </div>
              {winAmount > 0 ? (
                <span className="text-accent font-bold animate-pulse">+₺{winAmount.toFixed(0)} Kazandınız! 🎉</span>
              ) : (
                <span className="text-destructive font-bold">Kaybettiniz 😞</span>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex gap-1 justify-center mb-3 flex-wrap">
            {history.slice(0, 10).map((n, i) => (
              <div key={i} className={`w-6 h-6 rounded-full ${numColor(n)} flex items-center justify-center text-white text-[9px] font-bold ${i === 0 ? "ring-2 ring-accent" : "opacity-60"}`}>
                {n}
              </div>
            ))}
          </div>
        )}

        {/* Betting Grid */}
        <div className="bg-card border border-border rounded-xl p-2 sm:p-3 mb-3 overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Zero */}
            <div className="flex mb-1">
              <button
                onClick={() => placeBet({ kind: "straight", number: 0 }, "0")}
                disabled={spinning}
                className={`w-12 h-16 rounded-lg bg-green-700 hover:bg-green-600 text-white font-bold text-sm border border-green-500/50 transition-all ${
                  bets.some(b => b.type.kind === "straight" && b.type.number === 0) ? "ring-2 ring-accent" : ""
                } ${spinning ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
              >
                0
              </button>
            </div>

            {/* Number Grid */}
            {gridRows.map((row, rIdx) => (
              <div key={rIdx} className="flex gap-[2px] mb-[2px]">
                {row.map(n => {
                  const hasBet = bets.some(b => b.type.kind === "straight" && b.type.number === n);
                  return (
                    <button
                      key={n}
                      onClick={() => placeBet({ kind: "straight", number: n }, String(n))}
                      disabled={spinning}
                      className={`flex-1 h-10 rounded text-xs font-bold text-white transition-all border
                        ${RED_NUMBERS.includes(n) ? "bg-red-700 hover:bg-red-600 border-red-500/30" : "bg-gray-800 hover:bg-gray-700 border-gray-600/30"}
                        ${hasBet ? "ring-2 ring-accent scale-105" : ""}
                        ${spinning ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                      `}
                    >
                      {n}
                    </button>
                  );
                })}
                {/* Column bet */}
                <button
                  onClick={() => placeBet({ kind: "column", column: (3 - rIdx) as 1 | 2 | 3 }, `Sütun ${3 - rIdx}`)}
                  disabled={spinning}
                  className={`w-10 h-10 rounded text-[9px] font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all
                    ${bets.some(b => b.type.kind === "column" && b.type.column === 3 - rIdx) ? "ring-2 ring-accent" : ""}
                    ${spinning ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                  `}
                >
                  2:1
                </button>
              </div>
            ))}

            {/* Dozens */}
            <div className="flex gap-[2px] mt-1 mb-1">
              {([1, 2, 3] as const).map(d => (
                <button
                  key={d}
                  onClick={() => placeBet({ kind: "dozen", dozen: d }, `${d}. Düzine`)}
                  disabled={spinning}
                  className={`flex-1 h-9 rounded text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all
                    ${bets.some(b => b.type.kind === "dozen" && b.type.dozen === d) ? "ring-2 ring-accent" : ""}
                    ${spinning ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                  `}
                >
                  {d === 1 ? "1-12" : d === 2 ? "13-24" : "25-36"}
                </button>
              ))}
            </div>

            {/* Outside bets */}
            <div className="flex gap-[2px]">
              {[
                { type: { kind: "low" as const }, label: "1-18" },
                { type: { kind: "even" as const }, label: "Çift" },
                { type: { kind: "red" as const }, label: "🔴" },
                { type: { kind: "black" as const }, label: "⚫" },
                { type: { kind: "odd" as const }, label: "Tek" },
                { type: { kind: "high" as const }, label: "19-36" },
              ].map(({ type, label }) => (
                <button
                  key={label}
                  onClick={() => placeBet(type, label)}
                  disabled={spinning}
                  className={`flex-1 h-9 rounded text-xs font-bold transition-all border
                    ${type.kind === "red" ? "bg-red-700 hover:bg-red-600 text-white border-red-500/30" : type.kind === "black" ? "bg-gray-800 hover:bg-gray-700 text-white border-gray-600/30" : "bg-secondary hover:bg-secondary/80 text-foreground border-border"}
                    ${bets.some(b => JSON.stringify(b.type) === JSON.stringify(type)) ? "ring-2 ring-accent" : ""}
                    ${spinning ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chip Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          {CHIPS.filter(c => c <= maxBet).map(chip => (
            <button
              key={chip}
              onClick={() => { setSelectedChip(chip); sfx.play("chip"); }}
              disabled={spinning}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[3px] font-bold text-[10px] sm:text-xs transition-all active:scale-90
                ${selectedChip === chip
                  ? "border-accent bg-accent/20 text-accent scale-110 shadow-[0_0_15px_hsl(var(--accent)/0.4)]"
                  : chip > balance
                    ? "border-border bg-muted text-muted-foreground opacity-40 cursor-not-allowed"
                    : "border-border bg-secondary text-foreground hover:border-accent/50 cursor-pointer hover:scale-105"
                }
              `}
            >
              ₺{chip}
            </button>
          ))}
        </div>

        {/* Active Bets Summary */}
        {bets.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bahisleriniz</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-accent">₺{totalBetAmount}</span>
                <button onClick={clearBets} disabled={spinning} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {bets.map((b, i) => (
                <span key={i} className="text-[10px] bg-secondary px-2 py-1 rounded-md text-foreground">
                  {b.label}: ₺{b.amount}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Spin / Reset buttons */}
        <div className="flex gap-2">
          {!showResult ? (
            <Button
              onClick={spin}
              disabled={spinning || bets.length === 0}
              className="flex-1 h-14 text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all"
            >
              {spinning ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
                  </div>
                  Dönüyor...
                </div>
              ) : (
                "🎡 Çevir"
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => { setShowResult(false); setResult(null); setWinAmount(0); }}
                variant="secondary"
                className="flex-1 h-14 text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Aynı Bahis
              </Button>
              <Button
                onClick={() => { clearBets(); }}
                className="flex-1 h-14 text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all"
              >
                Yeni Bahis
              </Button>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Roulette;
