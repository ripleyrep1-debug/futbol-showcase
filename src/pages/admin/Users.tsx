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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Ban, CheckCircle, Wallet, Eye, Trash2, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Users = () => {
  const [search, setSearch] = useState("");
  const [detailUser, setDetailUser] = useState<any>(null);
  const [balanceInput, setBalanceInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
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

  const { data: allRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  const { data: userBets } = useQuery({
    queryKey: ["admin-user-bets", detailUser?.id],
    enabled: !!detailUser,
    queryFn: async () => {
      const { data } = await supabase
        .from("bets").select("*")
        .eq("user_id", detailUser.id)
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: userTransactions } = useQuery({
    queryKey: ["admin-user-txs", detailUser?.id],
    enabled: !!detailUser,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions").select("*")
        .eq("user_id", detailUser.id)
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const getUserRoles = (userId: string) => (allRoles ?? []).filter((r: any) => r.user_id === userId).map((r: any) => r.role);
  const isAdmin = (userId: string) => getUserRoles(userId).includes("admin");

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
        user_id: id, type: "deposit",
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

  const adminAction = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "İşlem başarısız");
      return json;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      const msg = variables.action === "delete" ? "Kullanıcı silindi." :
        variables.action === "set_role" ? "Rol güncellendi." : "Şifre sıfırlandı.";
      toast({ title: "Başarılı", description: msg });
      if (variables.action === "delete") { setDeleteTarget(null); setDetailUser(null); }
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
        <p className="text-muted-foreground mt-1">Kullanıcıları yönetin, sil, rol ata, bakiye düzenle</p>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Kullanıcı Listesi ({filtered.length})</CardTitle>
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
                  <TableHead>Rol</TableHead>
                  <TableHead>Bakiye</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">Kullanıcı bulunamadı</TableCell>
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
                      <TableCell>
                        <Badge variant={isAdmin(user.id) ? "default" : "secondary"} className="text-xs">
                          {isAdmin(user.id) ? "Admin" : "Kullanıcı"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">₺{Number(user.balance).toLocaleString("tr-TR")}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"} className="text-xs">
                          {user.status === "active" ? "Aktif" : "Askıda"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString("tr-TR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => { setDetailUser(user); setBalanceInput(String(user.balance)); }}>
                            <Eye className="h-4 w-4 mr-1" /> Detay
                          </Button>
                          <Button size="sm" variant={user.status === "active" ? "destructive" : "default"}
                            onClick={() => toggleStatus.mutate({ id: user.id, newStatus: user.status === "active" ? "suspended" : "active" })}>
                            {user.status === "active" ? <><Ban className="h-4 w-4 mr-1" /> Askıya Al</> : <><CheckCircle className="h-4 w-4 mr-1" /> Aktifleştir</>}
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => adminAction.mutate({ action: "set_role", userId: user.id, role: isAdmin(user.id) ? "user" : "admin" })}>
                            {isAdmin(user.id) ? <><ShieldOff className="h-4 w-4 mr-1" /> Admin Kaldır</> : <><ShieldCheck className="h-4 w-4 mr-1" /> Admin Yap</>}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(user)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Sil
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.display_name}</strong> adlı kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz. Tüm bahisleri, işlemleri ve ödeme talepleri de silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && adminAction.mutate({ action: "delete", userId: deleteTarget.id })}>
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Detail Modal */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="border-border bg-card max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailUser?.display_name || "Kullanıcı"} — Detay
              {detailUser && isAdmin(detailUser.id) && <Badge variant="default" className="text-xs">Admin</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => detailUser && adminAction.mutate({ action: "reset_password", userId: detailUser.id })}>
                <KeyRound className="h-4 w-4 mr-1" /> Şifre Sıfırla
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => detailUser && adminAction.mutate({ action: "set_role", userId: detailUser.id, role: isAdmin(detailUser.id) ? "user" : "admin" })}>
                {detailUser && isAdmin(detailUser.id) ? <><ShieldOff className="h-4 w-4 mr-1" /> Admin Kaldır</> : <><ShieldCheck className="h-4 w-4 mr-1" /> Admin Yap</>}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(detailUser); }}>
                <Trash2 className="h-4 w-4 mr-1" /> Kullanıcıyı Sil
              </Button>
            </div>

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
