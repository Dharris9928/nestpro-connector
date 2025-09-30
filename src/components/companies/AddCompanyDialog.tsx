import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const builderSegments = [
  "Production/Tract Builders",
  "Regional Mid-Volume Builders",
  "Spec Home Builders",
  "Luxury Custom Builders",
  "Multi-Family Developers",
  "Affordable Housing Builders",
  "Active Adult/55+ Specialists",
];

const contractorSegments = [
  "Smart Home Champions",
  "Customer Experience Innovators",
  "High-Volume Installers",
  "Premium Service Specialists",
  "Regional Growth Contractors",
  "Specialty HVAC Integrators",
  "Service-First Traditionalists",
  "Emergency/Repair Specialists",
];

export function AddCompanyDialog({ open, onOpenChange, onSuccess }: AddCompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [formData, setFormData] = useState({
    company_name: "",
    industry_type: "Builder" as "Builder" | "Contractor",
    segment: "",
    website_url: "",
    primary_phone: "",
    is_franchise: false,
    parent_company_id: "",
    franchise_name: "",
    owner_name: "",
    city: "",
    nest_pro_industry: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadCompanies();
    }
  }, [open]);

  const loadCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, company_name")
      .order("company_name");
    if (data) setCompanies(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const companyData: any = {
        company_name: formData.company_name,
        industry_type: formData.industry_type,
        website_url: formData.website_url || null,
        primary_phone: formData.primary_phone || null,
        is_franchise: formData.is_franchise,
        parent_company_id: formData.parent_company_id || null,
        franchise_name: formData.franchise_name || null,
        owner_name: formData.owner_name || null,
        city: formData.city || null,
        nest_pro_industry: formData.nest_pro_industry || null,
        notes: formData.notes || null,
        created_by: user.id,
      };

      if (formData.industry_type === "Builder") {
        companyData.builder_segment = formData.segment;
      } else {
        companyData.contractor_segment = formData.segment;
      }

      const { error } = await supabase.from("companies").insert([companyData]);

      if (error) throw error;

      toast.success("Company added successfully!");
      setFormData({
        company_name: "",
        industry_type: "Builder",
        segment: "",
        website_url: "",
        primary_phone: "",
        is_franchise: false,
        parent_company_id: "",
        franchise_name: "",
        owner_name: "",
        city: "",
        nest_pro_industry: "",
        notes: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add company");
    } finally {
      setLoading(false);
    }
  };

  const segments = formData.industry_type === "Builder" ? builderSegments : contractorSegments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Enter the company details to add them to your CRM.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry_type">Industry Type *</Label>
              <Select
                value={formData.industry_type}
                onValueChange={(value: "Builder" | "Contractor") =>
                  setFormData({ ...formData, industry_type: value, segment: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Builder">Builder</SelectItem>
                  <SelectItem value="Contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="segment">Segment *</Label>
              <Select value={formData.segment} onValueChange={(value) => setFormData({ ...formData, segment: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a segment" />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((segment) => (
                    <SelectItem key={segment} value={segment}>
                      {segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://example.com"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="primary_phone">Phone Number</Label>
              <Input
                id="primary_phone"
                type="tel"
                value={formData.primary_phone}
                onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_franchise"
                checked={formData.is_franchise}
                onCheckedChange={(checked) => setFormData({ ...formData, is_franchise: checked as boolean })}
              />
              <Label htmlFor="is_franchise" className="cursor-pointer">
                Part of a franchise or parent company
              </Label>
            </div>
            {formData.is_franchise && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="parent_company_id">Parent Company</Label>
                  <Select
                    value={formData.parent_company_id}
                    onValueChange={(value) => setFormData({ ...formData, parent_company_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="franchise_name">Franchise Name</Label>
                  <Input
                    id="franchise_name"
                    value={formData.franchise_name}
                    onChange={(e) => setFormData({ ...formData, franchise_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="owner_name">Owner</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nest_pro_industry">Nest Pro Industry</Label>
                  <Input
                    id="nest_pro_industry"
                    value={formData.nest_pro_industry}
                    onChange={(e) => setFormData({ ...formData, nest_pro_industry: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
