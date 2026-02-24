import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => (
  <div className="p-6 space-y-6">
    <div>
      <h1 className="text-3xl font-display font-bold text-foreground">Site Ayarları</h1>
      <p className="text-muted-foreground mt-1">Genel site ayarlarını yapılandırın</p>
    </div>
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-accent" />
          Ayarlar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Site ayarları yakında aktif olacak.</p>
      </CardContent>
    </Card>
  </div>
);

export default Settings;
