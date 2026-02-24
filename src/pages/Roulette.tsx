import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Volume2, VolumeX, RotateCcw, Trash2, Info } from "lucide-react";
import { Link } from "react-router-dom";

// ─── Types ───
type BetType =
  | { kind: "straight"; number: number }
  | { kind: "split"; numbers: [number, number] }
  | { kind: "red" }
  | { kind: "black" }
  | { kind: "even" }
  | { kind: "odd" }
  | { kind: "low" }
  | { kind: "high" }
  | { kind: "dozen"; dozen: 1 | 2 | 3 }
  | { kind: "column"; column: 1 | 2 | 3 };

interface PlacedBet { type: BetType; amount: number; label: string; }

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

function getColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.includes(n) ? "red" : "black";
}

function getPayout(bet: BetType): number {
  switch (bet.kind) {
    case "straight": return 35;
    case "split": return 17;
    case "red": case "black": case "even": case "odd": case "low": case "high": return 1;
    case "dozen": case "column": return 2;
  }
}

function isWin(bet: BetType, result: number): boolean {
  switch (bet.kind) {
    case "straight": return bet.number === result;
    case "split": return bet.numbers.includes(result);
    case "red": return RED_NUMBERS.includes(result);
    case "black": return result > 0 && !RED_NUMBERS.includes(result);
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

// ─── Sound ───
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  private getCtx() { if (!this.ctx) this.ctx = new AudioContext(); return this.ctx; }
  play(type: "chip" | "spin" | "win" | "lose" | "ball") {
    if (this.muted) return;
    try {
      const ctx = this.getCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); const now = ctx.currentTime;
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

const CHIPS = [10, 25, 50, 100, 250, 500, 1000];

// Chip component — centered on cell
const Chip = ({ amount }: { amount: number }) => {
  if (amount <= 0) return null;
  const label = amount >= 1000 ? `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k` : String(amount);
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-scale-in">
      <div className="relative">
        <div className="absolute inset-0 translate-y-[2px] w-6 h-6 rounded-full bg-black/50" />
        <div className="w-6 h-6 rounded-full border-[2.5px] border-white/90 flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
          style={{ background: "linear-gradient(135deg, hsl(200 100% 60%), hsl(205 85% 45%))" }}>
          <span className="text-[8px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">{label}</span>
        </div>
      </div>
    </div>
  );
};

// Split chip — positioned on border between cells
const SplitChip = ({ amount }: { amount: number }) => {
  if (amount <= 0) return null;
  const label = amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : String(amount);
  return (
    <div className="absolute inset-0 flex items-end justify-center pointer-events-none z-20 animate-scale-in" style={{ bottom: "-8px" }}>
      <div className="relative -mb-2">
        <div className="w-5 h-5 rounded-full border-2 border-yellow-300/90 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <span className="text-[7px] font-black text-white drop-shadow-sm leading-none">{label}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main ───
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
  const [showRules, setShowRules] = useState(false);

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

  const getBetAmount = (type: BetType): number => {
    const found = bets.find(b => JSON.stringify(b.type) === JSON.stringify(type));
    return found?.amount ?? 0;
  };

  const placeBet = (type: BetType, label: string) => {
    if (spinning) return;
    const newTotal = totalBetAmount + selectedChip;
    if (newTotal > balance) { toast({ title: "Yetersiz bakiye", variant: "destructive" }); return; }
    if (newTotal > maxBet) { toast({ title: `Maksimum bahis ₺${maxBet}`, variant: "destructive" }); return; }
    sfx.play("chip");
    const key = JSON.stringify(type);
    const existing = bets.findIndex(b => JSON.stringify(b.type) === key);
    if (existing >= 0) {
      const updated = [...bets];
      updated[existing] = { ...updated[existing], amount: updated[existing].amount + selectedChip };
      setBets(updated);
    } else {
      setBets([...bets, { type, amount: selectedChip, label }]);
    }
  };

  const clearBets = () => { if (!spinning) { setBets([]); setShowResult(false); setResult(null); } };

  const pickResult = useCallback((): number => {
    const houseWins = Math.random() * 100 < houseEdge;
    if (houseWins && bets.length > 0) {
      const losingNumbers: number[] = [];
      for (let n = 0; n <= 36; n++) {
        if (bets.every(b => !isWin(b.type, n))) losingNumbers.push(n);
      }
      if (losingNumbers.length > 0) return losingNumbers[Math.floor(Math.random() * losingNumbers.length)];
      let minPay = Infinity; let minN = 0;
      for (let n = 0; n <= 36; n++) {
        const pay = bets.reduce((s, b) => s + (isWin(b.type, n) ? b.amount * getPayout(b.type) : -b.amount), 0);
        if (pay < minPay) { minPay = pay; minN = n; }
      }
      return minN;
    }
    if (bets.length > 0) {
      const winningNumbers: number[] = [];
      for (let n = 0; n <= 36; n++) { if (bets.some(b => isWin(b.type, n))) winningNumbers.push(n); }
      if (winningNumbers.length > 0) return winningNumbers[Math.floor(Math.random() * winningNumbers.length)];
    }
    return Math.floor(Math.random() * 37);
  }, [bets, houseEdge]);

  const spin = async () => {
    if (!user || bets.length === 0 || spinning) return;
    if (totalBetAmount < minBet) { toast({ title: `Minimum bahis ₺${minBet}`, variant: "destructive" }); return; }
    setSpinning(true); setShowResult(false); setResult(null); setWinAmount(0);

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

    await new Promise(r => setTimeout(r, 4000));
    sfx.play("ball");
    await new Promise(r => setTimeout(r, 500));

    let totalWin = 0;
    bets.forEach(b => { if (isWin(b.type, winningNumber)) totalWin += b.amount + b.amount * getPayout(b.type); });

    setResult(winningNumber); setWinAmount(totalWin); setShowResult(true);
    setHistory(prev => [winningNumber, ...prev.slice(0, 19)]);

    if (totalWin > 0) {
      sfx.play("win");
      const { data: fp2 } = await supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle();
      await supabase.from("profiles").update({ balance: (fp2?.balance ?? 0) + totalWin }).eq("id", user.id);
      await supabase.from("transactions").insert({ user_id: user.id, amount: totalWin, type: "roulette_win", description: `Rulet kazanç - ${winningNumber}` });
    } else { sfx.play("lose"); }

    invalidateProfiles();
    setSpinning(false);
  };

  const numBg = (n: number) => n === 0 ? "bg-green-600" : RED_NUMBERS.includes(n) ? "bg-red-600" : "bg-gray-900";

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-6xl mb-4">🎡</div>
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

  // Traditional roulette table: 3 rows x 12 cols
  // Row 1 (top):    3  6  9  12  15  18  21  24  27  30  33  36
  // Row 2 (mid):    2  5  8  11  14  17  20  23  26  29  32  35
  // Row 3 (bottom): 1  4  7  10  13  16  19  22  25  28  31  34
  const tableRows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  // Cell component for number
  const NumCell = ({ n, rowIdx, colIdx }: { n: number; rowIdx: number; colIdx: number }) => {
    const isRed = RED_NUMBERS.includes(n);
    const betAmt = getBetAmount({ kind: "straight", number: n });
    // Split bet: between this number and the one below (next row, same col)
    const belowNum = rowIdx < 2 ? tableRows[rowIdx + 1][colIdx] : null;
    const splitKey: [number, number] | null = belowNum !== null ? [Math.min(n, belowNum), Math.max(n, belowNum)] : null;
    const splitAmt = splitKey ? getBetAmount({ kind: "split", numbers: splitKey }) : 0;

    return (
      <div className="relative" style={{ gridRow: rowIdx + 1, gridColumn: colIdx + 2 }}>
        {/* Main number button */}
        <button
          onClick={() => placeBet({ kind: "straight", number: n }, String(n))}
          disabled={spinning}
          className={`w-full h-full flex items-center justify-center font-bold text-white text-[11px] sm:text-xs transition-all
            ${isRed ? "bg-[#c0392b]" : "bg-[#2c3e50]"}
            ${spinning ? "opacity-50 cursor-not-allowed" : "hover:brightness-125 active:scale-[0.92]"}
          `}
        >
          {n}
          <Chip amount={betAmt} />
        </button>
        {/* Split bet zone — bottom edge */}
        {splitKey && (
          <button
            onClick={(e) => { e.stopPropagation(); placeBet({ kind: "split", numbers: splitKey }, `${splitKey[0]}/${splitKey[1]}`); }}
            disabled={spinning}
            className={`absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-5 h-[10px] z-30 rounded-full
              ${spinning ? "cursor-not-allowed" : "cursor-pointer hover:bg-white/20"}
            `}
          >
            <SplitChip amount={splitAmt} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 max-w-2xl mx-auto w-full px-1.5 sm:px-4 pt-3 pb-20 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-2 mb-2">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold text-foreground font-rajdhani">🎡 Rulet</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setShowRules(!showRules)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <Info className="h-4 w-4" />
            </button>
            <button onClick={toggleMute} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="bg-secondary px-2.5 py-1 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground">₺</span>
              <span className="text-sm font-bold text-accent ml-0.5">{balance.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Rules */}
        {showRules && (
          <div className="bg-card border border-border rounded-xl p-3 mb-2 animate-fade-in text-xs text-muted-foreground space-y-1.5">
            <p className="font-bold text-foreground text-sm">📋 Oyun Kuralları</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span>🎯 Direkt Sayı</span><span className="text-accent font-bold">35:1</span>
              <span>↔️ Split (2 sayı arası)</span><span className="text-accent font-bold">17:1</span>
              <span>🔴 Kırmızı / ⚫ Siyah</span><span className="text-accent font-bold">1:1</span>
              <span>Tek / Çift</span><span className="text-accent font-bold">1:1</span>
              <span>1-18 / 19-36</span><span className="text-accent font-bold">1:1</span>
              <span>Düzine / Sütun</span><span className="text-accent font-bold">2:1</span>
            </div>
            <div className="border-t border-border pt-1.5 mt-1.5 space-y-0.5">
              <p>💰 Min: <span className="text-foreground font-bold">₺{minBet}</span> • Max: <span className="text-foreground font-bold">₺{maxBet}</span></p>
              <p>🟢 0 = tüm dış bahisler kaybeder</p>
              <p>↔️ İki sayı arasına tıklayarak split bahis yapabilirsiniz</p>
            </div>
          </div>
        )}

        {/* Wheel */}
        <div className="flex justify-center mb-2 relative">
          <div className="relative w-32 h-32 sm:w-44 sm:h-44">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-accent drop-shadow-lg" />
            <div
              className="w-full h-full rounded-full border-[3px] border-accent/30 relative overflow-hidden shadow-[0_0_30px_hsl(var(--accent)/0.15)]"
              style={{ transform: `rotate(${wheelRotation}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none" }}
            >
              {WHEEL_ORDER.map((num, i) => {
                const angle = (i * 360) / WHEEL_ORDER.length;
                const color = getColor(num);
                const bgColor = color === "green" ? "#16a34a" : color === "red" ? "#c0392b" : "#2c3e50";
                return (
                  <div key={num} className="absolute w-full h-full flex items-start justify-center" style={{ transform: `rotate(${angle}deg)` }}>
                    <div className="w-4 h-[48%] flex items-start justify-center pt-0.5 text-[5px] sm:text-[7px] font-bold text-white"
                      style={{ background: bgColor, clipPath: "polygon(25% 0%, 75% 0%, 56% 100%, 44% 100%)" }}>
                      {num}
                    </div>
                  </div>
                );
              })}
              <div className="absolute inset-[28%] rounded-full bg-background border-2 border-border flex items-center justify-center">
                {showResult && result !== null ? (
                  <span className={`text-sm sm:text-lg font-black ${result === 0 ? "text-green-400" : RED_NUMBERS.includes(result) ? "text-red-400" : "text-foreground"}`}>{result}</span>
                ) : (
                  <span className="text-muted-foreground text-[9px] sm:text-[10px]">RULET</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        {showResult && result !== null && (
          <div className="text-center mb-2 animate-scale-in">
            <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5">
              <div className={`w-7 h-7 rounded-full ${numBg(result)} flex items-center justify-center text-white font-bold text-xs`}>{result}</div>
              {winAmount > 0 ? (
                <span className="text-accent font-bold text-sm animate-pulse">+₺{winAmount.toFixed(0)} 🎉</span>
              ) : (
                <span className="text-destructive font-bold text-sm">Kaybettiniz 😞</span>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex gap-1 justify-center mb-2 flex-wrap">
            {history.slice(0, 12).map((n, i) => (
              <div key={i} className={`w-5 h-5 rounded-full ${numBg(n)} flex items-center justify-center text-white text-[8px] font-bold ${i === 0 ? "ring-2 ring-accent" : "opacity-50"}`}>{n}</div>
            ))}
          </div>
        )}

        {/* ═══ ROULETTE TABLE ═══ */}
        <div className="rounded-lg border-2 border-[#1a472a] overflow-hidden mb-2 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          style={{ background: "#0d6b2f" }}>
          
          {/* Table grid: 0 on left spanning 3 rows, then 12 cols x 3 rows */}
          <div className="grid" style={{ gridTemplateColumns: "28px repeat(12, 1fr)", gridTemplateRows: "repeat(3, 36px)" }}>
            {/* Zero — spans all 3 rows on the left */}
            <div className="relative border-r border-[#1a472a]" style={{ gridRow: "1 / 4", gridColumn: "1" }}>
              <button
                onClick={() => placeBet({ kind: "straight", number: 0 }, "0")}
                disabled={spinning}
                className={`w-full h-full flex items-center justify-center font-bold text-white text-sm bg-[#16a34a] transition-all
                  ${spinning ? "opacity-50 cursor-not-allowed" : "hover:brightness-125 active:scale-[0.95]"}`}
              >
                0
                <Chip amount={getBetAmount({ kind: "straight", number: 0 })} />
              </button>
            </div>

            {/* Number cells */}
            {tableRows.map((row, rIdx) =>
              row.map((n, cIdx) => (
                <NumCell key={n} n={n} rowIdx={rIdx} colIdx={cIdx} />
              ))
            )}
          </div>

          {/* Column bets row */}
          <div className="grid border-t border-[#1a472a]" style={{ gridTemplateColumns: "28px repeat(12, 1fr)" }}>
            <div /> {/* empty corner under 0 */}
            {([3, 2, 1] as const).map((col, idx) => {
              const betAmt = getBetAmount({ kind: "column", column: col });
              return (
                <button key={col} onClick={() => placeBet({ kind: "column", column: col }, `Sütun ${col}`)} disabled={spinning}
                  className={`relative h-[28px] flex items-center justify-center text-[9px] font-bold text-white/80 border-r border-[#1a472a]/60 transition-all
                    ${spinning ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10 active:scale-[0.97]"}`}
                  style={{ gridColumn: `${idx * 4 + 2} / ${idx * 4 + 6}` }}>
                  2:1
                  <Chip amount={betAmt} />
                </button>
              );
            })}
          </div>

          {/* Dozens row */}
          <div className="grid border-t border-[#1a472a]" style={{ gridTemplateColumns: "28px repeat(3, 1fr)" }}>
            <div />
            {([1, 2, 3] as const).map(d => {
              const betAmt = getBetAmount({ kind: "dozen", dozen: d });
              return (
                <button key={d} onClick={() => placeBet({ kind: "dozen", dozen: d }, `${d}. Düzine`)} disabled={spinning}
                  className={`relative h-[28px] flex items-center justify-center text-[9px] font-bold text-white/80 border-r border-[#1a472a]/60 transition-all
                    ${spinning ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10 active:scale-[0.97]"}`}>
                  {d === 1 ? "1-12" : d === 2 ? "13-24" : "25-36"}
                  <Chip amount={betAmt} />
                </button>
              );
            })}
          </div>

          {/* Outside bets — bottom row */}
          <div className="grid border-t border-[#1a472a]" style={{ gridTemplateColumns: "28px repeat(6, 1fr)" }}>
            <div />
            {[
              { type: { kind: "low" as const }, label: "1-18" },
              { type: { kind: "even" as const }, label: "ÇIFT" },
              { type: { kind: "red" as const }, label: "◆" },
              { type: { kind: "black" as const }, label: "◆" },
              { type: { kind: "odd" as const }, label: "TEK" },
              { type: { kind: "high" as const }, label: "19-36" },
            ].map(({ type, label }, idx) => {
              const betAmt = getBetAmount(type);
              const isRed = type.kind === "red";
              const isBlack = type.kind === "black";
              return (
                <button key={type.kind} onClick={() => placeBet(type, label)} disabled={spinning}
                  className={`relative h-[30px] flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-all border-r border-[#1a472a]/60
                    ${isRed ? "text-[#c0392b]" : isBlack ? "text-[#2c3e50]" : "text-white/80"}
                    ${spinning ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10 active:scale-[0.97]"}`}
                  style={isRed ? { background: "rgba(192,57,43,0.15)" } : isBlack ? { background: "rgba(44,62,80,0.25)" } : {}}>
                  {isRed ? <span className="text-[#e74c3c] text-xs">◆</span> : isBlack ? <span className="text-white text-xs">◆</span> : label}
                  <Chip amount={betAmt} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Chip Selector */}
        <div className="flex justify-center gap-1 sm:gap-1.5 mb-2">
          {CHIPS.filter(c => c <= maxBet).map(chip => (
            <button key={chip} onClick={() => { setSelectedChip(chip); sfx.play("chip"); }} disabled={spinning}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-[2.5px] font-bold text-[8px] sm:text-[10px] transition-all active:scale-90
                ${selectedChip === chip
                  ? "border-white bg-gradient-to-br from-accent to-primary text-white scale-110 shadow-[0_0_14px_hsl(var(--accent)/0.5)]"
                  : chip > balance
                    ? "border-border bg-muted text-muted-foreground opacity-40 cursor-not-allowed"
                    : "border-white/30 bg-secondary text-foreground hover:border-white/60 cursor-pointer"
                }`}>
              {chip >= 1000 ? `${chip/1000}k` : chip}
            </button>
          ))}
        </div>

        {/* Active Bets */}
        {bets.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-2 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bahisler</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent">₺{totalBetAmount}</span>
                <button onClick={clearBets} disabled={spinning} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {bets.map((b, i) => (
                <span key={i} className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-foreground">{b.label}: ₺{b.amount}</span>
              ))}
            </div>
          </div>
        )}

        {/* Spin / Reset */}
        <div className="flex gap-2">
          {!showResult ? (
            <Button onClick={spin} disabled={spinning || bets.length === 0}
              className="flex-1 h-12 text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all">
              {spinning ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" style={{ animationDelay: `${i*200}ms` }} />)}</div>
                  Dönüyor...
                </div>
              ) : "🎡 Çevir"}
            </Button>
          ) : (
            <>
              <Button onClick={() => { setShowResult(false); setResult(null); setWinAmount(0); }} variant="secondary"
                className="flex-1 h-12 text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all">
                <RotateCcw className="h-4 w-4 mr-1" /> Aynı Bahis
              </Button>
              <Button onClick={clearBets} className="flex-1 h-12 text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all">
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
