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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, CheckCircle, XCircle, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Bets = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bets, isLoading } = useQuery({
    queryKey: ["admin-bets", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("bets")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const settleBet = useMutation({
    mutationFn: async ({ id, newStatus, userId, potentialWin }: { id: string; newStatus: string; userId: string; potentialWin: number }) => {
      const { error } = await supabase.from("bets").update({ status: newStatus }).eq("id", id);
      if (error) throw error;

      // If won, add winnings to user balance and create transaction
      if (newStatus === "won") {
        const { data: profile } = await supabase.from("profiles").select("balance").eq("id", userId).single();
        if (profile) {
          await supabase.from("profiles").update({ balance: Number(profile.balance) + potentialWin }).eq("id", userId);
          await supabase.from("transactions").insert({
            user_id: userId,
            type: "win",
            amount: potentialWin,
            description: `Bahis kazancı - Bahis #${id.slice(0, 8)}`,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Başarılı", description: "Bahis durumu güncellendi." });
    },
    onError: (err: Error) => {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (bets ?? []).filter((b: any) =>
    (b.profiles?.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    b.id.toLowerCase().includes(search.toLowerCase())
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
        <h1 className="text-3xl font-display font-bold text-foreground">Bahis Yönetimi</h1>
        <p className="text-muted-foreground mt-1">Tüm bahisleri görüntüleyin ve sonuçlandırın</p>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Bahis Listesi</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Durum filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="pending">Bekleyen</SelectItem>
                <SelectItem value="won">Kazanan</SelectItem>
                <SelectItem value="lost">Kaybeden</SelectItem>
                <SelectItem value="cancelled">İptal</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Bahis</TableHead>
                    <TableHead>Oran</TableHead>
                    <TableHead>Potansiyel Kazanç</TableHead>
                    <TableHead>Seçimler</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">Bahis bulunamadı</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((bet: any) => {
                      const selections = Array.isArray(bet.selections) ? bet.selections : [];
                      return (
                        <TableRow key={bet.id}>
                          <TableCell className="text-xs text-muted-foreground font-mono">{bet.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-medium">{bet.profiles?.display_name ?? "—"}</TableCell>
                          <TableCell>₺{Number(bet.stake).toLocaleString("tr-TR")}</TableCell>
                          <TableCell>{Number(bet.total_odds).toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">₺{Number(bet.potential_win).toLocaleString("tr-TR")}</TableCell>
                          <TableCell>
                            <div className="max-w-xs text-xs text-muted-foreground">
                              {selections.length} seçim
                              {selections.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {selections.slice(0, 3).map((s: any, i: number) => (
                                    <div key={i}>{s.match || s.home_team} — {s.selection || s.bet_value} @ {s.odd}</div>
                                  ))}
                                  {selections.length > 3 && <div>+{selections.length - 3} daha</div>}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusMap[bet.status]?.variant ?? "secondary"}>
                              {statusMap[bet.status]?.label ?? bet.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(bet.created_at).toLocaleString("tr-TR")}
                          </TableCell>
                          <TableCell className="text-right">
                            {bet.status === "pending" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="default" onClick={() => settleBet.mutate({ id: bet.id, newStatus: "won", userId: bet.user_id, potentialWin: Number(bet.potential_win) })}>
                                  <CheckCircle className="h-4 w-4 mr-1" /> Kazandı
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => settleBet.mutate({ id: bet.id, newStatus: "lost", userId: bet.user_id, potentialWin: 0 })}>
                                  <XCircle className="h-4 w-4 mr-1" /> Kaybetti
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => settleBet.mutate({ id: bet.id, newStatus: "cancelled", userId: bet.user_id, potentialWin: 0 })}>
                                  <Ban className="h-4 w-4 mr-1" /> İptal
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Bets;
