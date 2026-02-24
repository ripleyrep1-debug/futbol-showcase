import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, Database, FileText, CreditCard, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PurgeAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  confirmWord: string;
}

const ACTIONS: PurgeAction[] = [
  { id: "bets", title: "Sonuçlanan Bahisleri Sil", description: "Kazanan, kaybeden ve iptal edilmiş bahisleri temizle. Bekleyen bahisler korunur.", icon: Trophy, color: "text-accent", confirmWord: "SİL" },
  { id: "transactions", title: "İşlem Geçmişini Temizle", description: "Tüm işlem kayıtlarını sil. Bu işlem geri alınamaz.", icon: FileText, color: "text-primary", confirmWord: "TEMİZLE" },
  { id: "payments", title: "İşlenmiş Ödemeleri Sil", description: "Onaylanmış ve reddedilmiş ödeme taleplerini temizle. Bekleyenler korunur.", icon: CreditCard, color: "text-orange-400", confirmWord: "SİL" },
  { id: "all_bets", title: "TÜM Bahisleri Sil", description: "Bekleyenler dahil tüm bahisleri sil. Çok dikkatli olun!", icon: Trash2, color: "text-destructive", confirmWord: "HEPSINI_SIL" },
];

const DataManagement = () => {
  const [activeAction, setActiveAction] = useState<PurgeAction | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const purge = useMutation({
    mutationFn: async (actionId: string) => {
      switch (actionId) {
        case "bets": {
          const { error } = await supabase.from("bets").delete().in("status", ["won", "lost", "cancelled"]);
          if (error) throw error;
          break;
        }
        case "transactions": {
          const { error } = await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (error) throw error;
          break;
        }
        case "payments": {
          const { error } = await supabase.from("payment_requests").delete().in("status", ["approved", "rejected"]);
          if (error) throw error;
          break;
        }
        case "all_bets": {
          const { error } = await supabase.from("bets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (error) throw error;
          break;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: "Başarılı", description: "Veriler temizlendi." });
      setActiveAction(null);
      setConfirmInput("");
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Veri Yönetimi</h1>
        <p className="text-muted-foreground mt-1">Eski verileri toplu olarak temizleyin</p>
      </div>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Dikkat!</p>
            <p className="text-sm text-muted-foreground">Bu sayfadaki işlemler geri alınamaz. Silinen veriler kalıcı olarak kaldırılır. Lütfen işlemleri onaylamadan önce dikkatli olun.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ACTIONS.map((action) => (
          <Card key={action.id} className="border-border hover:border-primary/30 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <action.icon className={`h-5 w-5 ${action.color}`} />
                {action.title}
              </CardTitle>
              <CardDescription>{action.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => { setActiveAction(action); setConfirmInput(""); }}>
                <Trash2 className="h-4 w-4 mr-2" /> Temizle
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!activeAction} onOpenChange={() => { setActiveAction(null); setConfirmInput(""); }}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {activeAction?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{activeAction?.description}</p>
              <p className="text-foreground font-medium">
                Onaylamak için <span className="text-destructive font-mono">{activeAction?.confirmWord}</span> yazın:
              </p>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={activeAction?.confirmWord}
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmInput !== activeAction?.confirmWord}
              onClick={() => activeAction && purge.mutate(activeAction.id)}
            >
              Onayla ve Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataManagement;
