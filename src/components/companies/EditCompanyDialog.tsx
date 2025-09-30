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

interface Company {
  id: string;
  company_name: string;
  industry_type: string;
  builder_segment: string | null;
  contractor_segment: string | null;
  status: string;
  website_url: string | null;
  primary_phone: string | null;
  is_franchise: boolean;
  parent_company_id: string | null;
  franchise_name?: string | null;
  owner_name?: string | null;
  city?: string | null;
  nest_pro_industry?: string | null;
  notes?: string | null;
}

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  company: Company;
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

const statuses = ["Lead", "Contacted", "Engaged", "Pilot", "Active", "Inactive", "Lost"];

export function EditCompanyDialog({ open, onOpenChange, onSuccess, company }: EditCompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; company_name: string }[]>([]);
  const [formData, setFormData] = useState({
    company_name: company.company_name,
    industry_type: company.industry_type as "Builder" | "Contractor",
    segment: (company.builder_segment || company.contractor_segment) || "",
    status: company.status,
    website_url: company.website_url || "",
    primary_phone: company.primary_phone || "",
    is_franchise: company.is_franchise,
    parent_company_id: company.parent_company_id || "",
    franchise_name: company.franchise_name || "",
    owner_name: company.owner_name || "",
    city: company.city || "",
    nest_pro_industry: company.nest_pro_industry || "",
    notes: company.notes || "",
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
      .neq("id", company.id)
      .order("company_name");
    if (data) setCompanies(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        company_name: formData.company_name,
        status: formData.status,
        website_url: formData.website_url || null,
        primary_phone: formData.primary_phone || null,
        is_franchise: formData.is_franchise,
        parent_company_id: formData.parent_company_id || null,
        franchise_name: formData.franchise_name || null,
        owner_name: formData.owner_name || null,
        city: formData.city || null,
        nest_pro_industry: formData.nest_pro_industry || null,
        notes: formData.notes || null,
      };

      if (formData.industry_type === "Builder") {
        updateData.builder_segment = formData.segment;
      } else {
        updateData.contractor_segment = formData.segment;
      }

      const { error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", company.id);

      if (error) throw error;

      toast.success("Company updated successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update company");
    } finally {
      setLoading(false);
    }
  };

  const segments = formData.industry_type === "Builder" ? builderSegments : contractorSegments;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>
            Update company details and status.
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
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="segment">Segment *</Label>
              <Select value={formData.segment} onValueChange={(value) => setFormData({ ...formData, segment: value })}>
                <SelectTrigger>
                  <SelectValue />
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
