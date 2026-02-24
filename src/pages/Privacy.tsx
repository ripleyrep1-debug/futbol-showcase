import Header from "@/components/Header";
import Footer from "@/components/Footer";

const sections = [
  {
    title: "1. Toplanan Bilgiler",
    content: "Kayıt sırasında ad, e-posta adresi ve şifre bilgilerinizi toplarız. Ayrıca site kullanımınıza ilişkin anonim analitik verileri toplanabilir.",
  },
  {
    title: "2. Bilgilerin Kullanımı",
    content: "Kişisel bilgileriniz hesap yönetimi, müşteri desteği ve yasal yükümlülükler için kullanılır. Bilgileriniz pazarlama amacıyla üçüncü taraflarla paylaşılmaz.",
  },
  {
    title: "3. Veri Güvenliği",
    content: "Tüm kişisel veriler SSL şifreleme ile korunmaktadır. Şifreleme, güvenlik duvarları ve erişim kontrolü gibi endüstri standardı önlemler kullanılmaktadır.",
  },
  {
    title: "4. Çerezler",
    content: "Sitemiz oturum yönetimi ve kullanıcı deneyimini iyileştirmek amacıyla çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerezleri kontrol edebilirsiniz.",
  },
  {
    title: "5. Üçüncü Taraf Hizmetler",
    content: "Ödeme işlemleri ve analitik için güvenilir üçüncü taraf hizmet sağlayıcıları kullanılabilir. Bu sağlayıcılar kendi gizlilik politikalarına tabidir.",
  },
  {
    title: "6. Kullanıcı Hakları",
    content: "Kişisel verilerinize erişim, düzeltme veya silme talep etme hakkına sahipsiniz. Bu talepler için destek@bluebet.app adresine yazabilirsiniz.",
  },
  {
    title: "7. Politika Güncellemeleri",
    content: "Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler e-posta yoluyla bildirilecektir.",
  },
];

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Gizlilik Politikası</h1>
        <p className="text-muted-foreground mb-8">Kişisel verilerinizin nasıl korunduğunu öğrenin</p>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
