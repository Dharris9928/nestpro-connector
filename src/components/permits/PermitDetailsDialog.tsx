import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building, MapPin, Calendar, DollarSign, User, Phone, Mail } from "lucide-react";

interface PermitDetailsDialogProps {
  permit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const PermitDetailsDialog = ({
  permit,
  open,
  onOpenChange,
  onUpdate
}: PermitDetailsDialogProps) => {
  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{permit.project_name}</DialogTitle>
          <div className="flex gap-2 mt-2">
            {permit.is_high_value && (
              <Badge variant="destructive">High Value</Badge>
            )}
            {permit.is_matched_to_company ? (
              <Badge variant="secondary">Matched to Company</Badge>
            ) : (
              <Badge variant="outline">Unmatched</Badge>
            )}
            {permit.status && <Badge>{permit.status}</Badge>}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {permit.project_description && (
            <div>
              <h3 className="font-semibold mb-2">Project Description</h3>
              <p className="text-sm text-muted-foreground">{permit.project_description}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Project Details
                </h3>
                <dl className="space-y-2 text-sm">
                  {permit.permit_number && (
                    <>
                      <dt className="text-muted-foreground">Permit Number</dt>
                      <dd className="font-medium">{permit.permit_number}</dd>
                    </>
                  )}
                  {permit.num_units && (
                    <>
                      <dt className="text-muted-foreground">Number of Units</dt>
                      <dd className="font-medium">{permit.num_units}</dd>
                    </>
                  )}
                  {permit.estimated_value && (
                    <>
                      <dt className="text-muted-foreground">Estimated Value</dt>
                      <dd className="font-medium">{formatCurrency(permit.estimated_value)}</dd>
                    </>
                  )}
                  {permit.project_type && (
                    <>
                      <dt className="text-muted-foreground">Project Type</dt>
                      <dd className="font-medium">{permit.project_type}</dd>
                    </>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <dl className="space-y-2 text-sm">
                  {permit.address_line1 && (
                    <>
                      <dt className="text-muted-foreground">Address</dt>
                      <dd className="font-medium">{permit.address_line1}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">City, State</dt>
                  <dd className="font-medium">{permit.city}, {permit.state}</dd>
                  {permit.zip && (
                    <>
                      <dt className="text-muted-foreground">ZIP Code</dt>
                      <dd className="font-medium">{permit.zip}</dd>
                    </>
                  )}
                  {permit.region && (
                    <>
                      <dt className="text-muted-foreground">Region</dt>
                      <dd className="font-medium">{permit.region}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Builder/Developer
                </h3>
                <dl className="space-y-2 text-sm">
                  <dt className="text-muted-foreground">Company Name</dt>
                  <dd className="font-medium">
                    {permit.builder_company?.company_name || permit.builder_name || 'Unknown'}
                  </dd>
                  {permit.builder_company && (
                    <>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant="secondary">{permit.builder_company.status}</Badge>
                      </dd>
                    </>
                  )}
                </dl>
              </div>

              {(permit.applicant_name || permit.applicant_phone || permit.applicant_email) && (
                <div>
                  <h3 className="font-semibold mb-2">Contact Information</h3>
                  <dl className="space-y-2 text-sm">
                    {permit.applicant_name && (
                      <>
                        <dt className="text-muted-foreground">Applicant</dt>
                        <dd className="font-medium">{permit.applicant_name}</dd>
                      </>
                    )}
                    {permit.applicant_phone && (
                      <>
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Phone
                        </dt>
                        <dd className="font-medium">{permit.applicant_phone}</dd>
                      </>
                    )}
                    {permit.applicant_email && (
                      <>
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </dt>
                        <dd className="font-medium">{permit.applicant_email}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h3>
                <dl className="space-y-2 text-sm">
                  {permit.filed_date && (
                    <>
                      <dt className="text-muted-foreground">Filed Date</dt>
                      <dd className="font-medium">{formatDate(permit.filed_date)}</dd>
                    </>
                  )}
                  {permit.issued_date && (
                    <>
                      <dt className="text-muted-foreground">Issued Date</dt>
                      <dd className="font-medium">{formatDate(permit.issued_date)}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {permit.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{permit.notes}</p>
              </div>
            </>
          )}

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {permit.builder_company && (
              <Button onClick={() => window.location.href = `/companies?id=${permit.builder_company.id}`}>
                View Company
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
