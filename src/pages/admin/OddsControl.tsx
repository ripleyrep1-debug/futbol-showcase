import { useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OddsControl = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({
    fixture_id: "",
    league_name: "",
    home_team: "",
    away_team: "",
    bet_type: "",
    bet_value: "",
    custom_odd: "",
  });

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["admin-odds-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("odds_overrides")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addOverride = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("odds_overrides").insert({
        fixture_id: Number(form.fixture_id),
        league_name: form.league_name || null,
        home_team: form.home_team || null,
        away_team: form.away_team || null,
        bet_type: form.bet_type,
        bet_value: form.bet_value || null,
        custom_odd: Number(form.custom_odd),
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-odds-overrides"] });
      setAddModal(false);
      setForm({ fixture_id: "", league_name: "", home_team: "", away_team: "", bet_type: "", bet_value: "", custom_odd: "" });
      toast({ title: "Başarılı", description: "Oran eklendi." });
    },
    onError: (err: Error) => toast({ title: "Hata", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("odds_overrides").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-odds-overrides"] }),
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Oran Yönetimi</h1>
          <p className="text-muted-foreground mt-1">API oranlarını özel oranlarla geçersiz kılın</p>
        </div>
        <Button onClick={() => setAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Oran Ekle
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Özel Oranlar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Maç ID</TableHead>
                    <TableHead>Lig</TableHead>
                    <TableHead>Maç</TableHead>
                    <TableHead>Bahis Türü</TableHead>
                    <TableHead>Değer</TableHead>
                    <TableHead>Özel Oran</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overrides ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Özel oran yok</TableCell></TableRow>
                  ) : (
                    (overrides ?? []).map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-sm">{o.fixture_id}</TableCell>
                        <TableCell>{o.league_name || "—"}</TableCell>
                        <TableCell>{o.home_team && o.away_team ? `${o.home_team} vs ${o.away_team}` : "—"}</TableCell>
                        <TableCell>{o.bet_type}</TableCell>
                        <TableCell>{o.bet_value || "—"}</TableCell>
                        <TableCell className="font-bold text-primary">{Number(o.custom_odd).toFixed(2)}</TableCell>
                        <TableCell>
                          <Switch checked={o.is_active} onCheckedChange={(checked) => toggleActive.mutate({ id: o.id, is_active: checked })} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="destructive" onClick={() => deleteOverride.mutate(o.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Override Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>Özel Oran Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Maç ID (Fixture)</label>
                <Input type="number" value={form.fixture_id} onChange={(e) => setForm({ ...form, fixture_id: e.target.value })} placeholder="123456" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lig Adı</label>
                <Input value={form.league_name} onChange={(e) => setForm({ ...form, league_name: e.target.value })} placeholder="Süper Lig" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ev Sahibi</label>
                <Input value={form.home_team} onChange={(e) => setForm({ ...form, home_team: e.target.value })} placeholder="Takım A" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deplasman</label>
                <Input value={form.away_team} onChange={(e) => setForm({ ...form, away_team: e.target.value })} placeholder="Takım B" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bahis Türü</label>
                <Input value={form.bet_type} onChange={(e) => setForm({ ...form, bet_type: e.target.value })} placeholder="1X2, O/U..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Değer</label>
                <Input value={form.bet_value} onChange={(e) => setForm({ ...form, bet_value: e.target.value })} placeholder="Home, Over 2.5..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Özel Oran</label>
                <Input type="number" step="0.01" min="1" value={form.custom_odd} onChange={(e) => setForm({ ...form, custom_odd: e.target.value })} placeholder="1.85" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addOverride.mutate()} disabled={!form.fixture_id || !form.bet_type || !form.custom_odd}>
              Oran Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OddsControl;
