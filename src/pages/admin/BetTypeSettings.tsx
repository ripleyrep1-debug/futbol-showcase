import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Search, ToggleLeft, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BET_CATEGORIES, BET_TYPE_NAMES } from "@/lib/api-football";

const BetTypeSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

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
      const map: Record<string, boolean> = {};
      // Category toggles
      Object.keys(BET_CATEGORIES).forEach((key) => {
        const s = settings.find((s: any) => s.key === `bet_category_${key}`);
        map[`cat_${key}`] = s ? s.value !== "false" : true;
      });
      // Individual bet type toggles
      Object.keys(BET_TYPE_NAMES).forEach((id) => {
        const s = settings.find((s: any) => s.key === `bet_type_${id}`);
        map[`type_${id}`] = s ? s.value !== "false" : true;
      });
      setToggles(map);
    }
  }, [settings]);

  const toggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAll = useMutation({
    mutationFn: async () => {
      const upserts: { key: string; value: string }[] = [];
      Object.entries(toggles).forEach(([key, val]) => {
        if (key.startsWith("cat_")) {
          upserts.push({ key: `bet_category_${key.replace("cat_", "")}`, value: val ? "true" : "false" });
        } else if (key.startsWith("type_")) {
          upserts.push({ key: `bet_type_${key.replace("type_", "")}`, value: val ? "true" : "false" });
        }
      });
      const { error } = await supabase.from("site_settings").upsert(upserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Kaydedildi", description: "Bahis türü ayarları güncellendi." });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const enableAll = () => {
    const next = { ...toggles };
    Object.keys(next).forEach((k) => { next[k] = true; });
    setToggles(next);
  };

  const disableAll = () => {
    const next = { ...toggles };
    Object.keys(next).forEach((k) => { next[k] = false; });
    setToggles(next);
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Bahis Türleri Yönetimi</h1>
          <p className="text-muted-foreground mt-1">Bahis kategorilerini ve türlerini açıp kapatın</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={enableAll}>Tümünü Aç</Button>
          <Button variant="outline" size="sm" onClick={disableAll}>Tümünü Kapat</Button>
          <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}>
            <Save className="h-4 w-4 mr-2" /> Kaydet
          </Button>
        </div>
      </div>

      {/* Category Toggles */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-accent" /> Kategori Kontrolleri
          </CardTitle>
          <CardDescription>Kategorileri kapatmak içindeki tüm bahis türlerini devre dışı bırakır</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(BET_CATEGORIES).map(([key, cat]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.betIds.length} bahis türü</p>
                </div>
                <Switch
                  checked={toggles[`cat_${key}`] ?? true}
                  onCheckedChange={() => toggle(`cat_${key}`)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Bet Type Toggles */}
      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ToggleLeft className="h-5 w-5 text-primary" /> Bireysel Bahis Türleri
            </CardTitle>
            <CardDescription>Her bahis türünü ayrı ayrı açıp kapatın</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Bahis türü ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(BET_CATEGORIES).map(([catKey, cat]) => {
              const filteredBets = cat.betIds.filter((id) => {
                const name = BET_TYPE_NAMES[id] || `Bet #${id}`;
                return name.toLowerCase().includes(search.toLowerCase());
              });
              if (filteredBets.length === 0) return null;
              const catEnabled = toggles[`cat_${catKey}`] ?? true;

              return (
                <div key={catKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-foreground">{cat.label}</h3>
                    {!catEnabled && <Badge variant="destructive" className="text-xs">Kategori Kapalı</Badge>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredBets.map((id) => {
                      const name = BET_TYPE_NAMES[id] || `Bet #${id}`;
                      const enabled = (toggles[`type_${id}`] ?? true) && catEnabled;
                      return (
                        <div key={id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          enabled ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">#{id}</span>
                            <span className="text-sm text-foreground">{name}</span>
                          </div>
                          <Switch
                            checked={toggles[`type_${id}`] ?? true}
                            disabled={!catEnabled}
                            onCheckedChange={() => toggle(`type_${id}`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BetTypeSettings;
