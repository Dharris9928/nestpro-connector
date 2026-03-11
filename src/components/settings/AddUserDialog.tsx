import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}

export function AddUserDialog({ open, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "sales_rep" as "admin" | "sales_manager" | "sales_rep" | "read_only",
    useTemporaryPassword: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.email || !form.firstName || !form.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!form.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Only validate password if not using temporary
    if (!form.useTemporaryPassword) {
      if (!form.password || form.password.length < 8 || form.password.length > 20) {
        toast.error('Password must be 8-20 characters');
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const payload = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.useTemporaryPassword ? undefined : form.password,
        role: form.role,
        useTemporaryPassword: form.useTemporaryPassword,
      };

      let data: any;

      // Primary path: SDK invoke
      const { data: invokeData, error } = await supabase.functions.invoke('admin-create-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: payload,
      });

      if (error) {
        // Fallback path: direct fetch (handles occasional invoke transport issues)
        if ((error as Error).name === 'FunctionsFetchError') {
          const response = await fetch(
            `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-create-user`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify(payload),
            }
          );

          const fallbackData = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(fallbackData?.error || 'Failed to create user');
          }

          data = fallbackData;
        } else {
          throw error;
        }
      } else {
        data = invokeData;
      }

      if (data?.error) throw new Error(data.error);

      // Show success message with temp password if generated
      if (form.useTemporaryPassword && data.temporaryPassword) {
        toast.success(
          `User created successfully! Temporary password: ${data.temporaryPassword}`,
          { duration: 15000 }
        );
      } else {
        toast.success('User created successfully!');
      }

      // Reset form
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "sales_rep",
        useTemporaryPassword: false
      });
      onUserAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with optional temporary password
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                <SelectItem value="read_only">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="tempPassword"
              checked={form.useTemporaryPassword}
              onCheckedChange={(checked) => 
                setForm({ ...form, useTemporaryPassword: checked as boolean })
              }
            />
            <Label htmlFor="tempPassword" className="text-sm font-normal">
              Generate temporary password (user must change on first login)
            </Label>
          </div>

          {!form.useTemporaryPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <PasswordInput
                id="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
              />
              {form.password && <PasswordRequirements password={form.password} />}
            </div>
          )}

          {form.useTemporaryPassword && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              A secure temporary password will be generated and displayed to you. Please provide it to the user securely. They will be required to change it upon first login.
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
