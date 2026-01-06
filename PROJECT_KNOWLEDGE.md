# CRM Project Knowledge Base

## Version 4.3 | Last Updated: 2026-01-06

This document contains critical project knowledge for maintaining and extending the CRM system. All AI assistants and developers should reference this when making changes.

## What's New in v4.3

### Pipeline Analytics
- **Full Sales Funnel Tracking**: End-to-end pipeline visibility from outreach to closed deals
- **Closed Deal Tracking**: Manually mark opportunities as "Closed Won" to track wins
- **7-Stage Funnel**: Sent → Opened → Responded → Scheduled → Completed → Assigned → **Closed**
- **Conversion Rates**: Automatic calculation at each stage including Close Rate
- **Closed Deal Value**: Aggregated revenue from won opportunities
- **Period Comparison**: Compare current vs previous period for all metrics
- **Key Files**:
  - `src/pages/PipelineAnalytics.tsx` - Main page component
  - `src/hooks/usePipelineAnalytics.ts` - Data fetching and metrics calculation
  - `src/components/pipeline/ClosedDealsCard.tsx` - Closed deals detail card
- **How It Works**: Opportunities with `stage = 'closed_won'` count as closed deals

### Previous Features (v4.2)

## 1. Core Business Rules & Lead Scoring System

### Lead Scoring Algorithms

The system uses **industry-specific scoring algorithms** that route through `src/lib/scoring/leadScoring.ts`:

- **Builder Industry** → Uses `calculateBuilderScore()` from `builderScoring.ts`
- **All Other Industries** (Contractor, Energy Implementer, Engineer/Architect, Partner/Other) → Uses `calculateContractorScore()` from `contractorScoring.ts`

### Scoring Categories & Point Distribution

**Builder Scoring (Max 100 points):**
- Firmographic Factors: 50 points
  - Volume Score: 15 points (based on `annual_volume` range)
  - Price Point Score: 10 points (based on `price_point` range)
  - Geographic Score: 10 points (based on `state` - Sun Belt prioritized)
  - Stability Score: 15 points (based on `years_in_business` range)
- Digital Engagement: 30 points
  - Website Quality: 10 points
  - LinkedIn Activity: 10 points
  - Technology Adoption: 10 points (based on installations)
- Contact Quality: 20 points
  - Decision Authority: 10 points (based on contact titles)
  - LinkedIn Professionalism: 10 points (connections, activity)

**Contractor Scoring (Max 100 points):**
- Firmographic Factors: 50 points
  - Volume Score: 15 points (based on `annual_volume`)
  - Revenue Score: 10 points (based on `estimated_revenue`)
  - Business Model Score: 10 points (based on `business_model`)
  - Geographic Score: 10 points (Sun Belt states prioritized)
  - Stability Score: 5 points (based on `years_in_business`)
- Digital Engagement: 30 points (same as Builder)
- Contact Quality: 20 points (same as Builder)

### Priority Tier Assignment

Automatically calculated via `assignPriorityTier()` in `sharedScoring.ts`:

- **P1 (Hot Leads)**: 80-100 points - High priority, immediate action
- **P2 (Warm Leads)**: 60-79 points - Medium priority, follow-up soon
- **P3 (Cold Leads)**: 40-59 points - Low priority, nurture campaigns
- **Unscored**: <40 points - Needs more data or disqualified

### Confidence Levels

Based on data completeness via `calculateConfidence()` in `sharedScoring.ts`:

- **High (90%+)**: 8+ data points present (name, contact, volume, state, etc.)
- **Medium (70-89%)**: 5-7 data points present
- **Low (<70%)**: <5 data points present

Maps to database format: `'High 90%+'`, `'Medium 70-89%'`, `'Low <70%'`

### Range-Based Scoring Engine

The `rangeScoringEngine.ts` provides dynamic scoring from the `scoring_configuration` table:

```typescript
// Get score for a specific field value
getScoreForRange(fieldName, rangeValue, industryType)

// Example: Annual volume of "$5M-$10M" for Builder industry
// Returns the configured score points from scoring_configuration table
```

This allows non-technical users to adjust scoring weights via database configuration without code changes.

### Scoring Triggers & Recalculation

- **Automatic Trigger**: `auto_assign_priority_tier()` runs on companies table INSERT/UPDATE
- **Manual Recalculation**: Available via UI in Reports section
- **Batch Recalculation**: `recalculate-contractor-scores` edge function for bulk updates
- **Dependencies**: Scoring recalculates when contacts or installations change via `mark_company_for_recalculation()` trigger

---

## 2. Architecture & Design Patterns

### Database Architecture

**CRITICAL RULES:**

1. **NEVER reference `auth.users` directly** - Always use the `profiles` table for user data
2. **All tables MUST have RLS policies** - No table should be accessible without proper authorization
3. **Use Security Definer Functions** for RLS policy checks to avoid infinite recursion:
   - `has_role(_user_id, _role)` - Check specific role
   - `has_elevated_access(_user_id)` - Check admin or sales_manager
   - `get_user_role(_user_id)` - Get user's role
   - `is_user_approved(_user_id)` - Check approval status
   - `can_access_company(_user_id, _company_id)` - Check company access

4. **Ownership & Assignment Tracking:**
   - `created_by` field: User who created the record
   - `assigned_to_sales_rep_id` field: User assigned to manage the record
   - Both are used for perspective filtering

### Perspective Filtering System

**THE MOST IMPORTANT PATTERN IN THE CRM**

All data views MUST respect the user's perspective filter. This is implemented via `usePerspective()` hook.

**Three Perspective Types:**

