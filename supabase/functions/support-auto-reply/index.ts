import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sen BlueBet bahis sitesinin canlı destek asistanısın. Adın "BlueBet Asistan".
Görevin kullanıcılara yardımcı olmak. Türkçe yanıt ver.

Kurallar:
- Kısa ve öz yanıtlar ver (max 2-3 cümle)
- Nazik ve profesyonel ol
- Para yatırma: Hesabınıza giriş yapın, "Para Yatır" butonuna tıklayın
- Para çekme: Hesap ayarlarından IBAN bilgilerinizi girin, çekim talebi oluşturun
- Bahis yapma: Ana sayfadan maç seçin, oran tıklayın, kupon oluşturun
- Hesap sorunları: destek@bluebet.app adresine yazabilirsiniz
- Minimum para yatırma: 50 TL, Minimum çekim: 100 TL
- Karmaşık sorunlar için "Bir temsilcimiz en kısa sürede size yardımcı olacaktır" de
- Bahis oranları ve sonuçları hakkında garanti verme, tavsiye verme`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, message } = await req.json();

    if (!conversation_id || !message) {
      return new Response(
        JSON.stringify({ error: "Missing conversation_id or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get conversation history for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: history } = await supabase
      .from("support_messages")
      .select("message, sender_type")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.sender_type === "user" ? "user" : "assistant",
          content: msg.message,
        });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Call AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "Bir temsilcimiz en kısa sürede size yardımcı olacaktır.";

    // Save AI reply as bot message
    await supabase.from("support_messages").insert({
      conversation_id,
      sender_id: null,
      sender_type: "bot",
      message: reply,
    });

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Support auto-reply error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
