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
import { Search, ArrowDownCircle, ArrowUpCircle, Trophy, RefreshCw } from "lucide-react";

const TransactionHistory = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-all-transactions", typeFilter],
    queryFn: async () => {
      let q = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(500);
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;

      const userIds = [...new Set((data ?? []).map((t: any) => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.display_name; });

      return (data ?? []).map((t: any) => ({ ...t, display_name: nameMap[t.user_id] || "—" }));
    },
  });

  const filtered = (transactions ?? []).filter((t: any) =>
    (t.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const typeIcon = (type: string) => {
    switch (type) {
      case "deposit": return <ArrowDownCircle className="h-4 w-4 text-green-400" />;
      case "withdrawal": return <ArrowUpCircle className="h-4 w-4 text-orange-400" />;
      case "win": return <Trophy className="h-4 w-4 text-accent" />;
      case "refund": return <RefreshCw className="h-4 w-4 text-primary" />;
      default: return null;
    }
  };

  const typeLabel: Record<string, string> = {
    deposit: "Yatırım", withdrawal: "Çekim", win: "Kazanç", bet: "Bahis", refund: "İade",
  };

  // Summary
  const totalDeposits = filtered.filter((t: any) => t.type === "deposit").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalWithdrawals = filtered.filter((t: any) => t.type === "withdrawal").reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">İşlem Geçmişi</h1>
        <p className="text-muted-foreground mt-1">Tüm finansal işlemlerin detaylı kaydı</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Toplam Yatırım</p>
            <p className="text-xl font-bold text-green-400">₺{totalDeposits.toLocaleString("tr-TR")}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Toplam Çekim</p>
            <p className="text-xl font-bold text-orange-400">₺{totalWithdrawals.toLocaleString("tr-TR")}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">İşlem Sayısı</p>
            <p className="text-xl font-bold text-foreground">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Tüm İşlemler</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="deposit">Yatırım</SelectItem>
                <SelectItem value="withdrawal">Çekim</SelectItem>
                <SelectItem value="win">Kazanç</SelectItem>
                <SelectItem value="bet">Bahis</SelectItem>
                <SelectItem value="refund">İade</SelectItem>
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
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">İşlem bulunamadı</TableCell></TableRow>
                  ) : (
                    filtered.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.display_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {typeIcon(t.type)}
                            <span className="text-sm">{typeLabel[t.type] || t.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`font-semibold ${Number(t.amount) >= 0 ? "text-green-400" : "text-destructive"}`}>
                          {Number(t.amount) >= 0 ? "+" : ""}₺{Number(t.amount).toLocaleString("tr-TR")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.description || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(t.created_at).toLocaleString("tr-TR")}</TableCell>
                      </TableRow>
                    ))
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

export default TransactionHistory;