1. **`my_records`**: Only records where `created_by = auth.uid()`
2. **`assigned_to_me`**: Only records where `assigned_to_sales_rep_id = auth.uid()`
3. **`all_records`**: All records (requires elevated access: admin or sales_manager)

**Implementation Pattern:**

```typescript
import { usePerspective } from '@/hooks/usePerspective';

// In component
const { perspective, setPerspective } = usePerspective('my_records', 'companies');

// In query
let query = supabase.from('companies').select('*');

if (perspective === 'my_records') {
  query = query.eq('created_by', user.id);
} else if (perspective === 'assigned_to_me') {
  query = query.eq('assigned_to_sales_rep_id', user.id);
}
// all_records = no filter (but RLS still applies)
```

**Where to Apply:**
- ✅ Company lists and tables
- ✅ Contact lists (via company relationship)
- ✅ Opportunity lists
- ✅ Activity lists
- ✅ **Dashboard components** (PriorityDistribution, SegmentPerformance, SmartRecommendations)
- ✅ Report generation
- ✅ Export operations

**Persistence:**
- Stored in localStorage via `PERSPECTIVE_STORAGE_KEY`
- Tracked in `perspective_usage_analytics` table for insights
- Session-based tracking via `session_id`

### Edge Function Standards

**Required Patterns for ALL Edge Functions:**

1. **CORS Headers** (always required):
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

2. **Lovable AI Integration** (default for AI features):
```typescript
// Use Lovable AI Gateway - NO API KEY REQUIRED
const LOVABLE_AI_URL = 'https://lovable.app/api/ai';

const response = await fetch(LOVABLE_AI_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Environment': 'production',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash', // Default recommended model
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
  }),
});
```

**Supported Models:**
- `google/gemini-2.5-pro` - Best for complex reasoning, multimodal
- `google/gemini-2.5-flash` - **RECOMMENDED DEFAULT** - Balanced performance
- `google/gemini-2.5-flash-lite` - Fastest for simple tasks
- `openai/gpt-5` - Most powerful, expensive
- `openai/gpt-5-mini` - Good balance
- `openai/gpt-5-nano` - Speed focused

3. **Error Handling**:
```typescript
// Handle specific status codes
if (response.status === 429) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

if (response.status === 402) {
  return new Response(JSON.stringify({ error: 'Payment required' }), {
    status: 402,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

4. **Authorization**:
```typescript
import { verifyUser } from '../_shared/authorization.ts';

const { user, supabase } = await verifyUser(req);
// Now you have authenticated user and service role supabase client
```

5. **Rate Limiting**:
```typescript
import { checkRateLimit } from '../_shared/rateLimiting.ts';

const rateLimitResponse = await checkRateLimit(supabase, user.id, 'endpoint-name');
if (rateLimitResponse) return rateLimitResponse; // Rate limit exceeded
```

---

## 3. Role-Based Access Control (RBAC)

### Role Hierarchy

Defined in `app_role` enum (lowest to highest privilege):

1. **`read_only`**: View-only access, cannot create/update/delete
2. **`sales_rep`**: Standard user, can manage own records and assigned records
3. **`sales_manager`**: Team lead, can view team members' records + all records
4. **`admin`**: Full system access, user management, settings

### Access Patterns by Role

**Sales Rep (`sales_rep`):**
- ✅ View/Edit: Own records (`created_by = user.id`)
- ✅ View/Edit: Assigned records (`assigned_to_sales_rep_id = user.id`)
- ❌ Cannot: View other reps' records
- ❌ Cannot: Access admin settings
- ❌ Cannot: Approve users or deletions

**Sales Manager (`sales_manager`):**
- ✅ View/Edit: All records (elevated access)
- ✅ View: Team member assignments
- ✅ Assign: Records to team members
- ✅ Access: Reports and analytics
- ❌ Cannot: User management (create/delete users)
- ❌ Cannot: System settings

**Admin (`admin`):**
- ✅ Full access to all records
- ✅ User management (create, approve, delete users)
- ✅ System settings and configuration
- ✅ Deletion approvals
- ✅ Export approvals
- ✅ Security settings

**Read Only (`read_only`):**
- ✅ View: Records within perspective filter
- ❌ Cannot: Create, update, or delete any records
- ❌ Cannot: Export data (unless granted specific permission)

### Checking Permissions in Code

**Client-Side:**

```typescript
import { useUserRole } from '@/hooks/useUserRole';

const { data } = useUserRole();
const isAdmin = data?.role === 'admin';
const hasElevatedAccess = data?.hasElevatedAccess; // admin or sales_manager
```

**RLS Policies:**

```sql
-- Example: Sales reps see own + assigned records
CREATE POLICY "sales_reps_access" ON companies FOR SELECT USING (
  has_role(auth.uid(), 'sales_rep') 
  AND (created_by = auth.uid() OR assigned_to_sales_rep_id = auth.uid())
);

