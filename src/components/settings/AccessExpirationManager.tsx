import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccessApproval {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  approved_at: string;
  expires_at: string | null;
  access_level: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export function AccessExpirationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState<string>("");

  // Fetch active access approvals
  const { data: approvals, isLoading } = useQuery({
    queryKey: ["access-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("record_access_approvals")
        .select("*")
        .order("expires_at", { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch profile data separately
      const userIds = [...new Set(data?.map(a => a.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      return (data || []).map(approval => ({
        ...approval,
        profiles: profilesMap.get(approval.user_id) || { first_name: "Unknown", last_name: "User" }
      })) as AccessApproval[];
    },
  });

  // Extend access mutation
  const extendAccessMutation = useMutation({
    mutationFn: async ({ approvalId, expiresAt }: { approvalId: string; expiresAt: string }) => {
      const { error } = await supabase
        .from("record_access_approvals")
        .update({ expires_at: expiresAt })
        .eq("id", approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-approvals"] });
      toast({
        title: "Access Extended",
        description: "The access expiration date has been updated.",
      });
      setSelectedApproval(null);
      setNewExpirationDate("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      const { error } = await supabase
        .from("record_access_approvals")
        .delete()
        .eq("id", approvalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-approvals"] });
      toast({
        title: "Access Revoked",
        description: "The access approval has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getExpirationBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return <Badge variant="secondary">Permanent</Badge>;
    }

    const daysUntil = differenceInDays(new Date(expiresAt), new Date());
    
    if (daysUntil < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    } else if (daysUntil <= 3) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expires in {daysUntil} days
        </Badge>
      );
    } else if (daysUntil <= 7) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Expires in {daysUntil} days
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Expires in {daysUntil} days
        </Badge>
      );
    }
  };

  // Group approvals by expiration status
  const expiringWithin7Days = approvals?.filter(
    (a) => a.expires_at && differenceInDays(new Date(a.expires_at), new Date()) <= 7 && differenceInDays(new Date(a.expires_at), new Date()) >= 0
  ) || [];

  const permanentAccess = approvals?.filter((a) => !a.expires_at) || [];
  const activeWithExpiration = approvals?.filter(
    (a) => a.expires_at && differenceInDays(new Date(a.expires_at), new Date()) > 7
  ) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Access Expiration Management
        </CardTitle>
        <CardDescription>
          Manage time-limited access permissions and set expiration dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning for expiring access */}
        {expiringWithin7Days.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive mb-1">
                  {expiringWithin7Days.length} Access Approval{expiringWithin7Days.length !== 1 && "s"} Expiring Soon
                </h4>
                <p className="text-sm text-muted-foreground">
                  Review and extend access before expiration to prevent disruption
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading access approvals...</p>
        ) : !approvals || approvals.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              No active access approvals found.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-6">
              {/* Expiring Soon */}
              {expiringWithin7Days.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Expiring Within 7 Days ({expiringWithin7Days.length})
                  </h3>
                  <div className="space-y-2">
                    {expiringWithin7Days.map((approval) => (
                      <ApprovalCard
                        key={approval.id}
                        approval={approval}
                        onExtend={(id) => {
                          setSelectedApproval(id);
                          // Set default to 30 days from now
                          const defaultDate = new Date();
                          defaultDate.setDate(defaultDate.getDate() + 30);
                          setNewExpirationDate(format(defaultDate, "yyyy-MM-dd"));
                        }}
                        onRevoke={(id) => revokeAccessMutation.mutate(id)}
                        getExpirationBadge={getExpirationBadge}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Active with Expiration */}
              {activeWithExpiration.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Active (Expires Later) ({activeWithExpiration.length})
                  </h3>
                  <div className="space-y-2">
                    {activeWithExpiration.map((approval) => (
                      <ApprovalCard
                        key={approval.id}
                        approval={approval}
                        onExtend={(id) => {
                          setSelectedApproval(id);
                          const defaultDate = new Date();
                          defaultDate.setDate(defaultDate.getDate() + 30);
                          setNewExpirationDate(format(defaultDate, "yyyy-MM-dd"));
                        }}
                        onRevoke={(id) => revokeAccessMutation.mutate(id)}
                        getExpirationBadge={getExpirationBadge}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Permanent Access */}
              {permanentAccess.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    Permanent Access ({permanentAccess.length})
                  </h3>
                  <div className="space-y-2">
                    {permanentAccess.map((approval) => (
                      <ApprovalCard
                        key={approval.id}
                        approval={approval}
                        onExtend={(id) => {
                          setSelectedApproval(id);
                          const defaultDate = new Date();
                          defaultDate.setDate(defaultDate.getDate() + 30);
                          setNewExpirationDate(format(defaultDate, "yyyy-MM-dd"));
                        }}
                        onRevoke={(id) => revokeAccessMutation.mutate(id)}
                        getExpirationBadge={getExpirationBadge}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Extend Access Dialog */}
        <Dialog open={selectedApproval !== null} onOpenChange={() => setSelectedApproval(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Extend Access</DialogTitle>
              <DialogDescription>
                Set a new expiration date for this access approval
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expiration">New Expiration Date</Label>
                <Input
                  id="expiration"
                  type="date"
                  value={newExpirationDate}
                  onChange={(e) => setNewExpirationDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for permanent access
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedApproval) {
                    extendAccessMutation.mutate({
                      approvalId: selectedApproval,
                      expiresAt: newExpirationDate || "",
                    });
                  }
                }}
                disabled={extendAccessMutation.isPending}
              >
                {extendAccessMutation.isPending ? "Extending..." : "Extend Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Approval Card Component
function ApprovalCard({
  approval,
  onExtend,
  onRevoke,
  getExpirationBadge,
}: {
  approval: AccessApproval;
  onExtend: (id: string) => void;
  onRevoke: (id: string) => void;
  getExpirationBadge: (expiresAt: string | null) => JSX.Element;
}) {
  return (
    <div className="border p-3 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        {getExpirationBadge(approval.expires_at)}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onExtend(approval.id)}>
            Extend
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to revoke this access?")) {
                onRevoke(approval.id);
              }
            }}
          >
            Revoke
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm">
          <strong>User:</strong> {approval.profiles?.first_name} {approval.profiles?.last_name}
        </p>
        <p className="text-sm">
          <strong>Resource:</strong> {approval.table_name}
        </p>
        <p className="text-sm">
          <strong>Access Level:</strong> {approval.access_level}
        </p>
        {approval.expires_at && (
          <p className="text-sm text-muted-foreground">
            <strong>Expires:</strong> {format(new Date(approval.expires_at), "PPP")} (
            {formatDistanceToNow(new Date(approval.expires_at), { addSuffix: true })})
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          <strong>Approved:</strong>{" "}
          {formatDistanceToNow(new Date(approval.approved_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}