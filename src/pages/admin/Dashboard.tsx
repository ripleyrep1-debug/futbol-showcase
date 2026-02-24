import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Trophy, TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle,
  CheckCircle, XCircle, DollarSign, Percent,
} from "lucide-react";

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profilesRes, betsRes, wonBetsRes, lostBetsRes, depositsRes, withdrawalsRes, balanceRes, todayTxRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("bets").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bets").select("stake, potential_win").eq("status", "won"),
        supabase.from("bets").select("stake").eq("status", "lost"),
        supabase.from("transactions").select("amount").eq("type", "deposit"),
        supabase.from("transactions").select("amount").eq("type", "withdrawal"),
        supabase.from("profiles").select("balance"),
        supabase.from("transactions").select("amount, type, created_at")
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ]);

      const totalDeposits = (depositsRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
      const totalWithdrawals = (withdrawalsRes.data ?? []).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      const totalWonPayout = (wonBetsRes.data ?? []).reduce((s, b) => s + Number(b.potential_win), 0);
      const totalLostStakes = (lostBetsRes.data ?? []).reduce((s, b) => s + Number(b.stake), 0);
      const totalBalance = (balanceRes.data ?? []).reduce((s, p) => s + Number(p.balance), 0);
      const dailyVolume = (todayTxRes.data ?? []).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      const profit = totalDeposits - totalWithdrawals - totalWonPayout + totalLostStakes;

      return {
        totalUsers: profilesRes.count ?? 0,
        activeBets: betsRes.count ?? 0,
        wonBets: wonBetsRes.data?.length ?? 0,
        lostBets: lostBetsRes.data?.length ?? 0,
        totalDeposits,
        totalWithdrawals,
        totalBalance,
        dailyVolume,
        profit,
        totalWonPayout,
        totalLostStakes,
      };
    },
  });

  const { data: recentBets } = useQuery({
    queryKey: ["admin-recent-bets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bets")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const cards = [
    { title: "Toplam Kullanıcı", value: stats?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { title: "Aktif Bahisler", value: stats?.activeBets ?? 0, icon: Trophy, color: "text-accent" },
    { title: "Kazanan Bahisler", value: stats?.wonBets ?? 0, icon: CheckCircle, color: "text-green-400" },
    { title: "Kaybeden Bahisler", value: stats?.lostBets ?? 0, icon: XCircle, color: "text-destructive" },
    { title: "Toplam Yatırımlar", value: `₺${(stats?.totalDeposits ?? 0).toLocaleString("tr-TR")}`, icon: ArrowDownCircle, color: "text-green-400" },
    { title: "Toplam Çekimler", value: `₺${(stats?.totalWithdrawals ?? 0).toLocaleString("tr-TR")}`, icon: ArrowUpCircle, color: "text-orange-400" },
    { title: "Kâr / Zarar", value: `₺${(stats?.profit ?? 0).toLocaleString("tr-TR")}`, icon: Percent, color: (stats?.profit ?? 0) >= 0 ? "text-green-400" : "text-destructive" },
    { title: "Günlük Hacim", value: `₺${(stats?.dailyVolume ?? 0).toLocaleString("tr-TR")}`, icon: TrendingUp, color: "text-primary" },
    { title: "Toplam Bakiye", value: `₺${(stats?.totalBalance ?? 0).toLocaleString("tr-TR")}`, icon: Wallet, color: "text-yellow-400" },
    { title: "Ödenen Kazançlar", value: `₺${(stats?.totalWonPayout ?? 0).toLocaleString("tr-TR")}`, icon: DollarSign, color: "text-accent" },
  ];

  const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
    pending: { label: "Bekliyor", variant: "secondary" },
    won: { label: "Kazandı", variant: "default" },
    lost: { label: "Kaybetti", variant: "destructive" },
    cancelled: { label: "İptal", variant: "outline" },
    approved: { label: "Onaylandı", variant: "default" },
    rejected: { label: "Reddedildi", variant: "destructive" },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Genel Bakış</h1>
        <p className="text-muted-foreground mt-1">Admin paneli özet bilgileri</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {isLoading ? "..." : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bets */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Son Bahisler</CardTitle>
        </CardHeader>
        <CardContent>
          {(recentBets?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz bahis yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Bahis</TableHead>
                  <TableHead>Oran</TableHead>
                  <TableHead>Potansiyel</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBets?.map((bet: any) => (
                  <TableRow key={bet.id}>
                    <TableCell className="font-medium">{bet.profiles?.display_name ?? "—"}</TableCell>
                    <TableCell>₺{Number(bet.stake).toLocaleString("tr-TR")}</TableCell>
                    <TableCell>{Number(bet.total_odds).toFixed(2)}</TableCell>
                    <TableCell>₺{Number(bet.potential_win).toLocaleString("tr-TR")}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[bet.status]?.variant ?? "secondary"}>
                        {statusMap[bet.status]?.label ?? bet.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(bet.created_at).toLocaleString("tr-TR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Son Ödeme Talepleri</CardTitle>
        </CardHeader>
        <CardContent>
          {(recentPayments?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz ödeme talebi yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.profiles?.display_name ?? "—"}</TableCell>
                    <TableCell>{p.type === "deposit" ? "Yatırım" : "Çekim"}</TableCell>
                    <TableCell>₺{Number(p.amount).toLocaleString("tr-TR")}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[p.status]?.variant ?? "secondary"}>
                        {statusMap[p.status]?.label ?? p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.created_at).toLocaleString("tr-TR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
