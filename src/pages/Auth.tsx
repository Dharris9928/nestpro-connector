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
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

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
          .or('verification_status.is.null,verification_status.eq.verified');

        if (error) throw error;

        const domains = data?.map(d => `@${d.domain.toLowerCase().trim()}`) || [];
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
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === ADMIN_EXCEPTION.toLowerCase()) {
      return true;
    }
    return allowedDomains.some(domain => normalizedEmail.endsWith(domain));
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

      // Check if user needs to change password (temporary password)
      if (data.user?.user_metadata?.requires_password_change) {
        toast.info('You must change your temporary password');
        setIsResettingPassword(true);
        setRequiresPasswordChange(true);
        setTempPassword(password); // Store current temp password
        setLoading(false);
        return;
      }

      // Check account status
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_status')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error checking account status:', profileError);
        } else if (profile?.account_status === 'suspended') {
          // Log out the user immediately
          await supabase.auth.signOut();
          toast.error('Your account has been suspended. Please contact an administrator.');
          setLoading(false);
          return;
        } else if (profile?.account_status === 'deactivated') {
          // Log out the user immediately
          await supabase.auth.signOut();
          toast.error('Your account has been deactivated. Please contact an administrator.');
          setLoading(false);
          return;
        }
      }

      // CRITICAL: Check if user has MFA enrolled - if so, require verification
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp && factors.totp.length > 0) {
        const totpFactor = factors.totp.find(f => f.status === 'verified');
        if (totpFactor) {
          // Trusted device window: skip MFA if verified within the last 2 hours on this device
          const TRUST_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
          const trustKey = `mfa_trusted_until_${data.user?.id}`;
          const trustedUntil = parseInt(localStorage.getItem(trustKey) || '0', 10);
          if (trustedUntil && Date.now() < trustedUntil) {
            // Within trust window - skip MFA prompt
          } else {
            // User has MFA enrolled - keep session and require MFA verification
            setPendingMFAFactorId(totpFactor.id);
            setShowMFAVerification(true);
            toast.info('Please verify your identity with two-factor authentication');
            setLoading(false);
            return;
          }
        }
      }

      // Log successful login (only if no MFA required)
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

  const handleMFASuccess = async () => {
    setShowMFAVerification(false);
    setPendingMFAFactorId(null);
    
    // Session is already established and upgraded to aal2 after MFA verification
    const { data: { user } } = await supabase.auth.getUser();

    // Mark this device as trusted for 2 hours to skip MFA on subsequent logins
    if (user) {
      const TRUST_WINDOW_MS = 2 * 60 * 60 * 1000;
      localStorage.setItem(`mfa_trusted_until_${user.id}`, String(Date.now() + TRUST_WINDOW_MS));
    }

    // Log successful login after MFA
    if (user) {
      try {
        await supabase.rpc('log_auth_event', {
          _user_id: user.id,
          _event_type: 'LOGIN_SUCCESS',
          _email_attempted: email
        });
      } catch (logError) {
        console.error('Failed to log auth event:', logError);
      }
    }

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

      // Check if this is a temporary password change (user is logged in)
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.requires_password_change && tempPassword) {
        // Update password directly since user is already authenticated
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) throw updateError;

        // Clear the requires_password_change flag
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { requires_password_change: false }
        });

        if (metadataError) console.error('Failed to update metadata:', metadataError);

        // Clear temp_password in profiles table to move user to "Active Users"
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ temp_password: null })
          .eq('id', user.id);

        if (profileError) console.error('Failed to clear temp password:', profileError);

        toast.success("Password updated successfully! Checking MFA requirements...");
        
        // Check if MFA is required for this user's role
        const { data: mfaStatus } = await supabase
          .from('user_mfa_status')
          .select('mfa_enabled')
          .eq('user_id', user.id)
          .single();

        if (!mfaStatus?.mfa_enabled) {
          // Check if MFA is required
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

          if (userRole) {
            const { data: mfaReq } = await supabase
              .from('mfa_requirements')
              .select('is_required')
              .eq('role', userRole.role)
              .single();

            if (mfaReq?.is_required) {
              toast.info('Please set up two-factor authentication', {
                description: 'MFA is required for your role. You can set it up in Settings.'
              });
            }
          }
        }

        setIsResettingPassword(false);
        setEmail("");
        setTempPassword("");
        setNewPassword("");
        setConfirmPassword("");
        navigate("/");
        return;
      }

      // Otherwise, use the code-based reset system
      const { data, error } = await supabase.functions.invoke('verify-reset-code', {
        body: {
          email: email,
          code: tempPassword,
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
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
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
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-password">{requiresPasswordChange ? 'Current Temporary Password' : 'Reset Code'}</Label>
                <PasswordInput
                  id="temp-password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder={requiresPasswordChange ? "Enter your temporary password" : "Enter 6-digit code from email"}
                  required
                  maxLength={requiresPasswordChange ? undefined : 6}
                  disabled={requiresPasswordChange}
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-muted-foreground">
                  {requiresPasswordChange 
                    ? 'You were given a temporary password - you must change it now' 
                    : 'Enter the 6-digit code you received from your administrator'
                  }
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
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
                  autoComplete="new-password"
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
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
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
                <form onSubmit={handleLogin} name="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
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
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
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
              <form onSubmit={handleSignup} name="signup" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
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
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    name="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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
          factorId={pendingMFAFactorId}
        />
    </main>
  );
};

export default Auth;
