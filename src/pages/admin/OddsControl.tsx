import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Edit, Trash2, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchTodaysFixtures,
  fetchOddsByFixture,
  type ApiFixture,
  type ApiOddsBet,
  getBetTypeName,
  translateValue,
  POPULAR_LEAGUES,
} from "@/lib/api-football";

const OddsControl = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedFixture, setSelectedFixture] = useState<ApiFixture | null>(null);
  const [editingOdd, setEditingOdd] = useState<{ fixture: ApiFixture; betName: string; value: string; originalOdd: string } | null>(null);
  const [customOddValue, setCustomOddValue] = useState("");

  // Fetch today's fixtures
  const { data: fixtures, isLoading: fixturesLoading } = useQuery({
    queryKey: ["admin-fixtures-today"],
    queryFn: fetchTodaysFixtures,
    staleTime: 60000,
  });

  // Fetch odds for selected fixture
  const { data: fixtureOdds, isLoading: oddsLoading } = useQuery({
    queryKey: ["admin-fixture-odds", selectedFixture?.fixture.id],
    queryFn: () => fetchOddsByFixture(selectedFixture!.fixture.id),
    enabled: !!selectedFixture,
    staleTime: 60000,
  });

  // Fetch existing overrides
  const { data: overrides } = useQuery({
    queryKey: ["admin-odds-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("odds_overrides")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Filter bettable fixtures (not finished)
  const bettableFixtures = useMemo(() => {
    if (!fixtures) return [];
    const filtered = fixtures.filter((f) => {
      const status = f.fixture.status.short;
      return !["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO", "PST"].includes(status);
    });
    // Sort: popular leagues first, then by time
    return filtered.sort((a, b) => {
      const aPopular = POPULAR_LEAGUES.includes(a.league.id) ? 0 : 1;
      const bPopular = POPULAR_LEAGUES.includes(b.league.id) ? 0 : 1;
      if (aPopular !== bPopular) return aPopular - bPopular;
      return a.fixture.timestamp - b.fixture.timestamp;
    });
  }, [fixtures]);

  // Search filter
  const displayedFixtures = useMemo(() => {
    if (!search.trim()) return bettableFixtures;
    const q = search.toLowerCase();
    return bettableFixtures.filter(
      (f) =>
        f.teams.home.name.toLowerCase().includes(q) ||
        f.teams.away.name.toLowerCase().includes(q) ||
        f.league.name.toLowerCase().includes(q) ||
        f.league.country.toLowerCase().includes(q)
    );
  }, [bettableFixtures, search]);

  // Group by league
  const groupedFixtures = useMemo(() => {
    const groups: Record<string, { league: ApiFixture["league"]; fixtures: ApiFixture[] }> = {};
    displayedFixtures.forEach((f) => {
      const key = `${f.league.id}-${f.league.name}`;
      if (!groups[key]) groups[key] = { league: f.league, fixtures: [] };
      groups[key].fixtures.push(f);
    });
    return Object.values(groups);
  }, [displayedFixtures]);

  // Get odds from bookmaker response
  const bets: ApiOddsBet[] = useMemo(() => {
    if (!fixtureOdds || fixtureOdds.length === 0) return [];
    const bookmaker = fixtureOdds[0]?.bookmakers?.[0];
    return bookmaker?.bets ?? [];
  }, [fixtureOdds]);

  // Check if an override exists
  const getOverride = (fixtureId: number, betType: string, betValue: string) => {
    return overrides?.find(
      (o: any) => o.fixture_id === fixtureId && o.bet_type === betType && o.bet_value === betValue
    );
  };

  // Save override
  const saveOverride = useMutation({
    mutationFn: async () => {
      if (!editingOdd || !customOddValue) return;
      const existing = getOverride(
        editingOdd.fixture.fixture.id,
        editingOdd.betName,
        editingOdd.value
      );
      if (existing) {
        const { error } = await supabase
          .from("odds_overrides")
          .update({ custom_odd: Number(customOddValue) })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("odds_overrides").insert({
          fixture_id: editingOdd.fixture.fixture.id,
          league_name: editingOdd.fixture.league.name,
          home_team: editingOdd.fixture.teams.home.name,
          away_team: editingOdd.fixture.teams.away.name,
          bet_type: editingOdd.betName,
          bet_value: editingOdd.value,
          custom_odd: Number(customOddValue),
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-odds-overrides"] });
      setEditingOdd(null);
      setCustomOddValue("");
      toast({ title: "Başarılı", description: "Oran güncellendi." });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("odds_overrides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-odds-overrides"] });
      toast({ title: "Silindi" });
    },
  });

  const getStatusBadge = (status: string) => {
    if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(status))
      return <Badge className="bg-green-600 text-white animate-pulse">CANLI</Badge>;
    if (status === "NS")
      return <Badge variant="secondary">Başlamadı</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Oran Yönetimi</h1>
        <p className="text-muted-foreground mt-1">Bugünkü maçların oranlarını görüntüle ve düzenle</p>
      </div>

      <Tabs defaultValue="matches" className="w-full">
        <TabsList>
          <TabsTrigger value="matches">Maçlar & Oranlar</TabsTrigger>
          <TabsTrigger value="overrides">Aktif Overridelar ({overrides?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* === MATCHES TAB === */}
        <TabsContent value="matches" className="space-y-4">
          {!selectedFixture ? (
            <>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Takım, lig veya ülke ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {fixturesLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Maçlar yükleniyor...
                </div>
              ) : displayedFixtures.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Bahis yapılabilir maç bulunamadı.</CardContent></Card>
              ) : (
                groupedFixtures.map((group) => (
                  <Card key={group.league.id} className="border-border">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {group.league.logo && <img src={group.league.logo} alt="" className="h-5 w-5" />}
                        {group.league.flag && <img src={group.league.flag} alt="" className="h-4 w-5" />}
                        <CardTitle className="text-sm font-semibold">{group.league.country} — {group.league.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Saat</TableHead>
                            <TableHead className="w-20">Durum</TableHead>
                            <TableHead>Ev Sahibi</TableHead>
                            <TableHead className="w-12 text-center">Skor</TableHead>
                            <TableHead>Deplasman</TableHead>
                            <TableHead className="w-20 text-center">Override</TableHead>
                            <TableHead className="w-24 text-right">İşlem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.fixtures.map((f) => {
                            const overrideCount = overrides?.filter((o: any) => o.fixture_id === f.fixture.id).length ?? 0;
                            return (
                              <TableRow key={f.fixture.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedFixture(f)}>
                                <TableCell className="font-mono text-sm">{formatTime(f.fixture.date)}</TableCell>
                                <TableCell>{getStatusBadge(f.fixture.status.short)}</TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <img src={f.teams.home.logo} alt="" className="h-5 w-5" />
                                    {f.teams.home.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                  {f.goals.home !== null ? `${f.goals.home}-${f.goals.away}` : "-"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <img src={f.teams.away.logo} alt="" className="h-5 w-5" />
                                    {f.teams.away.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {overrideCount > 0 && <Badge variant="default">{overrideCount}</Badge>}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedFixture(f); }}>
                                    Oranlar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          ) : (
            /* === FIXTURE DETAIL VIEW === */
            <div className="space-y-4">
              <Button variant="outline" onClick={() => setSelectedFixture(null)}>← Maçlara Dön</Button>

              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedFixture.league.logo && <img src={selectedFixture.league.logo} alt="" className="h-6 w-6" />}
                      <div>
                        <CardTitle className="text-lg">
                          {selectedFixture.teams.home.name} vs {selectedFixture.teams.away.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {selectedFixture.league.country} — {selectedFixture.league.name} • {formatTime(selectedFixture.fixture.date)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(selectedFixture.fixture.status.short)}
                  </div>
                </CardHeader>
                <CardContent>
                  {oddsLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Oranlar yükleniyor...
                    </div>
                  ) : bets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Bu maç için oran bulunamadı.</p>
                  ) : (
                    <div className="space-y-4">
                      {bets.map((bet) => (
                        <div key={bet.id} className="border border-border rounded-lg p-3">
                          <h4 className="font-semibold text-sm mb-2">{getBetTypeName(bet.id, bet.name)}</h4>
                          <div className="flex flex-wrap gap-2">
                            {bet.values.map((v, vi) => {
                              const override = getOverride(selectedFixture.fixture.id, bet.name, v.value);
                              return (
                                <button
                                  key={vi}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm transition-colors ${
                                    override
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => {
                                    setEditingOdd({
                                      fixture: selectedFixture,
                                      betName: bet.name,
                                      value: v.value,
                                      originalOdd: v.odd,
                                    });
                                    setCustomOddValue(override ? String(override.custom_odd) : v.odd);
                                  }}
                                >
                                  <span className="text-muted-foreground">{translateValue(v.value)}</span>
                                  <span className="font-bold">
                                    {override ? (
                                      <>
                                        <span className="line-through text-muted-foreground mr-1">{Number(v.odd).toFixed(2)}</span>
                                        <span className="text-primary">{Number(override.custom_odd).toFixed(2)}</span>
                                      </>
                                    ) : (
                                      Number(v.odd).toFixed(2)
                                    )}
                                  </span>
                                  <Edit className="h-3 w-3 text-muted-foreground" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* === OVERRIDES TAB === */}
        <TabsContent value="overrides">
          <Card className="border-border">
            <CardContent className="pt-6">
              {(overrides ?? []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aktif override yok</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Maç</TableHead>
                      <TableHead>Lig</TableHead>
                      <TableHead>Bahis</TableHead>
                      <TableHead>Değer</TableHead>
                      <TableHead>Özel Oran</TableHead>
                      <TableHead className="text-right">Sil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overrides ?? []).map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.home_team} vs {o.away_team}</TableCell>
                        <TableCell>{o.league_name || "—"}</TableCell>
                        <TableCell>{o.bet_type}</TableCell>
                        <TableCell>{o.bet_value || "—"}</TableCell>
                        <TableCell className="font-bold text-primary">{Number(o.custom_odd).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="destructive" onClick={() => deleteOverride.mutate(o.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Odd Modal */}
      <Dialog open={!!editingOdd} onOpenChange={(open) => !open && setEditingOdd(null)}>
        <DialogContent className="border-border bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Oran Düzenle</DialogTitle>
          </DialogHeader>
          {editingOdd && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{editingOdd.fixture.teams.home.name} vs {editingOdd.fixture.teams.away.name}</p>
                <p>{editingOdd.betName} — {translateValue(editingOdd.value)}</p>
                <p>API Oranı: <span className="font-bold">{Number(editingOdd.originalOdd).toFixed(2)}</span></p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Özel Oran</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={customOddValue}
                  onChange={(e) => setCustomOddValue(e.target.value)}
                  placeholder="1.85"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {editingOdd && getOverride(editingOdd.fixture.fixture.id, editingOdd.betName, editingOdd.value) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const ov = getOverride(editingOdd.fixture.fixture.id, editingOdd.betName, editingOdd.value);
                  if (ov) deleteOverride.mutate(ov.id);
                  setEditingOdd(null);
                }}
              >
                Sil
              </Button>
            )}
            <Button onClick={() => saveOverride.mutate()} disabled={!customOddValue || saveOverride.isPending}>
              {saveOverride.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OddsControl;