-- Example: Elevated access sees all
CREATE POLICY "elevated_access_all" ON companies FOR SELECT USING (
  has_elevated_access(auth.uid())
);
```

### Approval Workflow

**New User Registration:**
1. User signs up with email (must be in `allowed_email_domains`)
2. Profile created with `approval_status = 'pending'`
3. Default role: `sales_rep`
4. **Exception**: dharris9928@gmail.com auto-approved as admin
5. Admin must approve via Settings → User Management
6. Upon approval: `approval_status = 'approved'`, `approved_at = NOW()`
7. User can now access system

**Approval Required For:**
- User registration (except admin exception)
- Record deletion (via `deletion_requests` table)
- Large data exports (>threshold in `export_quotas`)

---

## 4. Security & Compliance Requirements

### Data Encryption

**Contact PII Encryption:**
- Fields: `email`, `phone`, `mobile`
- Encrypted fields: `email_encrypted`, `phone_encrypted`, `mobile_encrypted`
- Algorithm: AES-256 via `pgp_sym_encrypt()`
- Functions: `encrypt_text()`, `decrypt_text()` (security definer)
- Version tracking: `encryption_version` field
- Automatic: `auto_encrypt_contact_fields()` trigger on INSERT/UPDATE

**Company PII Encryption:**
- Fields: `primary_email`, `primary_phone`
- Encrypted fields: `primary_email_encrypted`, `primary_phone_encrypted`
- Same encryption scheme as contacts
- Automatic: `auto_encrypt_company_fields()` trigger

**Encryption Key Management:**
- Active key version stored in `encryption_config` table
- Key retrieval: `get_encryption_key()` function
- Batch migration: `batch_migrate_contacts_encryption(batch_size)`, `batch_migrate_companies_encryption(batch_size)`
- Audit log: All encryption operations logged in `encryption_audit_log`

### Access Logging & Auditing

**Contact Access Logging:**
- Every contact view/export logged in `contact_access_logs`
- Fields tracked: `user_id`, `contact_id`, `company_id`, `action`, `accessed_at`, `ip_address`
- Actions: `'VIEW'`, `'EXPORT'`, `'BULK_VIEW'`
- Helper functions in `src/lib/contacts/logContactAccess.ts`:
  - `logSingleContactView(contactId)`
  - `logBulkContactView(contactIds[])`
  - `logContactExport(contactIds[], format)`

**Bulk Access Alerts:**
- Automatic monitoring via `detect_bulk_contact_access()` trigger
- Threshold: 50+ contacts in 10 minutes
- Creates record in `bulk_access_alerts` table
- Alert types: `'BULK_CONTACT_ACCESS'`, `'BULK_EXPORT_DETECTED'`, `'BULK_COMMUNICATION_ACCESS'`
- Review via Settings → Security Dashboard

**IP Anonymization:**
- Raw IPs stored initially for security
- Anonymized after 30 days via scheduled job
- Function: `anonymize_ipv4(ip_addr)` - masks last octet

**Comprehensive Audit Logs:**
- `audit_logs`: All table changes (INSERT/UPDATE/DELETE)
- `auth_events_log`: Login attempts, MFA events
- `approval_audit_log`: User approval status changes
- `encryption_audit_log`: Encryption operations
- `export_logs`: Data export tracking with watermarks
- `api_audit_log`: API key usage tracking

### Email Domain Restrictions

- Only approved domains can register: `allowed_email_domains` table
- Check function: `check_email_domain_allowed(email_address)`
- Blocked attempts logged: `blocked_signup_attempts` table
- Disposable email detection supported
- Configure via Settings → Allowed Domains

### Export Quotas & Approvals

**Role-Based Export Limits:**
- Configured in `export_quotas` table
- Fields: `role`, `daily_limit`, `requires_approval_threshold`
- Check quota: `check_export_quota(_user_id, _record_count, _table_name)`
- Log export: `log_export_activity(_user_id, _table_name, _record_count, ...)`

**Approval Workflow:**
- Exports exceeding threshold require admin approval
- Request created in `export_approval_requests`
- Admin reviews via Settings → Export Approvals
- Status: `'pending'`, `'approved'`, `'rejected'`
- Expires after 24 hours if not reviewed

**Export Watermarking:**
- All exports include watermark: `"Exported by {user_id} on {timestamp}"`
- Stored in `export_logs.watermark` field
- Cannot be removed by users

### MFA (Multi-Factor Authentication)

**Role-Based MFA Requirements:**
- Configured in `mfa_requirements` table
- Fields: `role`, `is_required`, `grace_period_days`
- Check: `is_mfa_required(_user_id)` function
- Status tracked: `user_mfa_status` table

**MFA Enrollment:**
- Grace period (default 30 days) before enforcement
- Users prompted on login if MFA required
- Components: `MFAEnrollmentDialog`, `MFAVerificationDialog`, `MFAManagement`
- Hook: `useMFAStatus()` for checking MFA state

### Deletion Approval Workflow

**ALL deletions require approval** (except admins can delete immediately):

1. User requests deletion via `requestDeletion()` in `src/lib/deletion/requestDeletion.ts`
2. If user is admin: Immediate deletion
3. If not admin: Create record in `deletion_requests` table with `status = 'pending'`
4. Notification sent to admins via `send-deletion-request-notification` edge function
5. Admin reviews in Settings → Deletion Approvals
6. Upon approval: Record deleted, notification sent to requester
7. Upon rejection: Request marked rejected with reason

**Supported Tables:**
- `companies`
- `contacts`
- `outreach_activities`
- `pilot_programs`
- `training_certifications`

---

## 5. Critical File Locations

### Core Business Logic

**Lead Scoring:**
- Router: `src/lib/scoring/leadScoring.ts` - Routes to industry-specific scoring
- Builder: `src/lib/scoring/builderScoring.ts` - New home construction scoring
- Contractor: `src/lib/scoring/contractorScoring.ts` - Service business scoring
- Shared: `src/lib/scoring/sharedScoring.ts` - Common scoring functions
- Engine: `src/lib/scoring/rangeScoringEngine.ts` - Database-driven scoring

**Company Operations:**
- Create: `src/lib/companies/createCompany.ts`
- Update: `src/lib/companies/updateCompany.ts`
- Validation: `src/lib/validation/companyValidation.ts`, `schemas.ts`

**Contact Operations:**
- Create: `src/lib/contacts/createContact.ts`
- Access Logging: `src/lib/contacts/logContactAccess.ts`

**Other Operations:**
- Installations: `src/lib/installations/createInstallation.ts`
- CSV Import: `src/lib/prospecting/importApolloCSV.ts`
- Deletion: `src/lib/deletion/requestDeletion.ts`

### Critical Hooks

**Permissions & Access:**
- `src/hooks/useUserRole.ts` - Get user role and elevated access status
- `src/hooks/usePerspective.ts` - **MOST IMPORTANT** - Perspective filter state
- `src/hooks/useFieldPermissions.ts` - Field-level access control and PII masking
- `src/hooks/useRecordAccess.ts` - Request access to restricted records
- `src/hooks/useExportQuota.ts` - Check export quotas and log exports

**MFA & Security:**
- `src/hooks/useMFAStatus.ts` - Check MFA enrollment status
- `src/hooks/useSessionMonitor.ts` - Monitor user session for timeout

**Utility:**
- `src/hooks/useDebounce.ts` - Debounce input for search/filters
- `src/hooks/use-mobile.tsx` - Responsive design breakpoint detection

### Key Components

**Main Pages:**
- `src/pages/Dashboard.tsx` - Main dashboard with priority distribution
- `src/pages/Companies.tsx` - Company management with perspective filter
- `src/pages/Contacts.tsx` - Contact management
- `src/pages/Opportunities.tsx` - Sales opportunities
- `src/pages/Settings.tsx` - System settings and admin functions
- `src/pages/Help.tsx` - Help documentation and support

**Common Components:**
- `src/components/common/PerspectiveSelector.tsx` - Perspective filter dropdown
- `src/components/common/ProtectedField.tsx` - PII field with masking
- `src/components/common/RequestAccessButton.tsx` - Request field access
- `src/components/common/DeleteRecordDialog.tsx` - Deletion confirmation

**Layout:**
- `src/components/layout/AppLayout.tsx` - Main app layout wrapper
- `src/components/layout/AppSidebar.tsx` - Navigation sidebar
- `src/components/layout/NotificationBell.tsx` - Notifications dropdown
- `src/components/layout/SessionMonitorWrapper.tsx` - Session timeout monitor

### Edge Functions

**AI-Powered Features:**
- `supabase/functions/ai-error-helper/index.ts` - **NEW** AI error analysis (multimodal)
- `supabase/functions/ai-score-contacts/index.ts` - AI contact scoring
- `supabase/functions/ai-prioritize-leads/index.ts` - AI lead prioritization
- `supabase/functions/ai-outreach-strategy/index.ts` - AI outreach recommendations
- `supabase/functions/generate-communication/index.ts` - AI email generation

**Data Enrichment:**
- `supabase/functions/enrich-company/index.ts` - Deepseek company enrichment
- `supabase/functions/apollo-enrich/index.ts` - Apollo.io enrichment
- `supabase/functions/apollo-company-search/index.ts` - Company prospecting
- `supabase/functions/apollo-contact-search/index.ts` - Contact discovery
- `supabase/functions/force-apply-enrichment/index.ts` - Batch enrichment

**Admin Operations:**
- `supabase/functions/admin-create-user/index.ts` - User creation
- `supabase/functions/admin-update-user/index.ts` - User updates
- `supabase/functions/admin-reset-user-password/index.ts` - Password reset
- `supabase/functions/admin-database-management/index.ts` - Database operations
- `supabase/functions/merge-companies/index.ts` - Duplicate merging

**Notifications:**
- `supabase/functions/send-notification/index.ts` - General notifications
- `supabase/functions/send-approval-request-notification/index.ts` - Approval requests
- `supabase/functions/send-approval-status-notification/index.ts` - Approval decisions
- `supabase/functions/send-deletion-request-notification/index.ts` - Deletion requests
- `supabase/functions/send-activity-assignment-notification/index.ts` - Activity assignments
- `supabase/functions/send-password-reset-notification/index.ts` - Password resets

**Utilities:**
- `supabase/functions/recalculate-contractor-scores/index.ts` - Batch scoring
- `supabase/functions/export-user-data/index.ts` - GDPR data export
- `supabase/functions/sync-to-warehouse/index.ts` - Data warehouse sync
- `supabase/functions/verify-email-domain/index.ts` - Domain verification
- `supabase/functions/check-signup-rate-limit/index.ts` - Signup throttling

**Shared Utilities:**
- `supabase/functions/_shared/authorization.ts` - Auth helpers
- `supabase/functions/_shared/rateLimiting.ts` - Rate limit checking
- `supabase/functions/_shared/cors.ts` - CORS headers

---

## 6. Auto-Generated Files (NEVER EDIT)

These files are automatically generated and maintained by Supabase/Lovable Cloud. **DO NOT MODIFY THEM DIRECTLY.**

### Supabase Integration Files

1. **`src/integrations/supabase/client.ts`**
   - Supabase client initialization
   - Auto-configured with project URL and anon key
   - Import via: `import { supabase } from "@/integrations/supabase/client";`

2. **`src/integrations/supabase/types.ts`**
   - TypeScript types generated from database schema
   - Updates automatically when migrations run
   - Use for type safety in queries

3. **`.env`**
   - Environment variables for Supabase connection
   - Contains: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - Auto-updated by Lovable Cloud

4. **`supabase/config.toml`**
   - Supabase project configuration
   - Only modify via migration tool
   - Contains auth, database, and storage settings

### Other Generated Files

- `package-lock.json` - NPM dependency lock file
- `bun.lockb` - Bun dependency lock file
- `.gitignore` - Git ignore patterns
- `components.json` - Shadcn UI configuration
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` - TypeScript config

