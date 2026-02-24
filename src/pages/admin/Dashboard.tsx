import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, TrendingUp, Wallet } from "lucide-react";

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profilesRes, betsRes, todayTxRes, balanceRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("bets").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("transactions")
          .select("amount")
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("profiles").select("balance"),
      ]);

      const dailyVolume = (todayTxRes.data ?? []).reduce(
        (sum, t) => sum + Math.abs(Number(t.amount)),
        0
      );
      const totalBalance = (balanceRes.data ?? []).reduce(
        (sum, p) => sum + Number(p.balance),
        0
      );

      return {
        totalUsers: profilesRes.count ?? 0,
        activeBets: betsRes.count ?? 0,
        dailyVolume,
        totalBalance,
      };
    },
  });

  const cards = [
    {
      title: "Toplam Kullanıcı",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Aktif Bahisler",
      value: stats?.activeBets ?? 0,
      icon: Trophy,
      color: "text-accent",
    },
    {
      title: "Günlük Hacim",
      value: `₺${(stats?.dailyVolume ?? 0).toLocaleString("tr-TR")}`,
      icon: TrendingUp,
      color: "text-green-400",
    },
    {
      title: "Toplam Bakiye",
      value: `₺${(stats?.totalBalance ?? 0).toLocaleString("tr-TR")}`,
      icon: Wallet,
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Genel Bakış</h1>
        <p className="text-muted-foreground mt-1">Admin paneli özet bilgileri</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? "..." : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Son İşlemler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Henüz işlem bulunmuyor. Kullanıcılar bahis yaptıkça burada görünecektir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
