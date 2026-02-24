import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  time: string;
}

const AUTO_REPLIES: Record<string, string> = {
  merhaba: "Merhaba! BlueBet'e hoş geldiniz. Size nasıl yardımcı olabilirim?",
  para: "Para yatırma ve çekme işlemleri hakkında bilgi almak isterseniz, lütfen hesabınıza giriş yapın ve 'Para Yatır' butonunu kullanın.",
  bahis: "Bahis yapmak için ana sayfadaki maç listesinden bir oran seçerek kuponunuza ekleyebilirsiniz.",
  hesap: "Hesap sorunları için destek@bluebet.app adresine e-posta gönderebilirsiniz.",
  oran: "Oranlarımız anlık olarak güncellenmektedir. Canlı maçlarda oranlar sürekli değişebilir.",
};

const getAutoReply = (text: string): string => {
  const lower = text.toLowerCase();
  for (const [key, reply] of Object.entries(AUTO_REPLIES)) {
    if (lower.includes(key)) return reply;
  }
  return "Teşekkürler! Mesajınız alındı. Bir temsilcimiz en kısa sürede size yardımcı olacaktır. Acil konular için destek@bluebet.app adresine yazabilirsiniz.";
};

const now = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const LiveSupportChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: "Merhaba! BlueBet canlı destek hattına hoş geldiniz. Size nasıl yardımcı olabilirim?", isBot: true, time: now() },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), text: input.trim(), isBot: false, time: now() };
    setMessages((prev) => [...prev, userMsg]);
    const reply = getAutoReply(input);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: reply, isBot: true, time: now() }]);
    }, 800);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 sm:bottom-6 sm:right-6 bg-primary text-primary-foreground rounded-full p-3.5 shadow-lg hover:scale-105 transition-transform"
          aria-label="Canlı Destek"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-16 right-2 z-50 sm:bottom-6 sm:right-6 w-[calc(100vw-16px)] max-w-sm bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "min(480px, 70vh)" }}>
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary-foreground" />
              <div>
                <p className="text-sm font-bold text-primary-foreground">Canlı Destek</p>
                <p className="text-xs text-primary-foreground/70">Çevrimiçi</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.isBot ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.isBot ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.isBot ? "text-muted-foreground" : "text-primary-foreground/60"}`}>{m.time}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-2 flex gap-2 shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Mesajınızı yazın..."
              className="text-sm"
            />
            <Button size="icon" onClick={send} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveSupportChat;
