import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, CheckCircle, XCircle, Clock } from "lucide-react";

export function SecurityPatchManager() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    patch_name: "",
    patch_type: "dependency",
    severity: "medium",
    description: "",
    patch_version: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patches, isLoading } = useQuery({
    queryKey: ['security-patches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_patches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createPatchMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('security_patches')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-patches'] });
      toast({ title: "Security patch created" });
      setOpen(false);
      setFormData({
        patch_name: "",
        patch_type: "dependency",
        severity: "medium",
        description: "",
        patch_version: "",
      });
    }
  });

  const updatePatchMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'applied') {
        updates.applied_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) updates.applied_by = user.id;
      }
      const { error } = await supabase
        .from('security_patches')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-patches'] });
      toast({ title: "Patch status updated" });
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Security Patches</CardTitle>
            <CardDescription>Track and manage security patches</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Patch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Security Patch</DialogTitle>
                <DialogDescription>
                  Document a new security patch that needs to be applied
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Patch Name</Label>
                  <Input
                    value={formData.patch_name}
                    onChange={(e) => setFormData({ ...formData, patch_name: e.target.value })}
                    placeholder="e.g., CVE-2024-1234 Fix"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.patch_type}
                    onValueChange={(value) => setFormData({ ...formData, patch_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dependency">Dependency</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="configuration">Configuration</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Patch Version</Label>
                  <Input
                    value={formData.patch_version}
                    onChange={(e) => setFormData({ ...formData, patch_version: e.target.value })}
                    placeholder="e.g., 1.2.3"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the security patch and what it fixes"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createPatchMutation.mutate(formData)}
                  disabled={!formData.patch_name || createPatchMutation.isPending}
                >
                  Create Patch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patches?.map((patch) => (
            <div key={patch.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(patch.status)}
                  <p className="font-medium">{patch.patch_name}</p>
                  <Badge variant={getSeverityColor(patch.severity)}>
                    {patch.severity}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {patch.patch_type}
                  </Badge>
                </div>
                {patch.description && (
                  <p className="text-sm text-muted-foreground mt-1">{patch.description}</p>
                )}
                {patch.patch_version && (
                  <p className="text-xs text-muted-foreground mt-1">Version: {patch.patch_version}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Created {format(new Date(patch.created_at), 'PPP')}
                </p>
              </div>
              {patch.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updatePatchMutation.mutate({ id: patch.id, status: 'applied' })}
                  >
                    Mark Applied
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updatePatchMutation.mutate({ id: patch.id, status: 'failed' })}
                  >
                    Mark Failed
                  </Button>
                </div>
              )}
            </div>
          ))}
          {(!patches || patches.length === 0) && (
            <p className="text-center text-muted-foreground py-8">No security patches recorded</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
