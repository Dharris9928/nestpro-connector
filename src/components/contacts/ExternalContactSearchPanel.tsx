import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Linkedin,
  Mail,
  Phone,
  UserPlus,
  Search,
  Loader2,
  Globe,
  Building2,
  MapPin,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { createContact } from "@/lib/contacts/createContact";

interface ApolloContact {
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedinUrl: string | null;
  organizationName: string | null;
  organizationDomain: string | null;
  organizationWebsite: string | null;
  organizationLinkedin: string | null;
  organizationIndustry: string | null;
  organizationEmployees: number | null;
  organizationRevenue: string | null;
  organizationCity: string | null;
  organizationState: string | null;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  headline: string | null;
  seniority: string | null;
  departments: string[];
  apolloId: string;
  source: string;
}

type SearchType = "name" | "email" | "phone" | "linkedin";

interface ExternalContactSearchPanelProps {
  searchTerm: string;
  localResultsCount: number;
  onContactImported: () => void;
}

function determineDecisionTier(seniority: string | null, title: string | null): "Primary" | "Secondary" | "Influencer" {
  const s = (seniority || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (["owner", "founder", "c_suite", "cxo"].some((k) => s.includes(k)) ||
      ["ceo", "president", "owner", "founder"].some((k) => t.includes(k))) {
    return "Primary";
  }
  if (["vp", "director", "head"].some((k) => s.includes(k)) ||
      ["vp", "vice president", "director", "cto", "coo", "cfo"].some((k) => t.includes(k))) {
    return "Secondary";
  }
  return "Influencer";
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
  const [searchType, setSearchType] = useState<SearchType>("name");
  const [externalSearchValue, setExternalSearchValue] = useState("");

  const getEffectiveSearchValue = () => {
    return externalSearchValue.trim() || searchTerm.trim();
  };

  const searchApollo = async () => {
    const value = getEffectiveSearchValue();
    if (!value || value.length < 2) {
      toast.error("Please enter at least 2 characters to search");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const body: Record<string, string> = { searchType };
      if (searchType === "name") body.personName = value;
      else if (searchType === "email") body.email = value;
      else if (searchType === "phone") body.phone = value;
      else if (searchType === "linkedin") body.linkedinUrl = value;

      const { data, error } = await supabase.functions.invoke("search-contacts-by-name", { body });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Search failed");

      setApolloResults(data.contacts || []);
      setTotalResults(data.totalResults || 0);

      if ((data.contacts || []).length === 0) {
        toast.info("No external results found");
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
      // Find or create company
      let companyId: string | undefined;

      if (contact.organizationName) {
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .ilike("company_name", contact.organizationName)
          .limit(1)
          .maybeSingle();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          // Auto-create the company with all Apollo org data
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Not authenticated");

          const { data: newCompany, error: companyError } = await supabase
            .from("companies")
            .insert({
              company_name: contact.organizationName,
              industry_type: "Contractor",
              created_by: user.id,
              website_url: contact.organizationWebsite || contact.organizationDomain ? `https://${contact.organizationDomain}` : null,
              linkedin_company_url: contact.organizationLinkedin || null,
              city: contact.organizationCity || null,
              state: contact.organizationState || null,
              total_employees: contact.organizationEmployees || null,
              status: "New",
              notes: [
                `Imported from Apollo.`,
                contact.organizationIndustry ? `Industry: ${contact.organizationIndustry}` : null,
                contact.organizationRevenue ? `Revenue: ${contact.organizationRevenue}` : null,
              ].filter(Boolean).join(" | "),
            })
            .select("id")
            .single();

          if (companyError) throw companyError;
          companyId = newCompany.id;
          toast.info(`Company "${contact.organizationName}" was also created.`);
        }
      }

      if (!companyId) {
        toast.error("No company information available for this contact. Please create a company first.");
        setImportingIds((prev) => {
          const next = new Set(prev);
          next.delete(contact.apolloId);
          return next;
        });
        return;
      }

      const decisionTier = determineDecisionTier(contact.seniority, contact.title);

      await createContact({
        first_name: contact.firstName || "",
        last_name: contact.lastName || "",
        title: contact.title || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        linkedin_url: contact.linkedinUrl || "",
        company_id: companyId,
        decision_tier: decisionTier,
        preferred_contact_method: contact.email ? "Email" : contact.phone ? "Phone" : contact.linkedinUrl ? "LinkedIn" : "Email",
        notes: [
          `Imported from Apollo.`,
          contact.headline ? `Headline: ${contact.headline}` : null,
          contact.city ? `Location: ${contact.city}${contact.state ? `, ${contact.state}` : ""}${contact.country ? `, ${contact.country}` : ""}` : null,
          contact.seniority ? `Seniority: ${contact.seniority}` : null,
          contact.departments?.length ? `Departments: ${contact.departments.join(", ")}` : null,
        ].filter(Boolean).join(" | "),
      });

      toast.success(`${contact.firstName} ${contact.lastName} imported successfully!`);
      onContactImported();
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

  const searchTypeLabels: Record<SearchType, { label: string; placeholder: string; icon: React.ReactNode }> = {
    name: { label: "Name", placeholder: "e.g. John Smith", icon: <Search className="h-4 w-4" /> },
    email: { label: "Email", placeholder: "e.g. john@company.com", icon: <Mail className="h-4 w-4" /> },
    phone: { label: "Phone", placeholder: "e.g. 555-123-4567", icon: <Phone className="h-4 w-4" /> },
    linkedin: { label: "LinkedIn", placeholder: "e.g. linkedin.com/in/john-smith", icon: <Linkedin className="h-4 w-4" /> },
  };

  const showPanel = searchTerm.trim().length >= 2 || externalSearchValue.trim().length >= 2;

  if (!showPanel) return null;

  return (
    <div className="space-y-3">
      {/* External Search Controls */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm font-medium">
            {localResultsCount === 0
              ? `No local contacts match "${searchTerm}". Search Apollo externally?`
              : `Found ${localResultsCount} local result${localResultsCount !== 1 ? "s" : ""}. Also search Apollo?`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {searchTypeLabels[searchType].icon}
            </div>
            <Input
              placeholder={searchTypeLabels[searchType].placeholder}
              value={externalSearchValue || (searchType === "name" ? searchTerm : "")}
              onChange={(e) => setExternalSearchValue(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && searchApollo()}
            />
          </div>

          <Button onClick={searchApollo} disabled={isSearching} className="shrink-0">
            {isSearching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search Apollo
          </Button>
        </div>
      </div>

      {/* Apollo Results */}
      {hasSearched && apolloResults.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Apollo Results
              <Badge variant="secondary" className="ml-1">
                {apolloResults.length} of {totalResults}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="divide-y divide-border">
              {apolloResults.map((contact) => (
                <div key={contact.apolloId} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  {/* Avatar */}
                  {contact.photoUrl ? (
                    <img
                      src={contact.photoUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm shrink-0">
                      {contact.firstName?.[0]}
                      {contact.lastName?.[0]}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-medium text-sm truncate">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.title && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        {contact.title}
                      </p>
                    )}
                    {contact.organizationName && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {contact.organizationName}
                        {contact.organizationIndustry && (
                          <span className="text-muted-foreground/60">• {contact.organizationIndustry}</span>
                        )}
                      </p>
                    )}
                    {(contact.city || contact.state) && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {[contact.city, contact.state, contact.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {/* Contact details preview */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {contact.email && (
                        <Badge variant="outline" className="text-xs font-normal gap-1 py-0">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </Badge>
                      )}
                      {contact.phone && (
                        <Badge variant="outline" className="text-xs font-normal gap-1 py-0">
                          <Phone className="h-3 w-3" /> {contact.phone}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {contact.linkedinUrl && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" title="View LinkedIn">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => importContact(contact)}
                      disabled={importingIds.has(contact.apolloId)}
                    >
                      {importingIds.has(contact.apolloId) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-1" />
                      )}
                      Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasSearched && apolloResults.length === 0 && !isSearching && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No external results found
        </p>
      )}
    </div>
  );
}