---

## 7. Common Development Workflows

### Adding a New Feature with Perspective Filtering

**Checklist:**

1. ✅ **Determine if perspective filtering applies**
   - Does the feature show company/contact/opportunity/activity data?
   - Should sales reps see only their records?
   - If YES → Add perspective filtering

2. ✅ **Add perspective selector to UI**
```typescript
import { PerspectiveSelector } from '@/components/common/PerspectiveSelector';
import { usePerspective } from '@/hooks/usePerspective';

const { perspective, setPerspective } = usePerspective('my_records', 'companies');

return (
  <div>
    <PerspectiveSelector 
      perspective={perspective} 
      onPerspectiveChange={setPerspective}
      className="mb-4"
    />
    {/* Your data display */}
  </div>
);
```

3. ✅ **Apply perspective filter to queries**
```typescript
const { data } = useQuery({
  queryKey: ['companies', perspective, user?.id],
  queryFn: async () => {
    let query = supabase.from('companies').select('*');
    
    if (perspective === 'my_records') {
      query = query.eq('created_by', user.id);
    } else if (perspective === 'assigned_to_me') {
      query = query.eq('assigned_to_sales_rep_id', user.id);
    }
    // all_records = no filter (RLS handles access)
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
});
```

4. ✅ **Test with different roles**
   - Test as sales_rep: Should only see own/assigned records
   - Test as sales_manager: Should see all records
   - Test as admin: Should see all records

