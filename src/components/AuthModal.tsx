import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus } from "lucide-react";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

const AuthModal = ({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) => {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Reset when tab changes
  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "register" && username.trim().length < 3) {
      toast({ title: "Hata", description: "Kullanıcı adı en az 3 karakter olmalı.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const fakeEmail = `${username.trim().toLowerCase()}@bluebet.local`;

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
      setLoading(false);
      if (error) {
        toast({ title: "Giriş Hatası", description: "Kullanıcı adı veya şifre hatalı.", variant: "destructive" });
      } else {
        toast({ title: "Başarılı", description: "Giriş yapıldı!" });
        onOpenChange(false);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: { data: { display_name: username.trim() } },
      });
      setLoading(false);
      if (error) {
        toast({ title: "Kayıt Hatası", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Başarılı", description: "Hesap oluşturuldu!" });
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader className="text-center space-y-4 items-center">
          <img src={bluebetLogo} alt="BlueBet" className="h-12 w-12 mx-auto" />
          <DialogTitle className="text-2xl font-display text-primary">
            BLUE<span className="text-accent">BET</span>
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-secondary p-1 gap-1">
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "login"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "register"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Kullanıcı Adı</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınız"
              minLength={tab === "register" ? 3 : undefined}
              maxLength={30}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Şifre</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {tab === "login" ? (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
