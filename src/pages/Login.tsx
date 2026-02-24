import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fakeEmail = `${username.trim().toLowerCase()}@bluebet.local`;
    const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
    setLoading(false);
    if (error) {
      toast({ title: "Giriş Hatası", description: "Kullanıcı adı veya şifre hatalı.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Giriş yapıldı!" });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={bluebetLogo} alt="BlueBet" className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-display text-primary">
            BLUE<span className="text-accent">BET</span> Giriş
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Kullanıcı Adı</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınız"
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
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Hesabınız yok mu?{" "}
              <Link to="/kayit" className="text-primary hover:underline">Kayıt Ol</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