### Adding a New Database Table

**Checklist:**

1. ✅ **Use database migration tool** (never manual SQL in client)
2. ✅ **Include standard fields:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `updated_at TIMESTAMPTZ DEFAULT now()`
   - `created_by UUID REFERENCES profiles(id)` (if user-owned)
   - `assigned_to_sales_rep_id UUID REFERENCES profiles(id)` (if assignable)

3. ✅ **Enable Row Level Security:**
```sql
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
```

4. ✅ **Create RLS policies** for each role:
```sql
-- Sales reps: Own + assigned records
CREATE POLICY "sales_reps_access" ON your_table FOR ALL USING (
  is_user_approved(auth.uid())
  AND has_role(auth.uid(), 'sales_rep')
  AND (created_by = auth.uid() OR assigned_to_sales_rep_id = auth.uid())
);

-- Elevated access: All records
CREATE POLICY "elevated_access_all" ON your_table FOR ALL USING (
  is_user_approved(auth.uid())
  AND has_elevated_access(auth.uid())
);
```

5. ✅ **Add updated_at trigger:**
```sql
CREATE TRIGGER update_your_table_updated_at
  BEFORE UPDATE ON public.your_table
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

6. ✅ **Add audit logging (optional but recommended):**
```sql
CREATE TRIGGER audit_your_table_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.your_table
  FOR EACH ROW
  EXECUTE FUNCTION public.log_table_changes();
```

7. ✅ **Update types**: Types in `src/integrations/supabase/types.ts` auto-update after migration

### Adding AI Features

**ALWAYS use Lovable AI by default** (no API key required from user):

1. ✅ **Create edge function** in `supabase/functions/your-feature/index.ts`

2. ✅ **Use Lovable AI Gateway:**
```typescript
const LOVABLE_AI_URL = 'https://lovable.app/api/ai';

const aiResponse = await fetch(LOVABLE_AI_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Environment': 'production',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash', // Recommended default
    messages: [
      { role: 'system', content: 'You are a helpful assistant for...' },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 2000,
    temperature: 0.7,
  }),
});
```

3. ✅ **Handle AI response:**
```typescript
if (!aiResponse.ok) {
  const errorData = await aiResponse.json();
  console.error('AI Error:', errorData);
  
  if (aiResponse.status === 429) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  if (aiResponse.status === 402) {
    throw new Error('AI service requires payment. Please contact support.');
  }
  throw new Error(errorData.error || 'AI request failed');
}

