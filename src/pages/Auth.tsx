import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { z } from "zod";
import { MFAVerificationDialog } from "@/components/settings/MFAVerificationDialog";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(20, "Password must be no more than 20 characters")
  .regex(/[A-Z]/, "Password must contain at least one capital letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character");

const ADMIN_EXCEPTION = import.meta.env.VITE_ADMIN_EMAIL || 'dharris9928@gmail.com';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [domainsLoaded, setDomainsLoaded] = useState(false);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [pendingMFAFactorId, setPendingMFAFactorId] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    // Check if this is a password reset flow
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('reset') === 'true') {
      setIsResettingPassword(true);
    }
  }, []);

  useEffect(() => {
    const fetchAllowedDomains = async () => {
      try {
        const { data, error } = await supabase
          .from('allowed_email_domains')
          .select('domain')
          .eq('is_active', true)
          .eq('verification_status', 'verified');

        if (error) throw error;

        const domains = data?.map(d => `@${d.domain.toLowerCase()}`) || [];
        setAllowedDomains(domains);
      } catch (error) {
        console.error('Error fetching allowed domains:', error);
        toast.error('Failed to load allowed domains');
      } finally {
        setDomainsLoaded(true);
      }
    };

    fetchAllowedDomains();
  }, []);

  const validateEmailDomain = (email: string): boolean => {
    if (email.toLowerCase() === ADMIN_EXCEPTION.toLowerCase()) {
      return true;
    }
    return allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
  };
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if MFA is required
        if (error.message.includes('MFA') || error.message.includes('factor')) {
          // List MFA factors
          const { data: factors } = await supabase.auth.mfa.listFactors();
          if (factors?.totp && factors.totp.length > 0) {
            setPendingMFAFactorId(factors.totp[0].id);
            setShowMFAVerification(true);
            setLoading(false);
            return;
          }
        }

        // Log failed login attempt
        try {
          await supabase.rpc('log_auth_event', {
            _user_id: null,
            _event_type: 'LOGIN_FAILED',
            _email_attempted: email,
            _failure_reason: error.message
          });
        } catch (logError) {
          console.error('Failed to log auth event:', logError);
        }
        throw error;
      }

      // Log successful login
      if (data.user) {
        try {
          await supabase.rpc('log_auth_event', {
            _user_id: data.user.id,
            _event_type: 'LOGIN_SUCCESS',
            _email_attempted: email
          });
        } catch (logError) {
          console.error('Failed to log auth event:', logError);
        }
      }

      toast.success("Successfully logged in!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = () => {
    setShowMFAVerification(false);
    setPendingMFAFactorId(null);
    toast.success("Successfully logged in!");
    navigate("/");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email domain
      if (!validateEmailDomain(email)) {
        toast.error("Registration is restricted to authorized email domains only");
        setLoading(false);
        return;
      }

      // Validate password
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data: signupData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      // Send approval request notification to admins
      if (signupData.user) {
        try {
          await supabase.functions.invoke('send-approval-request-notification', {
            body: {
              userId: signupData.user.id,
              userEmail: email,
              firstName,
              lastName
            }
          });
        } catch (notifError) {
          console.error('Error sending approval notification:', notifError);
          // Don't fail signup if notification fails
        }
      }

      toast.success("Account created! Awaiting admin approval before you can access the system.");
      // Don't navigate - users need approval first
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email }
      });

      if (error) throw error;

      toast.success("A 6-digit reset code has been sent to your email. Please check your inbox.");
      setIsResettingPassword(true);
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }

      // Validate password requirements
      const passwordValidation = passwordSchema.safeParse(newPassword);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Use the new code-based reset system
      const { data, error } = await supabase.functions.invoke('verify-reset-code', {
        body: {
          email: email,
          code: tempPassword, // Reusing tempPassword field for reset code
          newPassword: newPassword
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      toast.success("Password updated successfully! You can now login.");
      setIsResettingPassword(false);
      setEmail("");
      setTempPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Clear the query parameters
      window.history.replaceState({}, document.title, "/auth");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // If we're in password reset mode, show the reset form
  if (isResettingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary rounded-lg">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              Enter the 6-digit reset code and choose a new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-password">Reset Code</Label>
                <PasswordInput
                  id="temp-password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Enter 6-digit code from email"
                  required
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code you received from your administrator
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <PasswordRequirements password={newPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating password..." : "Update Password"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsResettingPassword(false);
                  window.history.replaceState({}, document.title, "/auth");
                }}
              >
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-lg">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Nest Pro CRM</CardTitle>
          <CardDescription>
            Manage your Google Nest Pro channel sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Email"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Login
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <PasswordInput
                      id="login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <PasswordRequirements password={password} />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !domainsLoaded}>
                  {loading ? "Creating account..." : !domainsLoaded ? "Loading..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MFAVerificationDialog
        open={showMFAVerification}
        onOpenChange={setShowMFAVerification}
        onSuccess={handleMFASuccess}
      />
    </div>
  );
};

export default Auth;
