
-- Support conversations table
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own conversations" ON public.support_conversations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users create own conversations" ON public.support_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own conversations" ON public.support_conversations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins manage all conversations" ON public.support_conversations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_type text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own conversation messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND sender_type = 'user' AND
    EXISTS (
      SELECT 1 FROM public.support_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all messages" ON public.support_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
