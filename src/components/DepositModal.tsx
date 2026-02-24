import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Copy, Check, Loader2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DepositModal = ({ open, onOpenChange }: DepositModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  // Fetch site settings for IBAN info and toggle
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });

  // Fetch user's payment history
  const { data: payments } = useQuery({
    queryKey: ["user-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const ibanEnabled = settings?.iban_payments_enabled !== "false";
  const siteIban = settings?.site_iban || "TR00 0000 0000 0000 0000 0000 00";
  const siteAccountHolder = settings?.site_account_holder || "BlueBet Ödeme";

  const submitDeposit = useMutation({
    mutationFn: async () => {
      if (!user || !amount) return;
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        type: "deposit",
        amount: Number(amount),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-payments"] });
      toast({ title: "Başarılı", description: "Yatırım talebiniz alındı. Admin onayından sonra bakiyenize eklenecektir." });
      setAmount("");
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const submitWithdraw = useMutation({
    mutationFn: async ({ withdrawAmount, iban, accountHolder }: { withdrawAmount: string; iban: string; accountHolder: string }) => {
      if (!user) return;
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        type: "withdrawal",
        amount: Number(withdrawAmount),
        iban,
        account_holder: accountHolder,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-payments"] });
      toast({ title: "Başarılı", description: "Çekim talebiniz alındı." });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const [withdrawForm, setWithdrawForm] = useState({ amount: "", iban: "", accountHolder: "" });

  const copyIban = () => {
    navigator.clipboard.writeText(siteIban.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Onaylandı</span>;
    if (status === "rejected") return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Reddedildi</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Bekliyor</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Bakiye İşlemleri
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="deposit" className="flex-1">Yatırım</TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1">Çekim</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Geçmiş</TabsTrigger>
          </TabsList>

          {/* DEPOSIT TAB */}
          <TabsContent value="deposit" className="space-y-4 mt-4">
            {!ibanEnabled ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Havale/EFT ile yatırım şu anda kapalıdır.</p>
              </div>
            ) : (
              <>
                <div className="bg-secondary rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Havale / EFT Bilgileri</p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Hesap Sahibi</p>
                    <p className="text-sm font-medium text-foreground">{siteAccountHolder}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">IBAN</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-primary flex-1">{siteIban}</code>
                      <button onClick={copyIban} className="p-1.5 rounded border border-border hover:border-primary transition-colors">
                        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    ⚠️ Açıklama kısmına kullanıcı adınızı yazınız.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Yatırım Tutarı (₺)</label>
                  <Input
                    type="number"
                    min="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                  />
                </div>

                <div className="flex gap-2">
                  {[50, 100, 250, 500, 1000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 py-1.5 text-xs font-medium rounded border border-border hover:border-primary hover:text-primary transition-colors"
                    >
                      ₺{v}
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={() => submitDeposit.mutate()}
                  disabled={!amount || Number(amount) < 10 || submitDeposit.isPending}
                >
                  {submitDeposit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Yatırım Talebi Oluştur
                </Button>
              </>
            )}
          </TabsContent>

          {/* WITHDRAW TAB */}
          <TabsContent value="withdraw" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Çekim Tutarı (₺)</label>
              <Input
                type="number"
                min="10"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IBAN</label>
              <Input
                value={withdrawForm.iban}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, iban: e.target.value })}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ad Soyad</label>
              <Input
                value={withdrawForm.accountHolder}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, accountHolder: e.target.value })}
                placeholder="Ad Soyad"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => submitWithdraw.mutate({
                withdrawAmount: withdrawForm.amount,
                iban: withdrawForm.iban,
                accountHolder: withdrawForm.accountHolder,
              })}
              disabled={!withdrawForm.amount || !withdrawForm.iban || !withdrawForm.accountHolder || submitWithdraw.isPending}
            >
              {submitWithdraw.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Çekim Talebi Oluştur
            </Button>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            {(payments ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">İşlem geçmişi yok</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(payments ?? []).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {p.type === "deposit" ? "Yatırım" : "Çekim"} — ₺{Number(p.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
