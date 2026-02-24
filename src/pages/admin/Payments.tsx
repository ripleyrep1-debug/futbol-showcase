import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

const Payments = () => (
  <div className="p-6 space-y-6">
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Ödemeler</h1>
      <p className="text-muted-foreground mt-1">Ödeme işlemlerini yönetin</p>
    </div>
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-accent" />
          Ödeme Geçmişi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Ödeme yönetimi yakında aktif olacak.</p>
      </CardContent>
    </Card>
  </div>
);

export default Payments;
