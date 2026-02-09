import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Linkedin, Mail, Phone, UserPlus, Search, Loader2, Globe, Building2 } from "lucide-react";
import { toast } from "sonner";
import { createContact } from "@/lib/contacts/createContact";

interface ApolloContact {
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  organizationName: string | null;
  organizationDomain: string | null;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  apolloId: string;
  source: string;
}

interface ExternalContactSearchPanelProps {
  searchTerm: string;
  localResultsCount: number;
  onContactImported: () => void;
}

export function ExternalContactSearchPanel({
  searchTerm,
  localResultsCount,
  onContactImported,
}: ExternalContactSearchPanelProps) {
  const [apolloResults, setApolloResults] = useState<ApolloContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [totalResults, setTotalResults] = useState(0);

  const searchApollo = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      toast.error("Please enter at least 2 characters to search");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-contacts-by-name", {
        body: { personName: searchTerm.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Search failed");

      setApolloResults(data.contacts || []);
      setTotalResults(data.totalResults || 0);

      if ((data.contacts || []).length === 0) {
        toast.info("No external results found for this search");
      }
    } catch (error: any) {
      console.error("Apollo search error:", error);
      toast.error(error.message || "External search failed");
      setApolloResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const importContact = async (contact: ApolloContact) => {
    setImportingIds((prev) => new Set(prev).add(contact.apolloId));

    try {
      // Find or skip company association
      let companyId: string | undefined;

      if (contact.organizationName) {
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .ilike("company_name", contact.organizationName)
          .limit(1)
          .maybeSingle();

        companyId = existingCompany?.id;
      }

      if (!companyId) {
        toast.error(
          `No matching company found for "${contact.organizationName || 'Unknown'}". Please create the company first, then add this contact.`
        );
        setImportingIds((prev) => {
          const next = new Set(prev);
          next.delete(contact.apolloId);
          return next;
        });
        return;
      }

      await createContact({
        first_name: contact.firstName || "",
        last_name: contact.lastName || "",
        title: contact.title || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: "",
        linkedin_url: contact.linkedinUrl || "",
        company_id: companyId,
        decision_tier: "Influencer",
        preferred_contact_method: "Email",
        notes: `Imported from Apollo. ${contact.city ? `Location: ${contact.city}, ${contact.state || ""}` : ""}`.trim(),
      });

      toast.success(`${contact.firstName} ${contact.lastName} imported successfully!`);
      onContactImported();

      // Remove from results
      setApolloResults((prev) => prev.filter((c) => c.apolloId !== contact.apolloId));
    } catch (error: any) {
      toast.error(error.message || "Failed to import contact");
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(contact.apolloId);
        return next;
      });
    }
  };

  if (!searchTerm.trim() || searchTerm.trim().length < 2) return null;

  return (
    <div className="space-y-3">
      {/* Search Apollo Button */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
        <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <p className="text-sm">
            {localResultsCount === 0 ? (
              <span>No local contacts match "<strong>{searchTerm}</strong>". Search externally?</span>
            ) : (
              <span>Found {localResultsCount} local result{localResultsCount !== 1 ? "s" : ""}. Want to also search Apollo?</span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={searchApollo}
          disabled={isSearching}
          className="shrink-0"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search Apollo
        </Button>
      </div>

      {/* Apollo Results */}
      {hasSearched && apolloResults.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Apollo Results
              <Badge variant="secondary" className="ml-1">{totalResults} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="divide-y divide-border">
              {apolloResults.map((contact) => (
                <div key={contact.apolloId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                    {contact.firstName?.[0]}{contact.lastName?.[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.title && (
                      <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
                    )}
                    {contact.organizationName && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contact.organizationName}
                      </p>
                    )}
                  </div>

                  {/* Contact icons */}
                  <div className="flex gap-1 shrink-0">
                    {contact.email && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <a href={`mailto:${contact.email}`} title={contact.email}>
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {contact.phone && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <a href={`tel:${contact.phone}`} title={contact.phone}>
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {contact.linkedinUrl && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Import button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => importContact(contact)}
                    disabled={importingIds.has(contact.apolloId)}
                    className="shrink-0"
                  >
                    {importingIds.has(contact.apolloId) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )}
                    Import
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasSearched && apolloResults.length === 0 && !isSearching && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No external results found for "{searchTerm}"
        </p>
      )}
    </div>
  );
}
