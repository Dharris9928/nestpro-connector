import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Consent {
  id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  version: string;
}

const consentTypes = [
  {
    type: 'marketing_emails',
    label: 'Marketing Emails',
    description: 'Receive updates about new features, tips, and product announcements',
  },
  {
    type: 'analytics',
    label: 'Analytics & Performance',
    description: 'Help us improve by allowing anonymous usage analytics',
  },
  {
    type: 'data_sharing',
    label: 'Data Sharing with Partners',
    description: 'Allow sharing anonymized data with trusted partners for research',
  },
  {
    type: 'communication_tracking',
    label: 'Communication Tracking',
    description: 'Track email opens and link clicks to improve our communications',
  },
];

export function ConsentManagement() {
  const queryClient = useQueryClient();
  const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);

  // Fetch user consents
  const { data: consents, isLoading } = useQuery({
    queryKey: ['user-consents'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as Consent[];
    },
  });

  // Update consent mutation
  const updateConsent = useMutation({
    mutationFn: async ({ consentType, granted }: { consentType: string; granted: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get IP and user agent for audit trail
      const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
      const ipData = ipResponse ? await ipResponse.json() : null;

      const { data, error } = await supabase
        .from('user_consents')
        .upsert({
          user_id: user.id,
          consent_type: consentType,
          granted,
          ip_address: ipData?.ip || null,
          user_agent: navigator.userAgent,
          version: '1.0',
        }, {
          onConflict: 'user_id,consent_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-consents'] });
      toast.success('Consent preferences updated', {
        description: `${variables.consentType.replace('_', ' ')} ${variables.granted ? 'enabled' : 'disabled'}`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update consent', {
        description: error.message,
      });
    },
    onSettled: () => {
      setUpdatingConsent(null);
    },
  });

  const getConsentStatus = (consentType: string): boolean => {
    const consent = consents?.find((c) => c.consent_type === consentType);
    return consent?.granted || false;
  };

  const getConsentDate = (consentType: string): string | null => {
    const consent = consents?.find((c) => c.consent_type === consentType);
    if (consent?.granted && consent.granted_at) {
      return new Date(consent.granted_at).toLocaleDateString();
    }
    if (!consent?.granted && consent?.revoked_at) {
      return new Date(consent.revoked_at).toLocaleDateString();
    }
    return null;
  };

  const handleConsentToggle = (consentType: string, granted: boolean) => {
    setUpdatingConsent(consentType);
    updateConsent.mutate({ consentType, granted });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Privacy & Consent Management</CardTitle>
        </div>
        <CardDescription>
          Control how your data is used. Changes are effective immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your consent choices are tracked with timestamps and IP addresses for GDPR compliance.
            You can change these preferences at any time.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {consentTypes.map((type) => {
              const isGranted = getConsentStatus(type.type);
              const date = getConsentDate(type.type);
              const isUpdating = updatingConsent === type.type;

              return (
                <div
                  key={type.type}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={type.type} className="text-base font-medium cursor-pointer">
                        {type.label}
                      </Label>
                      {isGranted && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                    {date && (
                      <p className="text-xs text-muted-foreground">
                        {isGranted ? 'Granted' : 'Revoked'} on {date}
                      </p>
                    )}
                  </div>
                  <Switch
                    id={type.type}
                    checked={isGranted}
                    onCheckedChange={(checked) => handleConsentToggle(type.type, checked)}
                    disabled={isUpdating}
                  />
                </div>
              );
            })}
          </div>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Legal Notice:</strong> Some data processing is necessary for service delivery and
            cannot be opted out (e.g., user account management, security logs). These are processed
            under "legitimate interest" or "contract" legal basis under GDPR Article 6.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
