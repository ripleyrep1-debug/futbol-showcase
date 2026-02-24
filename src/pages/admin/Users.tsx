import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Ban, CheckCircle, Wallet, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Users = () => {
  const [search, setSearch] = useState("");
  const [detailUser, setDetailUser] = useState<any>(null);
  const [balanceInput, setBalanceInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userBets } = useQuery({
    queryKey: ["admin-user-bets", detailUser?.id],
    enabled: !!detailUser,
    queryFn: async () => {
      const { data } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", detailUser.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: userTransactions } = useQuery({
    queryKey: ["admin-user-txs", detailUser?.id],
    enabled: !!detailUser,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", detailUser.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Başarılı", description: "Kullanıcı durumu güncellendi." });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const setBalance = useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const { error } = await supabase.from("profiles").update({ balance }).eq("id", id);
      if (error) throw error;
      await supabase.from("transactions").insert({
        user_id: id,
        type: "deposit",
        amount: balance - Number(detailUser.balance),
        description: "Admin tarafından bakiye düzenleme",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Başarılı", description: "Bakiye güncellendi." });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const filtered = (users ?? []).filter(
    (u) =>
      (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  );

  const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
    pending: { label: "Bekliyor", variant: "secondary" },
    won: { label: "Kazandı", variant: "default" },
    lost: { label: "Kaybetti", variant: "destructive" },
    cancelled: { label: "İptal", variant: "outline" },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Kullanıcılar</h1>
        <p className="text-muted-foreground mt-1">Tüm kullanıcıları yönetin</p>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Kullanıcı Listesi</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Kullanıcı ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Bakiye</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">Kullanıcı bulunamadı</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{user.display_name || "İsimsiz"}</p>
                          <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}...</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">₺{Number(user.balance).toLocaleString("tr-TR")}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"} className="text-xs">
                          {user.status === "active" ? "Aktif" : "Askıda"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString("tr-TR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setDetailUser(user); setBalanceInput(String(user.balance)); }}>
                            <Eye className="h-4 w-4 mr-1" /> Detay
                          </Button>
                          <Button size="sm" variant={user.status === "active" ? "destructive" : "default"}
                            onClick={() => toggleStatus.mutate({ id: user.id, newStatus: user.status === "active" ? "suspended" : "active" })}>
                            {user.status === "active" ? <><Ban className="h-4 w-4 mr-1" /> Askıya Al</> : <><CheckCircle className="h-4 w-4 mr-1" /> Aktifleştir</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="border-border bg-card max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailUser?.display_name || "Kullanıcı"} — Detay</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Balance edit */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" /> Bakiye Düzenle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Input type="number" value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} className="w-40" />
                  <span className="text-muted-foreground">₺</span>
                  <Button size="sm" onClick={() => {
                    if (detailUser) setBalance.mutate({ id: detailUser.id, balance: Number(balanceInput) });
                  }}>Kaydet</Button>
                </div>
              </CardContent>
            </Card>

            {/* User Bets */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Son Bahisler</h3>
              {(userBets?.length ?? 0) === 0 ? <p className="text-muted-foreground text-sm">Bahis yok</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bahis</TableHead>
                      <TableHead>Oran</TableHead>
                      <TableHead>Potansiyel</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userBets?.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell>₺{Number(b.stake).toLocaleString("tr-TR")}</TableCell>
                        <TableCell>{Number(b.total_odds).toFixed(2)}</TableCell>
                        <TableCell>₺{Number(b.potential_win).toLocaleString("tr-TR")}</TableCell>
                        <TableCell>
                          <Badge variant={statusMap[b.status]?.variant ?? "secondary"}>
                            {statusMap[b.status]?.label ?? b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(b.created_at).toLocaleString("tr-TR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* User Transactions */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Son İşlemler</h3>
              {(userTransactions?.length ?? 0) === 0 ? <p className="text-muted-foreground text-sm">İşlem yok</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tür</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userTransactions?.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="capitalize">{t.type}</TableCell>
                        <TableCell className={Number(t.amount) >= 0 ? "text-green-400" : "text-destructive"}>
                          {Number(t.amount) >= 0 ? "+" : ""}₺{Number(t.amount).toLocaleString("tr-TR")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.description || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleString("tr-TR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
