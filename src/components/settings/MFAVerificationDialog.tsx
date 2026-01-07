import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

interface MFAVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  factorId?: string | null;
}

export function MFAVerificationDialog({ open, onOpenChange, onSuccess, factorId }: MFAVerificationDialogProps) {
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsLoading(true);

      // If factorId is provided from parent (login flow), use it
      let mfaFactorId = factorId;

      // If no factorId provided, list factors (settings flow)
      if (!mfaFactorId) {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) throw factorsError;

        const totpFactor = factors?.totp?.[0];

        if (!totpFactor || totpFactor.status !== 'verified') {
          toast.error('MFA not properly set up', {
            description: 'Please complete MFA enrollment in Settings first',
          });
          onOpenChange(false);
          return;
        }

        mfaFactorId = totpFactor.id;
      }

      if (!mfaFactorId) {
        throw new Error('No MFA factor available');
      }

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) {
        console.error('Challenge error:', challengeError);
        throw new Error('Failed to create MFA challenge');
      }

      if (!challenge?.id) {
        throw new Error('No challenge ID received');
      }

      // Verify code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: verifyCode,
      });

      if (verifyError) {
        console.error('Verify error:', verifyError);
        throw new Error('Invalid verification code');
      }

      toast.success('Verification successful');
      setVerifyCode(''); // Clear the code
      onSuccess();
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast.error('Verification failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Verification Code</Label>
            <Input
              id="mfa-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || verifyCode.length !== 6}
            className="w-full"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
