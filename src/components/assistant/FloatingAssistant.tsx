import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, X, Bell, Sparkles } from "lucide-react";
import { useAutomationNotifications } from "@/hooks/useAutomationNotifications";
import { AlertCard } from "./AlertCard";
import { AssistantChat } from "./AssistantChat";

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead } = useAutomationNotifications();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <Card className="w-[380px] h-[560px] flex flex-col shadow-2xl border-2">
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold text-sm">Nest AI Assistant</span>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Tabs defaultValue={unreadCount > 0 ? "alerts" : "chat"} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-2 mx-2 mt-2">
              <TabsTrigger value="alerts" className="text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Alerts {unreadCount > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{unreadCount > 9 ? "9+" : unreadCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" /> Chat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="alerts" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-2">
                {notifications.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-12">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    All caught up!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <AlertCard key={n.id} notification={n} onDismiss={markRead} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="chat" className="flex-1 min-h-0 m-0">
              <AssistantChat />
            </TabsContent>
          </Tabs>
        </Card>
      ) : (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-2xl relative"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}
