import Header from "@/components/Header";
import Footer from "@/components/Footer";

const sections = [
  {
    title: "1. Genel Kurallar",
    content: [
      "Siteye kayıt olabilmek için 18 yaşından büyük olmanız gerekmektedir.",
      "Her kullanıcı yalnızca bir hesap açabilir. Birden fazla hesap tespit edildiğinde tüm hesaplar kapatılabilir.",
      "Kullanıcılar doğru ve güncel kişisel bilgiler sağlamakla yükümlüdür.",
      "BlueBet, herhangi bir zamanda kuralları güncelleme hakkını saklı tutar.",
    ],
  },
  {
    title: "2. Bahis Kuralları",
    content: [
      "Bahisler, maçın resmi sonucuna göre değerlendirilir.",
      "Ertelenen veya iptal edilen maçlardaki bahisler iptal edilir ve bakiye iade edilir.",
      "Canlı bahislerde oranlar anlık olarak değişebilir; bahis onaylanmadan önce oran değişebilir.",
      "Kombine bahislerde bir maçın iptali durumunda, o maçın oranı 1.00 olarak hesaplanır.",
      "Minimum bahis tutarı 1 TL, maksimum bahis tutarı 10.000 TL'dir.",
    ],
  },
  {
    title: "3. Para Yatırma ve Çekme",
    content: [
      "Para yatırma işlemleri anında hesaba yansır.",
      "Para çekme talepleri 24 saat içinde işleme alınır.",
      "Minimum para çekme tutarı 50 TL'dir.",
      "Para çekme işlemlerinde kimlik doğrulaması istenebilir.",
    ],
  },
  {
    title: "4. Hesap Güvenliği",
    content: [
      "Kullanıcılar hesap bilgilerinin güvenliğinden sorumludur.",
      "Şüpheli aktivite tespit edildiğinde hesap geçici olarak dondurulabilir.",
      "Şifrenizi düzenli olarak değiştirmenizi öneririz.",
    ],
  },
  {
    title: "5. Sorumlu Oyun",
    content: [
      "Bahis bir eğlence aracıdır, gelir kaynağı olarak görülmemelidir.",
      "Kaybetmeyi göze alabileceğinizden fazlasını bahse koymayınız.",
      "Bahis bağımlılığı durumunda profesyonel yardım almanızı öneriyoruz.",
    ],
  },
];

const Rules = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Kurallar ve Koşullar</h1>
        <p className="text-muted-foreground mb-8">BlueBet kullanım şartları</p>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.content.map((item, j) => (
                  <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Rules;
