import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import DepositModal from "@/components/DepositModal";
import AuthModal from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Loader2, CheckCircle, XCircle, Clock, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Navigate } from "react-router-dom";

const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  pending: { label: "Bekliyor", variant: "secondary" },
  won: { label: "Kazandı", variant: "default" },
  lost: { label: "Kaybetti", variant: "destructive" },
  cancelled: { label: "İptal", variant: "outline" },
};

const txTypeLabels: Record<string, { label: string; icon: typeof ArrowDownCircle; color: string }> = {
  deposit: { label: "Yatırım", icon: ArrowDownCircle, color: "text-green-500" },
  withdrawal: { label: "Çekim", icon: ArrowUpCircle, color: "text-red-500" },
  bet: { label: "Bahis", icon: Receipt, color: "text-primary" },
  win: { label: "Kazanç", icon: CheckCircle, color: "text-green-500" },
  refund: { label: "İade", icon: Wallet, color: "text-blue-500" },
};

const MyBets = () => {
  const { user, loading: authLoading } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  const { data: bets, isLoading } = useQuery({
    queryKey: ["my-bets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["my-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  if (authLoading) return null;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 lg:pb-8">
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="bets">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="bets" className="flex-1 gap-2">
                <Receipt className="h-4 w-4" />
                Bahislerim
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-2">
                <Wallet className="h-4 w-4" />
                İşlem Geçmişi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bets">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !bets || bets.length === 0 ? (
                <div className="text-center py-20">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Henüz bahis yapmadınız.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bets.map((bet) => {
                    const selections = Array.isArray(bet.selections) ? bet.selections : [];
                    const st = statusMap[bet.status] ?? { label: bet.status, variant: "secondary" as const };
                    const settledCount = selections.filter((s: any) => s.result === "won" || s.result === "lost").length;
                    const totalCount = selections.length;
                    return (
                      <div key={bet.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={st.variant}>{st.label}</Badge>
                            {totalCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {settledCount}/{totalCount} seçim sonuçlandı
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(bet.created_at).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {selections.map((sel: any, i: number) => (
                            <div key={i} className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                              sel.result === "won" ? "bg-green-500/10" :
                              sel.result === "lost" ? "bg-red-500/10" : ""
                            }`}>
                              <div className="flex items-center gap-2">
                                {sel.result === "won" && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                                {sel.result === "lost" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                                {!sel.result && <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                                <div>
                                  <span className="text-muted-foreground">{sel.matchLabel}</span>
                                  <span className="mx-2 text-foreground font-medium">{sel.selection}</span>
                                </div>
                              </div>
                              <span className="font-bold text-primary">{Number(sel.odds).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border text-sm">
                          <span className="text-muted-foreground">
                            Yatırım: <span className="font-bold text-foreground">₺{Number(bet.stake).toFixed(2)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Oran: <span className="font-bold text-foreground">{Number(bet.total_odds).toFixed(2)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Kazanç: <span className="font-bold text-accent">₺{Number(bet.potential_win).toFixed(2)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              {txLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !transactions || transactions.length === 0 ? (
                <div className="text-center py-20">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Henüz işlem geçmişiniz yok.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => {
                    const txType = txTypeLabels[tx.type] ?? { label: tx.type, icon: Wallet, color: "text-muted-foreground" };
                    const Icon = txType.icon;
                    const isPositive = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full bg-secondary ${txType.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{txType.label}</p>
                            {tx.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleString("tr-TR")}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                          {isPositive ? "+" : ""}₺{Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <BottomNav
        onOpenDeposit={() => setDepositOpen(true)}
        onOpenAuth={(tab) => { setAuthTab(tab); setAuthOpen(true); }}
      />
      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </div>
  );
};

export default MyBets;