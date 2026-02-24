import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, AlertTriangle, Megaphone, DollarSign, Trophy, CreditCard, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BET_CATEGORIES } from "@/lib/api-football";

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      setValues(map);
    }
  }, [settings]);

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.from("site_settings").upsert({ key, value });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Kaydedildi" });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const saveAll = () => {
    Object.entries(values).forEach(([key, value]) => {
      saveSetting.mutate({ key, value });
    });
  };

  const update = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const toggleBool = (key: string) => update(key, values[key] === "true" ? "false" : "true");

  if (isLoading) return <div className="p-6 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Site Ayarları</h1>
          <p className="text-muted-foreground mt-1">Genel site yapılandırmasını yönetin</p>
        </div>
        <Button onClick={saveAll}>
          <Save className="h-4 w-4 mr-2" /> Tümünü Kaydet
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Betting Limits */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" /> Bahis Limitleri
            </CardTitle>
            <CardDescription>Minimum ve maksimum bahis tutarlarını ayarlayın</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Bahis (₺)</label>
                <Input type="number" value={values.min_stake ?? ""} onChange={(e) => update("min_stake", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maksimum Bahis (₺)</label>
                <Input type="number" value={values.max_stake ?? ""} onChange={(e) => update("max_stake", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Maksimum Ödeme (₺)</label>
                <Input type="number" value={values.max_payout ?? ""} onChange={(e) => update("max_payout", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Oran</label>
                <Input type="number" step="0.01" value={values.min_odds ?? ""} onChange={(e) => update("min_odds", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blackjack Limits */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              🃏 Blackjack Limitleri
            </CardTitle>
            <CardDescription>Blackjack oyunu bahis limitlerini ve kurallarını ayarlayın</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Blackjack Aktif</p>
                <p className="text-sm text-muted-foreground">Oyunu aç/kapat</p>
              </div>
              <Switch
                checked={values.blackjack_enabled !== "false"}
                onCheckedChange={() => update("blackjack_enabled", values.blackjack_enabled === "false" ? "true" : "false")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Bahis (₺)</label>
                <Input type="number" value={values.blackjack_min_bet ?? "100"} onChange={(e) => update("blackjack_min_bet", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Bahis (₺)</label>
                <Input type="number" value={values.blackjack_max_bet ?? "10000"} onChange={(e) => update("blackjack_max_bet", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">BJ Ödemesi (x)</label>
                <Input type="number" step="0.1" value={values.blackjack_payout ?? "2.5"} onChange={(e) => update("blackjack_payout", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kasa Avantajı (%)</label>
                <Input type="number" value={values.blackjack_house_edge ?? "67"} onChange={(e) => update("blackjack_house_edge", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Split İzni</p>
                <p className="text-sm text-muted-foreground">Oyuncuların el bölmesine izin ver</p>
              </div>
              <Switch
                checked={values.blackjack_allow_split !== "false"}
                onCheckedChange={() => update("blackjack_allow_split", values.blackjack_allow_split === "false" ? "true" : "false")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Double Down İzni</p>
                <p className="text-sm text-muted-foreground">Oyuncuların ikiye katlamasına izin ver</p>
              </div>
              <Switch
                checked={values.blackjack_allow_double !== "false"}
                onCheckedChange={() => update("blackjack_allow_double", values.blackjack_allow_double === "false" ? "true" : "false")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Roulette Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              🎡 Rulet Ayarları
            </CardTitle>
            <CardDescription>Rulet oyunu bahis limitlerini ve kasa avantajını ayarlayın</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Rulet Aktif</p>
                <p className="text-sm text-muted-foreground">Oyunu aç/kapat</p>
              </div>
              <Switch
                checked={values.roulette_enabled !== "false"}
                onCheckedChange={() => update("roulette_enabled", values.roulette_enabled === "false" ? "true" : "false")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Bahis (₺)</label>
                <Input type="number" value={values.roulette_min_bet ?? "10"} onChange={(e) => update("roulette_min_bet", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Bahis (₺)</label>
                <Input type="number" value={values.roulette_max_bet ?? "10000"} onChange={(e) => update("roulette_max_bet", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kasa Avantajı (%)</label>
              <Input type="number" value={values.roulette_house_edge ?? "65"} onChange={(e) => update("roulette_house_edge", e.target.value)} />
              <p className="text-xs text-muted-foreground">Örn: 65 = kasa %65 ihtimalle kazanır</p>
            </div>
          </CardContent>
        </Card>

        {/* Commission & Accumulator */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-accent" /> Komisyon & Kupon
            </CardTitle>
            <CardDescription>Komisyon oranı ve kupon limitleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Komisyon Oranı (%)</label>
                <Input type="number" value={values.commission_rate ?? ""} onChange={(e) => update("commission_rate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maks. Kupon Seçimi</label>
                <Input type="number" value={values.max_accumulator ?? ""} onChange={(e) => update("max_accumulator", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" /> Ödeme Ayarları
            </CardTitle>
            <CardDescription>Havale/EFT ve ödeme yöntemleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">IBAN ile Yatırım</p>
                <p className="text-sm text-muted-foreground">Havale/EFT yatırımını aç/kapat</p>
              </div>
              <Switch
                checked={values.iban_payments_enabled !== "false"}
                onCheckedChange={() => {
                  const newVal = values.iban_payments_enabled === "false" ? "true" : "false";
                  update("iban_payments_enabled", newVal);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Site IBAN</label>
              <Input
                value={values.site_iban ?? ""}
                onChange={(e) => update("site_iban", e.target.value)}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hesap Sahibi</label>
              <Input
                value={values.site_account_holder ?? ""}
                onChange={(e) => update("site_account_holder", e.target.value)}
                placeholder="Ad Soyad / Şirket Adı"
              />
            </div>
          </CardContent>
        </Card>

        {/* Betting Categories Toggle */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-accent" /> Bahis Kategorileri
            </CardTitle>
            <CardDescription>Kullanıcıların göreceği bahis türlerini aç/kapat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(BET_CATEGORIES).map(([key, cat]) => {
              const settingKey = `bet_category_${key}`;
              const enabled = values[settingKey] !== "false"; // default true
              return (
                <div key={key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.betIds.length} bahis türü</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => update(settingKey, enabled ? "false" : "true")}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-400" /> Bakım Modu
            </CardTitle>
            <CardDescription>Siteyi bakım moduna alın</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Bakım Modu</p>
                <p className="text-sm text-muted-foreground">Aktifken kullanıcılar bahis yapamaz</p>
              </div>
              <Switch
                checked={values.maintenance_mode === "true"}
                onCheckedChange={() => toggleBool("maintenance_mode")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-primary" /> Duyuru
            </CardTitle>
            <CardDescription>Site genelinde görünecek duyuru mesajı</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={values.announcement ?? ""}
              onChange={(e) => update("announcement", e.target.value)}
              placeholder="Duyuru mesajı yazın... (boş bırakılırsa gösterilmez)"
              rows={3}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
