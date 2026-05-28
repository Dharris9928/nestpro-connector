import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


interface Message {
  role: "user" | "assistant";
  content: string;
  proposed_actions?: ProposedAction[];
}

interface ProposedAction {
  id: string;
  action: string;
  label: string;
  args: any;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! Ask me about your hot leads, overdue meetings, or unread notifications." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant-chat", {
        body: {
          action: "chat",
          messages: next.map(({ role, content }) => ({ role, content })),
        },
      });
      if (error) throw error;
      setMessages((m) => [...m, {
        role: "assistant",
        content: data.reply ?? "(no response)",
        proposed_actions: data.proposed_actions ?? [],
      }]);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes("429")) toast.error("Rate limit — try again in a moment.");
      else if (msg.includes("402")) toast.error("AI credits exhausted.");
      else toast.error("Assistant error: " + msg.slice(0, 120));
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I ran into an error. " + msg.slice(0, 200) }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async (actionId: string, label: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant-chat", {
        body: { action: "execute", action_id: actionId },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`Done: ${label}`);
        setMessages((m) => [...m, { role: "assistant", content: `✅ ${label}` }]);
      } else {
        toast.error(`Failed: ${data?.error ?? "unknown"}`);
      }
    } catch (e: any) {
      toast.error("Execute failed: " + (e?.message ?? String(e)).slice(0, 120));
    }
  };

  const rejectAction = async (actionId: string) => {
    await (supabase as any).from("ai_action_log").update({ status: "rejected" }).eq("id", actionId);
    toast.message("Cancelled");
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef as any}>
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm max-w-[85%]">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap">
                  {m.content}
                  {m.proposed_actions?.map((a) => (
                    <Card key={a.id} className="mt-2 p-2 bg-muted/50 not-prose">
                      <p className="text-xs font-medium mb-2">{a.label}?</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => confirmAction(a.id, a.label)}>
                          <Check className="h-3 w-3 mr-1" /> Confirm
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => rejectAction(a.id)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask anything…"
          disabled={loading}
          className="text-sm"
        />
        <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
