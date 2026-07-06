import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { MessageSquare, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: { full_name: string | null };
}

export function VehicleChat({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('vehicle_messages')
      .select('*, profile:profiles(full_name)')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages((data ?? []) as unknown as Message[]);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`vehicle_chat_${vehicleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vehicle_messages', filter: `vehicle_id=eq.${vehicleId}` },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [vehicleId, load]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (expanded) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, expanded]);

  const send = async () => {
    if (!text.trim() || !organizationId || !user) return;
    setSending(true);
    const { error } = await supabase.from('vehicle_messages').insert({
      vehicle_id: vehicleId,
      organization_id: organizationId,
      user_id: user.id,
      message: text.trim(),
    });
    if (!error) setText('');
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const fmt = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const unread = messages.length;

  return (
    <div className="border border-border/40 rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Chat del equipo</span>
          {unread > 0 && (
            <span className="text-xs bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-medium">
              {unread} mensaje{unread !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40 flex flex-col">
          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sin mensajes. Sé el primero en escribir.
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={cn('flex flex-col gap-0.5', isMe ? 'items-end' : 'items-start')}>
                    {!isMe && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        {msg.profile?.full_name ?? 'Mecánico'}
                      </span>
                    )}
                    <div className={cn(
                      'max-w-[80%] px-3 py-1.5 rounded-xl text-sm',
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted/50 text-foreground border border-border/30 rounded-tl-sm'
                    )}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">{fmt(msg.created_at)}</span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/30 p-2 flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Mensaje al equipo... (Enter para enviar)"
              className="flex-1 text-sm bg-muted/30 border border-border/50 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground min-h-[36px] max-h-24"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="shrink-0 p-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