const aiData = await aiResponse.json();
const content = aiData.choices?.[0]?.message?.content;
```

4. ✅ **Log AI usage** (optional but recommended for debugging):
```typescript
await supabase.from('ai_usage_log').insert({
  user_id: user.id,
  feature_name: 'your-feature',
  model_used: 'google/gemini-2.5-flash',
  tokens_used: aiData.usage?.total_tokens,
  response_time_ms: responseTimeMs,
  success: true,
});
```

### Troubleshooting Data Access Issues

**Common Issues & Solutions:**

**Issue 1: "User cannot see any records"**
- ✅ Check user's `approval_status` in profiles table (must be 'approved')
- ✅ Check user has a role in `user_roles` table
- ✅ Verify perspective filter is applied correctly (check query logs)
- ✅ Check RLS policies allow access for user's role

**Issue 2: "User sees records they shouldn't"**
- ✅ Verify RLS policies are enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- ✅ Check for overly permissive policies (e.g., USING (true))
- ✅ Ensure perspective filter is being applied in query
- ✅ Review `has_elevated_access()` logic

**Issue 3: "Perspective filter not working"**
- ✅ Check `usePerspective()` hook is imported and used
- ✅ Verify perspective is passed to query key: `['data', perspective, user?.id]`
- ✅ Ensure query applies filter based on perspective
- ✅ Check localStorage for correct perspective value

**Issue 4: "Infinite recursion detected in policy"**
- ✅ NEVER query the same table in RLS policy (causes recursion)
- ✅ Use security definer functions instead:
```sql
-- ❌ WRONG - causes recursion
CREATE POLICY "check_role" ON profiles USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ✅ CORRECT - uses security definer function
CREATE POLICY "check_role" ON profiles USING (
  has_role(auth.uid(), 'admin')
);
```

**Issue 5: "Contact/Company data not encrypted"**
- ✅ Check `encryption_version` field is set
- ✅ Verify triggers are enabled: `auto_encrypt_contact_fields()`, `auto_encrypt_company_fields()`
- ✅ Run batch migration: `batch_migrate_contacts_encryption(100)`
- ✅ Check `encryption_config` table has active key

**Debugging Tools:**

1. **AI Error Helper** (Settings → Support & Diagnostics → AI Error Helper)
   - Paste error messages (text or screenshot)
   - Get AI-powered analysis and solutions
   - Multimodal support for screenshots

2. **Audit Logs** (Settings → Security → Audit Logs)
   - `contact_access_logs`: Who accessed what contacts
   - `approval_audit_log`: User approval history
   - `auth_events_log`: Login attempts and failures
   - `export_logs`: Data export tracking

3. **Console Logs** (Browser DevTools)
   - Check for SQL errors
   - Review query results
   - Inspect Supabase client errors

4. **Supabase Logs** (Lovable Cloud Backend)
   - Edge function logs
   - Database query logs
   - Authentication logs

### Updating Documentation & Versioning

**When to Update Version:**
- Major features: Increment major version (3.0 → 4.0)
- Minor features: Increment minor version (3.5 → 3.6)
- Bug fixes: Increment patch version (3.5.1 → 3.5.2)

**Files to Update:**

1. ✅ `package.json` - Update `"version": "x.x.x"`
2. ✅ `PROJECT_DOCUMENTATION.md` - Add feature to changelog, update version header
3. ✅ `README.md` - Update feature list and version
4. ✅ `src/pages/Help.tsx` - Update version number and help content
5. ✅ `PROJECT_KNOWLEDGE.md` - Update this file with new patterns (if applicable)

---

## 8. Component Patterns

### Standard Component Structure

**Import Order:**
```typescript
// 1. React and hooks
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// 3. UI components (Shadcn)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

// 4. Custom hooks
import { useUserRole } from '@/hooks/useUserRole';
import { usePerspective } from '@/hooks/usePerspective';

// 5. Utilities and integrations
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
```

### Form Handling Pattern

**Using React Hook Form + Zod:**

```typescript
// 1. Define schema
const formSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  industry_type: z.enum(['Builder', 'Contractor', 'Energy Implementer', 'Engineer/Architect', 'Partner/Other']),
  state: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// 2. Initialize form
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    company_name: '',
    industry_type: 'Builder',
  },
});

// 3. Create mutation
const createMutation = useMutation({
  mutationFn: async (data: FormData) => {
    const { error } = await supabase.from('companies').insert(data);
    if (error) throw error;
  },
  onSuccess: () => {
    toast.success('Company created successfully');
    form.reset();
    onClose();
  },
  onError: (error) => {
    toast.error('Failed to create company: ' + error.message);
  },
});

// 4. Handle submit
const onSubmit = (data: FormData) => {
  createMutation.mutate(data);
};

