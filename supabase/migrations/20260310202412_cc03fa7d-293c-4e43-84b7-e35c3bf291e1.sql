
-- Fix remaining security definer views: companies_decrypted and companies_financial_masked

DROP VIEW IF EXISTS public.companies_decrypted;
CREATE VIEW public.companies_decrypted
WITH (security_invoker = true)
AS
SELECT 
    id,
    company_name,
    industry_type,
    segment,
    website_url,
    CASE
        WHEN can_access_field(auth.uid(), 'companies'::text, 'primary_email'::text) THEN COALESCE(decrypt_text(primary_email_encrypted), (primary_email)::text)
        ELSE mask_pii_field((primary_email)::text, 'companies'::text, 'primary_email'::text)
    END AS primary_email,
    CASE
        WHEN can_access_field(auth.uid(), 'companies'::text, 'primary_phone'::text) THEN COALESCE(decrypt_text(primary_phone_encrypted), primary_phone)
        ELSE mask_pii_field(primary_phone, 'companies'::text, 'primary_phone'::text)
    END AS primary_phone,
    address_line1,
    city,
    state,
    zip,
    status,
    annual_revenue_range,
    priority_tier,
    lead_score,
    linkedin_company_url,
    created_by,
    assigned_to,
    assigned_to_sales_rep_id,
    years_in_business,
    total_employees,
    encryption_version,
    created_at,
    updated_at
FROM companies
WHERE (auth.uid() IS NOT NULL)
  AND is_user_approved(auth.uid())
  AND (has_elevated_access(auth.uid()) OR created_by = auth.uid() OR assigned_to = auth.uid());

DROP VIEW IF EXISTS public.companies_financial_masked;
CREATE VIEW public.companies_financial_masked
WITH (security_invoker = true)
AS
SELECT 
    id,
    company_name,
    industry_type,
    annual_revenue_range,
    financial_health_rating,
    profitability_level,
    created_at,
    updated_at
FROM companies
WHERE (auth.uid() IS NOT NULL)
  AND is_user_approved(auth.uid())
  AND (has_elevated_access(auth.uid()) OR created_by = auth.uid());
