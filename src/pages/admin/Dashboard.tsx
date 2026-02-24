import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Trophy, TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle,
  CheckCircle, XCircle, DollarSign, Percent,
} from "lucide-react";

const PIE_COLORS = ["hsl(205, 85%, 50%)", "hsl(120, 60%, 50%)", "hsl(0, 84%, 60%)", "hsl(45, 90%, 55%)"];

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

  // Chart data: last 7 days revenue
  const { data: chartData } = useQuery({
    queryKey: ["admin-dashboard-chart"],
    queryFn: async () => {
      const { data: txs } = await supabase.from("transactions").select("amount, type, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      const { data: bets } = await supabase.from("bets").select("status, created_at");

      // Daily revenue
      const dailyMap: Record<string, { deposits: number; withdrawals: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dailyMap[d.toISOString().split("T")[0]] = { deposits: 0, withdrawals: 0 };
      }
      (txs ?? []).forEach((tx: any) => {
        const day = tx.created_at.split("T")[0];
        if (dailyMap[day]) {
          if (tx.type === "deposit") dailyMap[day].deposits += Number(tx.amount);
          else if (tx.type === "withdrawal") dailyMap[day].withdrawals += Math.abs(Number(tx.amount));
        }
      });
      const revenueData = Object.entries(dailyMap).map(([date, v]) => ({
        date: new Date(date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        ...v,
      }));

      // Bet pie
      const sc: Record<string, number> = { pending: 0, won: 0, lost: 0, cancelled: 0 };
      (bets ?? []).forEach((b: any) => { sc[b.status] = (sc[b.status] || 0) + 1; });
      const pieData = [
        { name: "Bekleyen", value: sc.pending },
        { name: "Kazanan", value: sc.won },
        { name: "Kaybeden", value: sc.lost },
        { name: "İptal", value: sc.cancelled },
      ].filter((d) => d.value > 0);

      return { revenueData, pieData };
    },
  });

  // Recent bets
  const { data: recentBets } = useQuery({
    queryKey: ["admin-recent-bets"],
    queryFn: async () => {
      const { data: bets } = await supabase.from("bets").select("*").order("created_at", { ascending: false }).limit(8);
      if (!bets || bets.length === 0) return [];
      const userIds = [...new Set(bets.map((b) => b.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      return bets.map((b) => ({ ...b, display_name: nameMap.get(b.user_id) ?? "—" }));
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => {
      const { data: payments } = await supabase.from("payment_requests").select("*").order("created_at", { ascending: false }).limit(8);
      if (!payments || payments.length === 0) return [];
      const userIds = [...new Set(payments.map((p) => p.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      return payments.map((p) => ({ ...p, display_name: nameMap.get(p.user_id) ?? "—" }));
    },
  });

  const cards = [
    { title: "Toplam Kullanıcı", value: stats?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { title: "Aktif Bahisler", value: stats?.activeBets ?? 0, icon: Trophy, color: "text-accent" },
    { title: "Kazanan", value: stats?.wonBets ?? 0, icon: CheckCircle, color: "text-green-400" },
    { title: "Kaybeden", value: stats?.lostBets ?? 0, icon: XCircle, color: "text-destructive" },
    { title: "Yatırımlar", value: `₺${(stats?.totalDeposits ?? 0).toLocaleString("tr-TR")}`, icon: ArrowDownCircle, color: "text-green-400" },
    { title: "Çekimler", value: `₺${(stats?.totalWithdrawals ?? 0).toLocaleString("tr-TR")}`, icon: ArrowUpCircle, color: "text-orange-400" },
    { title: "Kâr / Zarar", value: `₺${(stats?.profit ?? 0).toLocaleString("tr-TR")}`, icon: Percent, color: (stats?.profit ?? 0) >= 0 ? "text-green-400" : "text-destructive" },
    { title: "Günlük Hacim", value: `₺${(stats?.dailyVolume ?? 0).toLocaleString("tr-TR")}`, icon: TrendingUp, color: "text-primary" },
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
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Genel Bakış</h1>
        <p className="text-muted-foreground mt-1">Admin paneli özet bilgileri</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{isLoading ? "..." : card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Son 7 Gün Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData?.revenueData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 18%)" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(215, 40%, 10%)", border: "1px solid hsl(215, 25%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }} />
                  <Area type="monotone" dataKey="deposits" name="Yatırım" stroke="hsl(120, 60%, 50%)" fill="hsl(120, 60%, 50%)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="withdrawals" name="Çekim" stroke="hsl(30, 80%, 55%)" fill="hsl(30, 80%, 55%)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Bahis Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData?.pieData ?? []} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}>
                    {(chartData?.pieData ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(215, 40%, 10%)", border: "1px solid hsl(215, 25%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
                    <TableCell className="font-medium">{bet.display_name}</TableCell>
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
                    <TableCell className="font-medium">{p.display_name}</TableCell>
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
