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
import { Plus, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export function SecurityTestingLog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    test_name: "",
    test_type: "authentication",
    result: "passed",
    description: "",
    findings: "",
    remediation: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tests } = useQuery({
    queryKey: ['security-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_tests')
        .select('*')
        .order('test_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('security_tests')
        .insert([{ ...data, tested_by: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-tests'] });
      toast({ title: "Security test logged" });
      setOpen(false);
      setFormData({
        test_name: "",
        test_type: "authentication",
        result: "passed",
        description: "",
        findings: "",
        remediation: "",
      });
    }
  });

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'passed': return 'default';
      case 'failed': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const testStats = {
    passed: tests?.filter(t => t.result === 'passed').length || 0,
    failed: tests?.filter(t => t.result === 'failed').length || 0,
    warning: tests?.filter(t => t.result === 'warning').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{testStats.passed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{testStats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{testStats.warning}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Testing Log</CardTitle>
              <CardDescription>Record and track security testing results</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Log Security Test</DialogTitle>
                  <DialogDescription>
                    Document the results of a security test
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Test Name</Label>
                    <Input
                      value={formData.test_name}
                      onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                      placeholder="e.g., SQL Injection Test - Login Form"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Test Type</Label>
                      <Select
                        value={formData.test_type}
                        onValueChange={(value) => setFormData({ ...formData, test_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="authentication">Authentication</SelectItem>
                          <SelectItem value="authorization">Authorization</SelectItem>
                          <SelectItem value="encryption">Encryption</SelectItem>
                          <SelectItem value="injection">Injection</SelectItem>
                          <SelectItem value="xss">XSS</SelectItem>
                          <SelectItem value="csrf">CSRF</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Result</Label>
                      <Select
                        value={formData.result}
                        onValueChange={(value) => setFormData({ ...formData, result: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="passed">Passed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what was tested and how"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Findings</Label>
                    <Textarea
                      value={formData.findings}
                      onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                      placeholder="What issues or vulnerabilities were found?"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Remediation</Label>
                    <Textarea
                      value={formData.remediation}
                      onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
                      placeholder="How should these issues be fixed?"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createTestMutation.mutate(formData)}
                    disabled={!formData.test_name || createTestMutation.isPending}
                  >
                    Log Test
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests?.map((test) => (
              <div key={test.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getResultIcon(test.result)}
                    <p className="font-medium">{test.test_name}</p>
                    <Badge variant={getResultColor(test.result)}>
                      {test.result}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {test.test_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(test.test_date), 'PPP')}
                  </p>
                </div>
                {test.description && (
                  <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                )}
                {test.findings && (
                  <div className="mt-2 p-3 bg-muted rounded">
                    <p className="text-xs font-medium mb-1">Findings:</p>
                    <p className="text-sm">{test.findings}</p>
                  </div>
                )}
                {test.remediation && (
                  <div className="mt-2 p-3 bg-muted rounded">
                    <p className="text-xs font-medium mb-1">Remediation:</p>
                    <p className="text-sm">{test.remediation}</p>
                  </div>
                )}
              </div>
            ))}
            {(!tests || tests.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No security tests logged yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