// 5. Render form
return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="company_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  </Form>
);
```

### Data Fetching Pattern

**Using TanStack Query:**

```typescript
// 1. Define query
const { data: companies, isLoading, error, refetch } = useQuery({
  queryKey: ['companies', perspective, user?.id], // Include perspective in key
  queryFn: async () => {
    let query = supabase.from('companies').select('*');
    
    // Apply perspective filter
    if (perspective === 'my_records') {
      query = query.eq('created_by', user.id);
    } else if (perspective === 'assigned_to_me') {
      query = query.eq('assigned_to_sales_rep_id', user.id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  enabled: !!user, // Only run if user is authenticated
});

// 2. Handle loading/error states
if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

// 3. Render data
return (
  <div>
    {companies.map(company => (
      <CompanyCard key={company.id} company={company} />
    ))}
  </div>
);
```

### Dialog Pattern

**Standard dialog structure:**

```typescript
interface AddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDialog({ open, onOpenChange }: AddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>Fill in the details below</DialogDescription>
        </DialogHeader>
        
        {/* Form content */}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Table Pattern

**Sortable, filterable table:**

```typescript
const [sortField, setSortField] = useState<string>('created_at');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
const [searchQuery, setSearchQuery] = useState('');

// Apply sorting and filtering
const filteredData = useMemo(() => {
  let result = [...data];
  
  // Filter
  if (searchQuery) {
    result = result.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Sort
  result.sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    return sortDirection === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });
  
  return result;
}, [data, searchQuery, sortField, sortDirection]);

// Render table with sortable headers
<Table>
  <TableHeader>
    <TableRow>
      <TableHead 
        onClick={() => handleSort('name')}
        className="cursor-pointer"
      >
        Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredData.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Protected Field Pattern

**For PII fields that require role-based access:**

```typescript
import { ProtectedField } from '@/components/common/ProtectedField';

<ProtectedField
  tableName="contacts"
  fieldName="email"
  value={contact.email}
  showLockIcon={true}
  enableAccessRequest={true}
  recordId={contact.id}
  recordName={contact.first_name + ' ' + contact.last_name}
/>
```

---

## 9. API Integration Standards

### Apollo.io Integration

**Company Enrichment:**
```typescript
const enrichResponse = await fetch(`${SUPABASE_URL}/functions/v1/apollo-enrich`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    company_id: companyId,
  }),
});
```

**Company Search:**
```typescript
const searchResponse = await fetch(`${SUPABASE_URL}/functions/v1/apollo-company-search`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'solar installer',
    location: 'California',
    industry: 'Construction',
  }),
});
```

**Contact Discovery:**
```typescript
const contactResponse = await fetch(`${SUPABASE_URL}/functions/v1/apollo-contact-search`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    company_id: companyId,
    title_keywords: ['CEO', 'President', 'Owner'],
  }),
});
```

### Deepseek Company Enrichment

**Web Scraping + AI Analysis:**

```typescript
const enrichResponse = await fetch(`${SUPABASE_URL}/functions/v1/enrich-company`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    company_id: companyId,
    auto_apply: true, // Automatically save results
  }),
});
```

**Features:**
- Web scraping via Firecrawl API
- AI analysis via Deepseek
- Extracts: volume, price point, business model, certifications, etc.
- Automatic segment assignment (Volume Builder, Luxury Custom, Production, etc.)
- Confidence scoring

### External API Error Handling

**Standard pattern for all external API calls:**

```typescript
try {
  const response = await fetch(externalApiUrl, options);
  
  if (!response.ok) {
    // Handle specific status codes
    if (response.status === 429) {
      toast.error('Rate limit exceeded. Please try again in a few minutes.');
      return;
    }
    if (response.status === 402) {
      toast.error('API quota exceeded. Please contact support.');
      return;
    }
    if (response.status === 401) {
      toast.error('API authentication failed. Please check credentials.');
      return;
    }
    
    // Generic error
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
  
} catch (error) {
  console.error('API Error:', error);
  toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
  throw error;
}
```

---

## 10. Testing & Debugging

### AI Error Helper

**NEW in v4.0** - Multimodal AI error analysis in Settings → Support & Diagnostics

**How to Use:**
1. Navigate to Settings → Support & Diagnostics → AI Error Helper
2. Paste error text, upload screenshot, or paste image from clipboard
3. Click "Analyze Error"
4. Get AI-powered analysis with:
   - Error type identification
   - Root cause analysis
   - Step-by-step solution
   - Code examples
   - Related documentation

**Supported Inputs:**
- Plain text error messages
- Stack traces
- Screenshots (PNG, JPEG, WebP)
- Console output
- Network errors
- Database errors

**Implementation:**
- Edge function: `supabase/functions/ai-error-helper/index.ts`
- Uses Google Gemini 2.5 Flash (multimodal)
- Component: `src/components/settings/AIErrorHelper.tsx`
- Logged in: `ai_usage_log` table

### Audit Log Viewers

**Access via Settings → Security:**

**Comprehensive Audit Viewer:**
- All system changes in one view
- Filters: table, operation, user, date range
- Shows old/new values for changes
- Component: `src/components/settings/audit/ComprehensiveAuditViewer.tsx`

**Contact Access Logs:**
- Track who viewed/exported contacts
- IP address tracking (anonymized after 30 days)
- Bulk access detection
- Component: `src/components/settings/audit/ContactAccessLogsViewer.tsx`

**Auth Events Log:**
- Login attempts (success/failure)
- Password resets
- MFA events
- IP tracking
- Component: `src/components/settings/audit/AuthEventsLog.tsx`

**Approval Audit Log:**
- User approval status changes
- Who approved whom, when
- Rejection reasons
- Component: `src/components/settings/audit/ApprovalAuditViewer.tsx`

### System Diagnostics

**Access via Settings → Support & Diagnostics → System Diagnostics:**

**Provides:**
- User session information
- Role and permissions
- Browser and device info
- Database connectivity test
- Edge function connectivity test
- Recent errors and warnings
- Performance metrics

**Component:** `src/components/help/SystemDiagnostics.tsx`

### Testing RLS Policies

**Test different user roles:**

1. **Create test users** with different roles via Settings → User Management
2. **Impersonate users** (admin feature):
   - Login as test user
   - Verify data visibility matches role expectations
3. **Check queries** in browser DevTools:
   - Network tab → Filter for Supabase requests
   - Verify `?created_by=eq.{user_id}` or similar filters applied
4. **Use SQL queries** to verify:
```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid-here"}';

-- Now run queries to see what this user can access
SELECT * FROM companies;
```

### Testing Perspective Filtering

**Verification checklist:**

1. ✅ **Create records as different users**
   - User A creates Company X
   - User B creates Company Y
   - Admin assigns Company Z to User A

2. ✅ **Test perspective views:**
   - User A → my_records: Should see Company X only
   - User A → assigned_to_me: Should see Company Z only
   - User A → all_records: Should see nothing (not elevated)
   - Admin → all_records: Should see X, Y, Z

3. ✅ **Check localStorage:**
   - Open DevTools → Application → Local Storage
   - Find key: `user-perspective-filter`
   - Verify value matches selected perspective

4. ✅ **Check analytics:**
```sql
SELECT * FROM perspective_usage_analytics
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

### Performance Testing

**Check query performance:**

1. **Use Supabase Analytics** (Lovable Cloud Backend)
   - View slow queries
   - Check index usage
   - Monitor RLS policy overhead

2. **Browser DevTools:**
   - Network tab → Check response times
   - Performance tab → Record page load
   - Lighthouse → Run performance audit

3. **Optimize queries:**
   - Add indexes for frequently filtered columns
   - Use `.select()` to limit returned columns
   - Paginate large datasets
   - Use `.maybeSingle()` instead of `.single()` when appropriate

---

## 11. Common Pitfalls & Solutions

### Pitfall 1: Forgetting Perspective Filter

**Problem:** Dashboard shows all records regardless of selected perspective

**Solution:** Always include perspective in query key and apply filter:
```typescript
const { data } = useQuery({
  queryKey: ['data', perspective, user?.id], // ✅ Include perspective
  queryFn: async () => {
    let query = supabase.from('table').select('*');
    
    // ✅ Apply filter based on perspective
    if (perspective === 'my_records') {
      query = query.eq('created_by', user.id);
    } else if (perspective === 'assigned_to_me') {
      query = query.eq('assigned_to_sales_rep_id', user.id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
});
```

### Pitfall 2: Overly Restrictive RLS Policies

**Problem:** Even admins can't access records

**Solution:** Always include elevated access clause:
```sql
-- ❌ WRONG - Only creator can access
CREATE POLICY "access_policy" ON companies FOR SELECT USING (
  created_by = auth.uid()
);

-- ✅ CORRECT - Creator OR elevated access
CREATE POLICY "access_policy" ON companies FOR SELECT USING (
  has_elevated_access(auth.uid())
  OR created_by = auth.uid()
);
```

### Pitfall 3: Not Checking Approval Status

**Problem:** Unapproved users can still access data

**Solution:** Always check approval in RLS policies:
```sql
CREATE POLICY "approved_users_only" ON companies FOR SELECT USING (
  is_user_approved(auth.uid()) AND (
    has_elevated_access(auth.uid())
    OR created_by = auth.uid()
  )
);
```

### Pitfall 4: Forgetting to Encrypt PII

**Problem:** Contact email/phone stored in plain text

**Solution:** Triggers handle this automatically, but verify:
```sql
-- Check encryption status
SELECT 
  COUNT(*) as total,
  COUNT(email_encrypted) as encrypted_emails,
  COUNT(phone_encrypted) as encrypted_phones
FROM contacts;

-- If needed, run batch migration
SELECT * FROM batch_migrate_contacts_encryption(100);
```

### Pitfall 5: Not Logging Important Operations

**Problem:** No audit trail for sensitive operations

**Solution:** Always log access to contacts:
```typescript
import { logSingleContactView } from '@/lib/contacts/logContactAccess';

// After viewing contact
await logSingleContactView(contactId);
```

### Pitfall 6: Hardcoding User IDs

**Problem:** Using specific UUIDs in code

**Solution:** Always use `auth.uid()` in SQL or `user.id` in TypeScript:
```typescript
// ❌ WRONG
query = query.eq('created_by', 'hardcoded-uuid');

// ✅ CORRECT
const { data: { user } } = await supabase.auth.getUser();
query = query.eq('created_by', user.id);
```

### Pitfall 7: Not Handling Rate Limits

**Problem:** API calls fail silently when rate limited

**Solution:** Always handle 429 responses:
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || '60';
  toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
  return;
}
```

---

## 12. Quick Reference

### Frequently Used Queries

**Get current user's role:**
```typescript
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();
```

**Get companies with perspective filter:**
```typescript
let query = supabase.from('companies').select('*');

