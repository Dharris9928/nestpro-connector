import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AssistantNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  read: boolean;
  created_at: string;
}

const AUTOMATION_TYPES = [
  "automation_hot_lead",
  "automation_stale_opportunity",
  "automation_meeting_followup",
  "automation_enrichment",
  "automation_flagged",
];

const URGENT_TYPES = new Set(["automation_hot_lead", "automation_flagged"]);

export function useAutomationNotifications() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const query = useQuery({
    queryKey: ["assistant-notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id, type, title, message, link_url, read, created_at")
        .eq("user_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(25);
      return (data ?? []) as AssistantNotification[];
    },
    refetchInterval: 60_000,
  });

  // Realtime: invalidate + toast on new urgent
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`assistant-notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as AssistantNotification;
          qc.invalidateQueries({ queryKey: ["assistant-notifications", userId] });
          qc.invalidateQueries({ queryKey: ["notifications"] });
          if (URGENT_TYPES.has(row.type)) {
            toast(row.title, {
              description: row.message,
              duration: 10_000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["assistant-notifications", userId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const automationNotifications = (query.data ?? []).filter((n) =>
    AUTOMATION_TYPES.includes(n.type)
  );

  const markRead = async (id: string) => {
    await (supabase as any)
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["assistant-notifications", userId] });
  };

  return {
    notifications: automationNotifications,
    unreadCount: automationNotifications.length,
    markRead,
    isLoading: query.isLoading,
  };
}

export { URGENT_TYPES };
