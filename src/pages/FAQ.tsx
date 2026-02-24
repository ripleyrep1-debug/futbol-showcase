import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    q: "BlueBet nedir?",
    a: "BlueBet, canlı oranlar ve anlık skorlar sunan güvenilir bir bahis platformudur. En popüler futbol liglerinden maçlara bahis yapabilirsiniz.",
  },
  {
    q: "Nasıl hesap oluşturabilirim?",
    a: "Ana sayfadaki 'Kayıt Ol' butonuna tıklayarak e-posta adresiniz ve şifrenizle kolayca hesap oluşturabilirsiniz.",
  },
  {
    q: "Para yatırma ve çekme nasıl yapılır?",
    a: "Hesabınıza giriş yaptıktan sonra 'Para Yatır' butonuna tıklayarak bakiye ekleyebilirsiniz. Para çekme işlemleri için profil menüsünden talepte bulunabilirsiniz.",
  },
  {
    q: "Minimum ve maksimum bahis tutarları nedir?",
    a: "Minimum bahis tutarı 1 TL, maksimum bahis tutarı ise 10.000 TL'dir. Bu limitler site ayarlarından kontrol edilmektedir.",
  },
  {
    q: "Canlı bahis nasıl yapılır?",
    a: "Canlı maçlar bölümünden devam eden maçları görebilir ve anlık değişen oranlara bahis yapabilirsiniz.",
  },
  {
    q: "Kombine bahis nedir?",
    a: "Birden fazla maçı tek bir kupona ekleyerek kombine bahis yapabilirsiniz. Oranlar çarpılarak toplam oran hesaplanır.",
  },
  {
    q: "Hesabım neden askıya alındı?",
    a: "Hesap güvenliği veya kural ihlali durumlarında hesaplar geçici olarak askıya alınabilir. Destek ekibimizle iletişime geçerek detaylı bilgi alabilirsiniz.",
  },
  {
    q: "Bahis sonuçları ne zaman açıklanır?",
    a: "Bahis sonuçları, maçın resmi olarak sona ermesinden sonra birkaç dakika içinde otomatik olarak güncellenir.",
  },
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Sıkça Sorulan Sorular</h1>
        <p className="text-muted-foreground mb-8">En çok merak edilen soruların cevapları</p>
        
        <Accordion type="single" collapsible className="space-y-2">
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border rounded-lg px-4">
              <AccordionTrigger className="text-foreground text-left font-medium hover:text-primary">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
