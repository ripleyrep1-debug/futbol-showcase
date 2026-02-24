import { useState } from "react";
import { X, Trash2, ChevronUp, ChevronDown, Receipt, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BetSelection } from "./BettingOdds";

interface BetSlipProps {
  bets: BetSelection[];
  onRemoveBet: (id: string) => void;
  onClearAll: () => void;
}

const BetSlip = ({ bets, onRemoveBet, onClearAll }: BetSlipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stake, setStake] = useState("");
  const [placing, setPlacing] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const totalOdds = bets.reduce((acc, b) => acc * b.odds, 1);
  const stakeNum = parseFloat(stake) || 0;
  const potentialWin = stakeNum * totalOdds;

  const handlePlaceBet = async () => {
    if (!user) {
      toast.error("Bahis yapmak için giriş yapmalısınız.");
      return;
    }
    if (stakeNum <= 0) {
      toast.error("Geçerli bir yatırım tutarı girin.");
      return;
    }
    if (bets.length === 0) return;

    setPlacing(true);
    try {
      const selections = bets.map((b) => ({
        matchId: b.matchId,
        matchLabel: b.matchLabel,
        selection: b.selection,
        odds: b.odds,
      }));

      const { data, error } = await supabase.rpc("place_bet", {
        p_selections: selections as any,
        p_stake: stakeNum,
        p_total_odds: parseFloat(totalOdds.toFixed(2)),
        p_potential_win: parseFloat(potentialWin.toFixed(2)),
      });

      if (error) {
        if (error.message.includes("Insufficient balance")) {
          toast.error("Yetersiz bakiye! Lütfen bakiye yükleyin.");
        } else {
          toast.error(error.message || "Bahis oluşturulamadı.");
        }
        return;
      }

      toast.success("Bahis başarıyla oluşturuldu! 🎉");
      onClearAll();
      setStake("");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setPlacing(false);
    }
  };

  if (bets.length === 0) return null;

  return (
    <>
      {/* Mobile toggle bar */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground font-bold"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <span>Kupon ({bets.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Toplam Oran: {totalOdds.toFixed(2)}</span>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </button>

        {isOpen && (
          <div className="bg-card border-t border-border max-h-[50vh] overflow-y-auto p-3 space-y-2 shadow-2xl">
            <SlipContent
              bets={bets}
              onRemoveBet={onRemoveBet}
              onClearAll={onClearAll}
              stake={stake}
              setStake={setStake}
              totalOdds={totalOdds}
              potentialWin={potentialWin}
              onPlaceBet={handlePlaceBet}
              placing={placing}
            />
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed top-20 right-4 w-80 z-40">
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2 font-bold">
              <Receipt className="h-5 w-5" />
              Kupon ({bets.length})
            </div>
            <button onClick={onClearAll} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
            <SlipContent
              bets={bets}
              onRemoveBet={onRemoveBet}
              onClearAll={onClearAll}
              stake={stake}
              setStake={setStake}
              totalOdds={totalOdds}
              potentialWin={potentialWin}
              onPlaceBet={handlePlaceBet}
              placing={placing}
            />
          </div>
        </div>
      </div>
    </>
  );
};

function SlipContent({
  bets,
  onRemoveBet,
  stake,
  setStake,
  totalOdds,
  potentialWin,
  onPlaceBet,
  placing,
}: {
  bets: BetSelection[];
  onRemoveBet: (id: string) => void;
  onClearAll: () => void;
  stake: string;
  setStake: (v: string) => void;
  totalOdds: number;
  potentialWin: number;
  onPlaceBet: () => void;
  placing: boolean;
}) {
  return (
    <>
      {bets.map((bet) => (
        <div key={bet.id} className="flex items-start justify-between bg-secondary rounded-lg p-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{bet.matchLabel}</p>
            <p className="text-sm font-semibold text-foreground">{bet.selection}</p>
            <p className="text-sm font-bold text-primary">{bet.odds.toFixed(2)}</p>
          </div>
          <button
            onClick={() => onRemoveBet(bet.id)}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="pt-2 border-t border-border space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Yatırım (₺)</label>
          <input
            type="number"
            min="1"
            placeholder="0.00"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2">
          {[10, 25, 50, 100].map((amount) => (
            <button
              key={amount}
              onClick={() => setStake(String(amount))}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              ₺{amount}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Toplam Oran</span>
            <span className="font-bold text-foreground">{totalOdds.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Olası Kazanç</span>
            <span className="font-bold text-accent">₺{potentialWin.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={onPlaceBet}
          disabled={placing}
          className="w-full btn-primary !py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {placing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              İşleniyor...
            </>
          ) : (
            "Bahis Yap"
          )}
        </button>
      </div>
    </>
  );
}

export default BetSlip;
