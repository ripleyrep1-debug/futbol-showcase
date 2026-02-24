import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail, MessageCircle, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.");
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">İletişim</h1>
        <p className="text-muted-foreground mb-8">Size nasıl yardımcı olabiliriz?</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-5">
              <h2 className="font-display text-lg font-bold text-foreground">İletişim Bilgileri</h2>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">E-posta</p>
                  <p className="text-sm text-muted-foreground">destek@bluebet.app</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Canlı Destek</p>
                  <p className="text-sm text-muted-foreground">Sağ alttaki sohbet butonunu kullanın</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Çalışma Saatleri</p>
                  <p className="text-sm text-muted-foreground">7/24 destek hizmeti</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Bize Yazın</h2>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Ad Soyad</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız" required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">E-posta</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com" required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Mesajınız</label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mesajınızı buraya yazın..." rows={4} required />
            </div>
            <Button type="submit" className="w-full">Gönder</Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
