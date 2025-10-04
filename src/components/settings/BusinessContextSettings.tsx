import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function BusinessContextSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const [businessDescription, setBusinessDescription] = useState('');
  const [teamMission, setTeamMission] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [targetCustomerProfile, setTargetCustomerProfile] = useState('');
  const [keyProductsServices, setKeyProductsServices] = useState('');
  const [communicationGuidelines, setCommunicationGuidelines] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['business-context-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_context_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setBusinessDescription(settings.business_description || '');
      setTeamMission(settings.team_mission || '');
      setValueProposition(settings.value_proposition || '');
      setTargetCustomerProfile(settings.target_customer_profile || '');
      setKeyProductsServices(settings.key_products_services || '');
      setCommunicationGuidelines(settings.communication_guidelines || '');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('business_context_settings')
        .update({
          ...updates,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-context-settings'] });
      toast({
        title: 'Success',
        description: 'Business context settings updated successfully',
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      business_description: businessDescription,
      team_mission: teamMission,
      value_proposition: valueProposition,
      target_customer_profile: targetCustomerProfile,
      key_products_services: keyProductsServices,
      communication_guidelines: communicationGuidelines,
    });
  };

  const handleCancel = () => {
    if (settings) {
      setBusinessDescription(settings.business_description || '');
      setTeamMission(settings.team_mission || '');
      setValueProposition(settings.value_proposition || '');
      setTargetCustomerProfile(settings.target_customer_profile || '');
      setKeyProductsServices(settings.key_products_services || '');
      setCommunicationGuidelines(settings.communication_guidelines || '');
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Context Settings</CardTitle>
        <CardDescription>
          Configure permanent business context that will help AI generate better, more focused communications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            These settings are automatically included in all AI-generated communications to ensure consistency 
            with your team's business direction and communication style. Only administrators can edit these settings.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-description">Business Description</Label>
            <Textarea
              id="business-description"
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              disabled={!isEditing}
              placeholder="Describe what your business does and your core offerings..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-mission">Team Mission & Goals</Label>
            <Textarea
              id="team-mission"
              value={teamMission}
              onChange={(e) => setTeamMission(e.target.value)}
              disabled={!isEditing}
              placeholder="What is your team's mission and what goals are you working towards..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value-proposition">Value Proposition</Label>
            <Textarea
              id="value-proposition"
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              disabled={!isEditing}
              placeholder="What makes your offering unique and valuable to customers..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-customer">Target Customer Profile</Label>
            <Textarea
              id="target-customer"
              value={targetCustomerProfile}
              onChange={(e) => setTargetCustomerProfile(e.target.value)}
              disabled={!isEditing}
              placeholder="Describe your ideal customer profile, industries, company sizes, decision makers..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key-products">Key Products & Services</Label>
            <Textarea
              id="key-products"
              value={keyProductsServices}
              onChange={(e) => setKeyProductsServices(e.target.value)}
              disabled={!isEditing}
              placeholder="List and describe your key products, services, and solutions..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="communication-guidelines">Communication Guidelines</Label>
            <Textarea
              id="communication-guidelines"
              value={communicationGuidelines}
              onChange={(e) => setCommunicationGuidelines(e.target.value)}
              disabled={!isEditing}
              placeholder="Define your preferred communication style, tone, key messages, things to emphasize or avoid..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {settings?.updated_at && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(settings.updated_at).toLocaleString()}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Edit Business Context
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
