import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

const BetHistory = () => {
  const [statusFilter, setStatusFilter] = useState("settled");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: bets, isLoading } = useQuery({
    queryKey: ["admin-bet-history", statusFilter],
    queryFn: async () => {
      let q = supabase.from("bets").select("*").order("created_at", { ascending: false }).limit(500);
      if (statusFilter === "settled") q = q.in("status", ["won", "lost", "cancelled"]);
      else if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((b: any) => b.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.display_name; });

      return (data ?? []).map((b: any) => ({ ...b, display_name: nameMap[b.user_id] || "—" }));
    },
  });

  const filtered = (bets ?? []).filter((b: any) =>
    (b.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    b.id.toLowerCase().includes(search.toLowerCase())
  );

  const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
    pending: { label: "Bekliyor", variant: "secondary" },
    won: { label: "Kazandı", variant: "default" },
    lost: { label: "Kaybetti", variant: "destructive" },
    cancelled: { label: "İptal", variant: "outline" },
  };

  const totalStake = filtered.reduce((s: number, b: any) => s + Number(b.stake), 0);
  const totalPotential = filtered.filter((b: any) => b.status === "won").reduce((s: number, b: any) => s + Number(b.potential_win), 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Bahis Geçmişi</h1>
        <p className="text-muted-foreground mt-1">Sonuçlanmış bahislerin arşivi</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Toplam Bahis</p>
            <p className="text-xl font-bold text-foreground">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Toplam Bahis Tutarı</p>
            <p className="text-xl font-bold text-primary">₺{totalStake.toLocaleString("tr-TR")}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Ödenen Kazançlar</p>
            <p className="text-xl font-bold text-green-400">₺{totalPotential.toLocaleString("tr-TR")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Bahis Arşivi</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="settled">Sonuçlanan</SelectItem>
                <SelectItem value="all">Tümü</SelectItem>
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
          {isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Bahis</TableHead>
                    <TableHead>Oran</TableHead>
                    <TableHead>Potansiyel</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Bahis bulunamadı</TableCell></TableRow>
                  ) : (
                    filtered.map((bet: any) => {
                      const selections = Array.isArray(bet.selections) ? bet.selections : [];
                      const isExpanded = expandedId === bet.id;
                      return (
                        <>
                          <TableRow key={bet.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : bet.id)}>
                            <TableCell>{isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</TableCell>
                            <TableCell className="font-medium">{bet.display_name}</TableCell>
                            <TableCell>₺{Number(bet.stake).toLocaleString("tr-TR")}</TableCell>
                            <TableCell>{Number(bet.total_odds).toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">₺{Number(bet.potential_win).toLocaleString("tr-TR")}</TableCell>
                            <TableCell>
                              <Badge variant={statusMap[bet.status]?.variant ?? "secondary"}>
                                {statusMap[bet.status]?.label ?? bet.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{new Date(bet.created_at).toLocaleString("tr-TR")}</TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${bet.id}-detail`}>
                              <TableCell colSpan={7} className="bg-muted/30 p-4">
                                <div className="space-y-2">
                                  {selections.map((sel: any, i: number) => (
                                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                                      sel.result === "won" ? "bg-green-500/10 border-green-500/30" :
                                      sel.result === "lost" ? "bg-red-500/10 border-red-500/30" :
                                      "bg-card border-border"
                                    }`}>
                                      <div>
                                        <p className="text-sm font-medium text-foreground">{sel.matchLabel || sel.match || `${sel.home_team} vs ${sel.away_team}`}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {sel.selection || sel.bet_value} — Oran: {Number(sel.odds || sel.odd).toFixed(2)}
                                        </p>
                                      </div>
                                      <Badge variant={sel.result === "won" ? "default" : sel.result === "lost" ? "destructive" : "secondary"}>
                                        {sel.result === "won" ? "✅ Kazandı" : sel.result === "lost" ? "❌ Kaybetti" : "⏳ Bekliyor"}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
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

export default BetHistory;
