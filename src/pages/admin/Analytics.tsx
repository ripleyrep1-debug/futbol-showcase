import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

const COLORS = ["hsl(205, 85%, 50%)", "hsl(200, 100%, 60%)", "hsl(0, 84%, 60%)", "hsl(45, 90%, 55%)"];

const Analytics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [txRes, betsRes, profilesRes] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: true }),
        supabase.from("bets").select("stake, potential_win, status, created_at"),
        supabase.from("profiles").select("balance"),
      ]);

      const txs = txRes.data ?? [];
      const bets = betsRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      // Daily revenue for last 30 days
      const dailyMap: Record<string, { date: string; deposits: number; withdrawals: number; profit: number }> = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dailyMap[key] = { date: key, deposits: 0, withdrawals: 0, profit: 0 };
      }

      txs.forEach((tx: any) => {
        const day = tx.created_at.split("T")[0];
        if (dailyMap[day]) {
          if (tx.type === "deposit") dailyMap[day].deposits += Number(tx.amount);
          else if (tx.type === "withdrawal") dailyMap[day].withdrawals += Math.abs(Number(tx.amount));
        }
      });

      const revenueData = Object.values(dailyMap).map((d) => ({
        ...d,
        profit: d.deposits - d.withdrawals,
        displayDate: new Date(d.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      }));

      // Bet status distribution
      const statusCounts: Record<string, number> = { pending: 0, won: 0, lost: 0, cancelled: 0 };
      bets.forEach((b: any) => { statusCounts[b.status] = (statusCounts[b.status] || 0) + 1; });
      const betStatusData = [
        { name: "Bekleyen", value: statusCounts.pending },
        { name: "Kazanan", value: statusCounts.won },
        { name: "Kaybeden", value: statusCounts.lost },
        { name: "İptal", value: statusCounts.cancelled },
      ].filter((d) => d.value > 0);

      // Daily bet volume (last 14 days)
      const betDailyMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        betDailyMap[d.toISOString().split("T")[0]] = 0;
      }
      bets.forEach((b: any) => {
        const day = b.created_at.split("T")[0];
        if (betDailyMap[day] !== undefined) betDailyMap[day]++;
      });
      const betVolumeData = Object.entries(betDailyMap).map(([date, count]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        count,
      }));

      // Top stats
      const totalDeposits = txs.filter((t: any) => t.type === "deposit").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const totalWithdrawals = txs.filter((t: any) => t.type === "withdrawal").reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
      const totalWonPayout = bets.filter((b: any) => b.status === "won").reduce((s: number, b: any) => s + Number(b.potential_win), 0);
      const totalLostStakes = bets.filter((b: any) => b.status === "lost").reduce((s: number, b: any) => s + Number(b.stake), 0);
      const netRevenue = totalDeposits - totalWithdrawals;
      const bettingProfit = totalLostStakes - totalWonPayout;
      const totalBalance = profiles.reduce((s: number, p: any) => s + Number(p.balance), 0);

      return { revenueData, betStatusData, betVolumeData, totalDeposits, totalWithdrawals, netRevenue, bettingProfit, totalBalance, totalBets: bets.length };
    },
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  const summaryCards = [
    { title: "Toplam Yatırımlar", value: `₺${(data?.totalDeposits ?? 0).toLocaleString("tr-TR")}`, icon: TrendingUp, color: "text-green-400" },
    { title: "Toplam Çekimler", value: `₺${(data?.totalWithdrawals ?? 0).toLocaleString("tr-TR")}`, icon: TrendingDown, color: "text-orange-400" },
    { title: "Net Gelir", value: `₺${(data?.netRevenue ?? 0).toLocaleString("tr-TR")}`, icon: DollarSign, color: (data?.netRevenue ?? 0) >= 0 ? "text-green-400" : "text-destructive" },
    { title: "Bahis Kârı", value: `₺${(data?.bettingProfit ?? 0).toLocaleString("tr-TR")}`, icon: Percent, color: (data?.bettingProfit ?? 0) >= 0 ? "text-green-400" : "text-destructive" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Gelir & Analiz</h1>
        <p className="text-muted-foreground mt-1">Detaylı finansal analiz ve trendler</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Yatırım vs Çekim (Son 30 Gün)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 18%)" />
                <XAxis dataKey="displayDate" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(215, 40%, 10%)", border: "1px solid hsl(215, 25%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }} />
                <Area type="monotone" dataKey="deposits" name="Yatırım" stroke="hsl(120, 60%, 50%)" fill="hsl(120, 60%, 50%)" fillOpacity={0.2} />
                <Area type="monotone" dataKey="withdrawals" name="Çekim" stroke="hsl(30, 80%, 55%)" fill="hsl(30, 80%, 55%)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bet Volume */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Bahis Hacmi (Son 14 Gün)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.betVolumeData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 25%, 18%)" />
                  <XAxis dataKey="displayDate" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(215, 40%, 10%)", border: "1px solid hsl(215, 25%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }} />
                  <Bar dataKey="count" name="Bahis Sayısı" fill="hsl(205, 85%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bet Status Distribution */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Bahis Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.betStatusData ?? []} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}>
                    {(data?.betStatusData ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(215, 40%, 10%)", border: "1px solid hsl(215, 25%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 95%)" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
