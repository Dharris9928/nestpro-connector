import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";

// Beta types are not published on supabase-js yet.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve full consent URL so /auth returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = `/auth?next=${encodeURIComponent(next)}`;
        return;
      }
      setUserEmail(sess.session.user?.email ?? null);

      const oauth = (supabase.auth as any).oauth as OAuthNs | undefined;
      if (!oauth) {
        setError("OAuth namespace unavailable in this Supabase client build.");
        return;
      }

      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message ?? String(error));

      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = (supabase.auth as any).oauth as OAuthNs;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message ?? String(error));
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Authorization error</CardTitle>
            <CardDescription>Could not load this authorization request.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";
  const redirectUri =
    details.client?.redirect_uris?.[0] ?? details.redirect_url ?? details.redirect_to ?? "";
  const scopes: string[] = Array.isArray(details.scopes)
    ? details.scopes
    : typeof details.scope === "string"
    ? details.scope.split(/\s+/).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Connect {clientName} to Nest Pro Connector</CardTitle>
          </div>
          <CardDescription>
            This lets {clientName} use this app as you. It does not bypass this app's
            permissions or backend policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userEmail && (
            <div className="text-sm">
              <span className="text-muted-foreground">Signed in as: </span>
              <span className="font-medium">{userEmail}</span>
            </div>
          )}
          {redirectUri && (
            <div className="text-xs text-muted-foreground break-all">
              <span className="font-medium text-foreground">Redirect: </span>
              {redirectUri}
            </div>
          )}
          {scopes.length > 0 && (
            <div className="text-sm">
              <p className="font-medium mb-1">Requested access</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {scopes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => decide(false)}
            >
              Cancel connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
