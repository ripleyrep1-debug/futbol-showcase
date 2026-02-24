import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  text: string;
  isAdmin: boolean;
  time: string;
}

const now = () =>
  new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const LiveSupportChat = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load or create conversation when chat opens
  const initConversation = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Check for existing open conversation
    const { data: existing } = await supabase
      .from("support_conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1);

    let convId: string;
    if (existing && existing.length > 0) {
      convId = existing[0].id;
    } else {
      const { data: created, error } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          user_name: user.user_metadata?.display_name || user.email || "Kullanıcı",
        })
        .select("id")
        .single();
      if (error || !created) {
        setLoading(false);
        return;
      }
      convId = created.id;
    }

    setConversationId(convId);

    // Load existing messages
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (msgs) {
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          text: m.message,
          isAdmin: m.sender_type === "admin" || m.sender_type === "bot",
          time: new Date(m.created_at).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
      );
    }

    setLoading(false);
  }, [user]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`support-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          // Don't duplicate own messages
          setMessages((prev) => {
            if (prev.find((msg) => msg.id === m.id)) return prev;
            return [
              ...prev,
              {
                id: m.id,
                text: m.message,
                isAdmin: m.sender_type === "admin" || m.sender_type === "bot",
                time: new Date(m.created_at).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (open && user) {
      initConversation();
    }
  }, [open, user, initConversation]);

  const send = async () => {
    if (!input.trim() || !conversationId || !user) return;
    const text = input.trim();
    setInput("");

    // Optimistic add
    const tempId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: tempId, text, isAdmin: false, time: now() },
    ]);

    await supabase.from("support_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_type: "user",
      message: text,
    });

    // Trigger AI auto-reply (fire and forget - response comes via realtime)
    supabase.functions.invoke("support-auto-reply", {
      body: { conversation_id: conversationId, message: text },
    });
  };

  // If not logged in, show simple auto-reply version
  if (!user) {
    return <GuestChat />;
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-28 right-4 z-40 sm:bottom-6 sm:right-6 bg-primary text-primary-foreground rounded-full p-3.5 shadow-lg hover:scale-105 transition-transform"
          aria-label="Canlı Destek"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+4px)] right-2 z-50 sm:bottom-6 sm:right-6 w-[calc(100vw-16px)] max-w-sm bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "min(480px, 70vh)" }}
        >
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
            {loading && (
              <p className="text-center text-sm text-muted-foreground">Yükleniyor...</p>
            )}
            {!loading && messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Merhaba! Mesaj göndererek destek alabilirsiniz.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.isAdmin ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.isAdmin
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {m.isAdmin && (
                    <p className="text-[10px] font-bold mb-0.5 text-primary">Destek</p>
                  )}
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.isAdmin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                    {m.time}
                  </p>
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

/* Guest fallback with auto-replies */
const GuestChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: "0", text: "Merhaba! BlueBet canlı destek hattına hoş geldiniz. Giriş yaparak destek alabilirsiniz.", isAdmin: true, time: now() },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((prev) => [...prev, { id: String(Date.now()), text, isAdmin: false, time: now() }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), text: "Destek almak için lütfen giriş yapın. Giriş yaptıktan sonra mesajlarınız destek ekibimize iletilecektir.", isAdmin: true, time: now() },
      ]);
    }, 800);
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-28 right-4 z-40 sm:bottom-6 sm:right-6 bg-primary text-primary-foreground rounded-full p-3.5 shadow-lg hover:scale-105 transition-transform" aria-label="Canlı Destek">
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom)+4px)] right-2 z-50 sm:bottom-6 sm:right-6 w-[calc(100vw-16px)] max-w-sm bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "min(480px, 70vh)" }}>
          <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary-foreground" />
              <div>
                <p className="text-sm font-bold text-primary-foreground">Canlı Destek</p>
                <p className="text-xs text-primary-foreground/70">Çevrimiçi</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.isAdmin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.isAdmin ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.isAdmin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>{m.time}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-border p-2 flex gap-2 shrink-0">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Mesajınızı yazın..." className="text-sm" />
            <Button size="icon" onClick={send} disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveSupportChat;
