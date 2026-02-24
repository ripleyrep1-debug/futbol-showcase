import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const Bets = () => (
  <div className="p-6 space-y-6">
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Bahis Yönetimi</h1>
      <p className="text-muted-foreground mt-1">Tüm bahisleri görüntüleyin ve yönetin</p>
    </div>
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Bahisler
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Bahis yönetimi yakında aktif olacak.</p>
      </CardContent>
    </Card>
  </div>
);

export default Bets;
