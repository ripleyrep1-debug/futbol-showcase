import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, User, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  user_id: string;
  user_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  unread?: number;
  last_message?: string;
}

interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: string;
  message: string;
  created_at: string;
}

const Support = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["admin-support-conversations", filter],
    queryFn: async () => {
      let query = supabase
        .from("support_conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get last message for each conversation
      const convs: Conversation[] = [];
      for (const conv of data || []) {
        const { data: lastMsg } = await supabase
          .from("support_messages")
          .select("message, sender_type")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        convs.push({
          ...conv,
          last_message: lastMsg?.[0]?.message || "Henüz mesaj yok",
        });
      }
      return convs;
    },
    refetchInterval: 10000,
  });

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selectedConv)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`admin-support-${selectedConv}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${selectedConv}`,
        },
        (payload) => {
          const m = payload.new as SupportMessage;
          setMessages((prev) => {
            if (prev.find((msg) => msg.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv || !user) return;
    const text = reply.trim();
    setReply("");

    const { error } = await supabase.from("support_messages").insert({
      conversation_id: selectedConv,
      sender_id: user.id,
      sender_type: "admin",
      message: text,
    });

    if (error) {
      toast.error("Mesaj gönderilemedi");
    }
  };

  const closeConversation = async (convId: string) => {
    await supabase
      .from("support_conversations")
      .update({ status: "closed" })
      .eq("id", convId);
    queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    if (selectedConv === convId) setSelectedConv(null);
    toast.success("Görüşme kapatıldı");
  };

  const reopenConversation = async (convId: string) => {
    await supabase
      .from("support_conversations")
      .update({ status: "open" })
      .eq("id", convId);
    queryClient.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    toast.success("Görüşme yeniden açıldı");
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConv);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Canlı Destek</h1>
        <p className="text-muted-foreground text-sm">Kullanıcı destek taleplerini yönetin</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        {/* Conversation List */}
        <div className="w-80 shrink-0 border border-border rounded-lg flex flex-col bg-card">
          {/* Filters */}
          <div className="p-3 border-b border-border flex gap-1">
            {(["open", "closed", "all"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                onClick={() => setFilter(f)}
                className="text-xs"
              >
                {f === "open" ? "Açık" : f === "closed" ? "Kapalı" : "Tümü"}
              </Button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <p className="p-4 text-center text-sm text-muted-foreground">Yükleniyor...</p>
            )}
            {!isLoading && conversations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Henüz destek talebi yok</p>
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv.id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition-colors ${
                  selectedConv === conv.id ? "bg-secondary" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {conv.user_name || "Anonim"}
                    </span>
                  </div>
                  <Badge variant={conv.status === "open" ? "default" : "secondary"} className="text-[10px]">
                    {conv.status === "open" ? "Açık" : "Kapalı"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(conv.updated_at).toLocaleString("tr-TR")}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 border border-border rounded-lg flex flex-col bg-card">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Bir görüşme seçin</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">
                    {selectedConversation?.user_name || "Kullanıcı"}
                  </span>
                  <Badge variant={selectedConversation?.status === "open" ? "default" : "secondary"} className="text-[10px]">
                    {selectedConversation?.status === "open" ? "Açık" : "Kapalı"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {selectedConversation?.status === "open" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeConversation(selectedConv)}
                      className="text-xs"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Kapat
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reopenConversation(selectedConv)}
                      className="text-xs"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Yeniden Aç
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_type === "admin" || m.sender_type === "bot" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        m.sender_type === "admin"
                          ? "bg-primary text-primary-foreground"
                          : m.sender_type === "bot"
                          ? "bg-accent/20 text-accent-foreground border border-accent/30"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <p className="text-[10px] font-bold mb-0.5 opacity-70">
                        {m.sender_type === "admin" ? "Admin" : m.sender_type === "bot" ? "🤖 AI Asistan" : selectedConversation?.user_name || "Kullanıcı"}
                      </p>
                      <p>{m.message}</p>
                      <p className="text-[10px] mt-1 opacity-50">
                        {new Date(m.created_at).toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply Input */}
              {selectedConversation?.status === "open" && (
                <div className="border-t border-border p-3 flex gap-2 shrink-0">
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="Yanıt yazın..."
                    className="text-sm"
                  />
                  <Button onClick={sendReply} disabled={!reply.trim()}>
                    <Send className="h-4 w-4 mr-1" />
                    Gönder
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Support;