if (perspective === 'my_records') {
  query = query.eq('created_by', user.id);
} else if (perspective === 'assigned_to_me') {
  query = query.eq('assigned_to_sales_rep_id', user.id);
}

const { data, error } = await query;
```

**Get contacts for a company:**
```typescript
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });
```

**Check if user has elevated access:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: roleData } = await supabase.rpc('has_elevated_access', {
  _user_id: user.id
});
const hasElevatedAccess = roleData;
```

**Recalculate lead score:**
```typescript
import { calculateLeadScore } from '@/lib/scoring/leadScoring';

const breakdown = await calculateLeadScore(companyId);
console.log('Total Score:', breakdown.totalScore);
console.log('Priority Tier:', breakdown.priorityTier);
```

### Frequently Used Functions

**RLS Functions:**
- `has_role(_user_id, _role)` - Check if user has specific role
- `has_elevated_access(_user_id)` - Check if admin or sales_manager
- `get_user_role(_user_id)` - Get user's role
- `is_user_approved(_user_id)` - Check if user is approved
- `can_access_company(_user_id, _company_id)` - Check company access
- `can_access_field(_user_id, _table_name, _field_name)` - Check field access

**Encryption Functions:**
- `encrypt_text(plain_text)` - Encrypt sensitive text
- `decrypt_text(encrypted_text)` - Decrypt sensitive text
- `get_encryption_key()` - Get active encryption key
- `batch_migrate_contacts_encryption(batch_size)` - Batch encrypt contacts
- `batch_migrate_companies_encryption(batch_size)` - Batch encrypt companies

**Utility Functions:**
- `log_auth_event(...)` - Log authentication event
- `log_email(...)` - Log email sent
- `log_export_activity(...)` - Log data export
- `check_export_quota(...)` - Check if export allowed
- `cleanup_expired_reset_codes()` - Clean old password reset codes
- `detect_inactive_users(days)` - Find inactive users

### Environment Variables

Available in `.env` (auto-generated):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon/public key
- `VITE_SUPABASE_PROJECT_ID` - Project ID

Use in code:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

Use in edge functions:
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

---

## Conclusion

This knowledge base covers the critical patterns, architectures, and best practices for the CRM system. Always refer to this document when:

- Adding new features
- Troubleshooting issues
- Onboarding new developers
- Training AI assistants
- Reviewing security practices

**Remember the Core Principles:**

1. 🔐 **Security First**: Always use RLS, encrypt PII, log access
2. 👁️ **Perspective Filtering**: Apply to all user-facing data views
3. 🎯 **Role-Based Access**: Respect user roles and approval status
4. 🤖 **Lovable AI**: Use for AI features by default
5. 📝 **Audit Everything**: Log important operations
6. ✅ **Approval Workflows**: Require approval for sensitive operations
7. 🚫 **Never Edit Auto-Generated Files**: Use proper tools and migrations

For questions, use the **AI Error Helper** in Settings or consult the comprehensive documentation in `PROJECT_DOCUMENTATION.md`.

---

**Version:** 4.2  
**Last Updated:** 2025-11-07  
**Maintained By:** AI Assistant + Development Team
