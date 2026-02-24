import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import bluebetLogo from "@/assets/bluebet-logo-new.png";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      toast({ title: "Hata", description: "Kullanıcı adı en az 3 karakter olmalı.", variant: "destructive" });
      return;
    }
    setLoading(true);
    // Use username as a fake email for auth (username@bluebet.local)
    const fakeEmail = `${username.trim().toLowerCase()}@bluebet.local`;
    const { error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: {
        data: { display_name: username.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Kayıt Hatası", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Hesap oluşturuldu!" });
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
            BLUE<span className="text-accent">BET</span> Kayıt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Kullanıcı Adı</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kullanıcı adınız"
                minLength={3}
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
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Zaten hesabınız var mı?{" "}
              <Link to="/giris" className="text-primary hover:underline">Giriş Yap</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
