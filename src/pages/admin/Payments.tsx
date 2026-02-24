import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, CheckCircle, XCircle, Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Payments = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [processModal, setProcessModal] = useState<any>(null);
  const [iban, setIban] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [manualModal, setManualModal] = useState(false);
  const [manualUserId, setManualUserId] = useState("");
  const [manualType, setManualType] = useState("deposit");
  const [manualAmount, setManualAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments", statusFilter],
    queryFn: async () => {
      let q = supabase.from("payment_requests").select("*, profiles(display_name)").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, balance").order("display_name");
      return data ?? [];
    },
  });

  const processPayment = useMutation({
    mutationFn: async ({ id, action, userId, amount, type }: any) => {
      const updates: any = {
        status: action,
        processed_by: user?.id,
        processed_at: new Date().toISOString(),
        admin_note: adminNote || null,
      };
      if (iban) updates.iban = iban;
      if (accountHolder) updates.account_holder = accountHolder;

      const { error } = await supabase.from("payment_requests").update(updates).eq("id", id);
      if (error) throw error;

      if (action === "approved") {
        const { data: profile } = await supabase.from("profiles").select("balance").eq("id", userId).single();
        if (profile) {
          const newBalance = type === "deposit"
            ? Number(profile.balance) + Number(amount)
            : Number(profile.balance) - Number(amount);
          await supabase.from("profiles").update({ balance: Math.max(0, newBalance) }).eq("id", userId);
          await supabase.from("transactions").insert({
            user_id: userId,
            type: type,
            amount: type === "deposit" ? Number(amount) : -Number(amount),
            description: `${type === "deposit" ? "Yatırım" : "Çekim"} onaylandı`,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setProcessModal(null);
      setIban(""); setAccountHolder(""); setAdminNote("");
      toast({ title: "Başarılı", description: "Ödeme işlendi." });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const manualTransaction = useMutation({
    mutationFn: async () => {
      if (!manualUserId || !manualAmount) throw new Error("Eksik bilgi");
      const amt = Number(manualAmount);
      if (amt <= 0) throw new Error("Geçersiz tutar");

      const { data: profile } = await supabase.from("profiles").select("balance").eq("id", manualUserId).single();
      if (!profile) throw new Error("Kullanıcı bulunamadı");

      const newBalance = manualType === "deposit"
        ? Number(profile.balance) + amt
        : Math.max(0, Number(profile.balance) - amt);

      await supabase.from("profiles").update({ balance: newBalance }).eq("id", manualUserId);
      await supabase.from("transactions").insert({
        user_id: manualUserId,
        type: manualType as any,
        amount: manualType === "deposit" ? amt : -amt,
        description: `Admin tarafından manuel ${manualType === "deposit" ? "yatırım" : "çekim"}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setManualModal(false); setManualUserId(""); setManualAmount("");
      toast({ title: "Başarılı", description: "İşlem tamamlandı." });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (payments ?? []).filter((p: any) =>
    (p.profiles?.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.iban ?? "").includes(search) ||
    (p.account_holder ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
    pending: { label: "Bekliyor", variant: "secondary" },
    approved: { label: "Onaylandı", variant: "default" },
    rejected: { label: "Reddedildi", variant: "destructive" },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Ödemeler</h1>
          <p className="text-muted-foreground mt-1">Yatırım ve çekim taleplerini yönetin</p>
        </div>
        <Button onClick={() => setManualModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Manuel İşlem
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Ödeme Talepleri</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="pending">Bekleyen</SelectItem>
                <SelectItem value="approved">Onaylanan</SelectItem>
                <SelectItem value="rejected">Reddedilen</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Hesap Sahibi</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Ödeme talebi yok</TableCell></TableRow>
                  ) : (
                    filtered.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.profiles?.display_name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {p.type === "deposit" ? <ArrowDownCircle className="h-4 w-4 text-green-400" /> : <ArrowUpCircle className="h-4 w-4 text-orange-400" />}
                            {p.type === "deposit" ? "Yatırım" : "Çekim"}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">₺{Number(p.amount).toLocaleString("tr-TR")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{p.iban || "—"}</TableCell>
                        <TableCell>{p.account_holder || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusMap[p.status]?.variant ?? "secondary"}>
                            {statusMap[p.status]?.label ?? p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleString("tr-TR")}</TableCell>
                        <TableCell className="text-right">
                          {p.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => { setProcessModal(p); setIban(p.iban || ""); setAccountHolder(p.account_holder || ""); setAdminNote(""); }}>
                              İşle
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Payment Modal */}
      <Dialog open={!!processModal} onOpenChange={() => setProcessModal(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Ödeme İşle — {processModal?.type === "deposit" ? "Yatırım" : "Çekim"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Kullanıcı: <span className="text-foreground font-medium">{processModal?.profiles?.display_name}</span></p>
              <p className="text-sm text-muted-foreground">Tutar: <span className="text-foreground font-bold">₺{Number(processModal?.amount ?? 0).toLocaleString("tr-TR")}</span></p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IBAN</label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ad Soyad</label>
              <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Hesap sahibi adı" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notu</label>
              <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Opsiyonel not..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => processPayment.mutate({ id: processModal.id, action: "rejected", userId: processModal.user_id, amount: processModal.amount, type: processModal.type })}>
              <XCircle className="h-4 w-4 mr-1" /> Reddet
            </Button>
            <Button onClick={() => processPayment.mutate({ id: processModal.id, action: "approved", userId: processModal.user_id, amount: processModal.amount, type: processModal.type })}>
              <CheckCircle className="h-4 w-4 mr-1" /> Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Transaction Modal */}
      <Dialog open={manualModal} onOpenChange={setManualModal}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Manuel Bakiye İşlemi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kullanıcı</label>
              <Select value={manualUserId} onValueChange={setManualUserId}>
                <SelectTrigger><SelectValue placeholder="Kullanıcı seçin" /></SelectTrigger>
                <SelectContent>
                  {(allUsers ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.display_name} (₺{Number(u.balance).toLocaleString("tr-TR")})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">İşlem Türü</label>
              <Select value={manualType} onValueChange={setManualType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Yatırım (Bakiye Ekle)</SelectItem>
                  <SelectItem value="withdrawal">Çekim (Bakiye Düş)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tutar (₺)</label>
              <Input type="number" min="0" step="0.01" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => manualTransaction.mutate()} disabled={!manualUserId || !manualAmount}>
              İşlemi Uygula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
