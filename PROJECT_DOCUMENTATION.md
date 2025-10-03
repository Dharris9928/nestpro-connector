# Google Nest Pro CRM - Technical Documentation

## Overview
A comprehensive CRM system built for managing Google Nest Pro partnerships with builders and contractors. Features intelligent lead scoring, user management with approval workflows, contact tracking, activity monitoring, AI-powered enrichment, and detailed import/export capabilities with error tracking.

## Recent Features & Enhancements

### Import/Export Error Tracking
- **Detailed Error Logging**: All import and export operations now capture detailed error information in the `import_export_logs` table
- **Error Details**: The `detailed_errors` column (jsonb) stores individual record failures with specific reasons
- **UI Enhancements**: Import/Export Activity Log component allows users to expand and view detailed errors for failed records
- **Available in**: Help page → System Activity Logs section

### AI Enrichment Enhancements
- **Segment Rationale**: The `company_ai_insights` table now includes a `segment_rationale` field that stores AI-generated explanations for why a particular segment was assigned
- **Smart Recommendations**: System automatically identifies companies that would benefit from enrichment, prioritizing P1/P2 tier companies with missing data
- **Multi-tier Enrichment**: Sequential enrichment flow using Apollo → Lovable AI (Gemini) → Claude → Perplexity
- **Confidence Scores**: Each enrichment includes confidence levels and data quality indicators

### Security & Data Management
- **Contact Access Logging**: All contact views are logged in `contact_access_logs` with IP anonymization after 30 days
- **Bulk Access Alerts**: Automatic detection of unusual bulk data access patterns in `bulk_access_alerts`
- **Deletion Approval**: All deletions require admin approval via `deletion_requests` table
- **Data Retention**: Automated cleanup of old records based on configurable retention policies
- **Approval Audit**: Complete audit trail of user approval decisions in `approval_audit_log`



## Technology Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM v6
- **State Management**: TanStack React Query v5
- **UI Components**: Shadcn/UI with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation

### Backend (Lovable Cloud/Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password
- **Edge Functions**: Deno-based serverless functions
- **Real-time**: Supabase Realtime subscriptions

## Application Architecture

### Core Features

#### 1. **User Management & Authentication**
- Email/password authentication with admin approval workflow
- Role-based access control (Admin, Sales Manager, Sales Rep, Read Only)
- User approval panel for admin review of new registrations
- Profile management with first/last name

**Key Files:**
- `src/pages/Auth.tsx` - Login/signup interface
- `src/components/layout/AppLayout.tsx` - Auth state management and approval checks
- `src/components/settings/UserApprovalPanel.tsx` - Admin approval interface
- `src/components/settings/UserManagement.tsx` - Role management

#### 2. **Lead Scoring System**
Industry-specific scoring algorithms (0-100 points) with automatic priority tier assignment:

**Builder Scoring (50 points max):**
- Volume Score (15 pts): Based on annual home volume
- Price Point Score (10 pts): Based on average home price
- Geographic Score (10 pts): Market location (Sun Belt priority)
- Stability Score (15 pts): Years in business + employees

**Digital Engagement (30 points max):**
- Website Quality (10 pts)
- Social Media Activity (10 pts)
- Technology Adoption (10 pts)

**Contact Quality (20 points max):**
- Decision Authority (10 pts): C-level to Manager
- LinkedIn Professional (10 pts): Connections and activity

**Priority Tiers:**
- P1: 80-100 points (High-touch, 30-90 days)
- P2: 60-79 points (Standard, 60-120 days)
- P3: 40-59 points (Nurture, 120-180+ days)
- Unscored: Below 40 points

**Key Files:**
- `src/lib/scoring/leadScoring.ts` - Main scoring router
- `src/lib/scoring/builderScoring.ts` - Builder-specific algorithm
- `src/lib/scoring/contractorScoring.ts` - Contractor-specific algorithm
- `src/lib/scoring/sharedScoring.ts` - Shared scoring functions

#### 3. **Company Management**
Comprehensive company tracking with:
- Industry type (Builder/Contractor)
- Firmographic data (revenue, employees, years in business)
- Contact information
- Lead scores and priority tiers
- Parent company relationships and branches
- Installation history
- Partner matching

**Key Files:**
- `src/pages/Companies.tsx` - Main company list view
- `src/components/companies/CompanyTable.tsx` - Data table with sorting/filtering
- `src/components/companies/AddCompanyDialog.tsx` - Company creation
- `src/components/companies/EditCompanyDialog.tsx` - Company editing
- `src/components/companies/CompaniesFilterSidebar.tsx` - Advanced filtering
- `src/components/companies/RecalculateScoreButton.tsx` - Score recalculation
- `src/lib/companies/createCompany.ts` - Company creation logic
- `src/lib/companies/updateCompany.ts` - Company update logic

#### 4. **Contact Management**
Track decision-makers and influencers:
- Contact details (name, email, phone, mobile)
- Decision tier (Decision Maker, Influencer, Gatekeeper)
- LinkedIn profile and activity tracking
- Company and branch associations

**Key Files:**
- `src/pages/Contacts.tsx` - Contact list view
- `src/components/contacts/ContactTable.tsx` - Contact data table
- `src/components/contacts/AddContactDialog.tsx` - Contact creation
- `src/components/contacts/EditContactDialog.tsx` - Contact editing
- `src/lib/contacts/createContact.ts` - Contact creation logic

#### 5. **Activity Tracking**
Outreach and engagement monitoring:
- Activity types (Email, Phone, Meeting, LinkedIn, Demo)
- Outcome tracking (Sent, Opened, Responded, Completed, No Response)
- Sequence tracking (day, phase, name)
- Scheduled and completed dates

**Key Files:**
- `src/pages/Activities.tsx` - Activity list view
- `src/components/activities/AddActivityDialog.tsx` - Activity creation

#### 6. **Dashboard & Reporting**
Analytics and performance metrics:
- Priority distribution visualization
- Segment performance grids
- Pipeline metrics

**Key Files:**
- `src/pages/Dashboard.tsx` - Main dashboard view
- `src/components/dashboard/PriorityDistributionCard.tsx` - Priority distribution chart
- `src/components/dashboard/SegmentPerformanceGrid.tsx` - Segment performance metrics
- `src/pages/Reports.tsx` - Detailed reporting interface

#### 7. **Settings & Configuration**
System configuration and user management:
- User approval panel
- User role management
- System settings

**Key Files:**
- `src/pages/Settings.tsx` - Settings hub

## Database Schema

### Core Tables

#### `profiles`
User profile and role management
- `id` (uuid, PK)
- `first_name`, `last_name` (text)
- `role` (app_role enum: admin, sales_manager, sales_rep, read_only)
- `approval_status` (approval_status enum: pending, approved, rejected)
- `approved_by`, `approved_at` (uuid, timestamp)

#### `companies`
Main company records
- `id` (uuid, PK)
- `company_name`, `industry_type` (text, varchar)
- `owner_name`, `website_url`, `linkedin_company_url` (text)
- `address_line1`, `city`, `state`, `zip` (varchar/text)
- `primary_email`, `primary_phone` (varchar/text)
- `annual_volume`, `average_home_price`, `total_employees`, `years_in_business` (integer)
- `annual_revenue_range`, `segment`, `status`, `priority_tier` (varchar)
- `lead_score`, `segment_confidence` (integer/varchar)
- `score_calculated_at`, `last_contact_date`, `next_activity_date` (timestamps/dates)
- `created_by` (uuid, FK to auth.users)
- `parent_company_id` (uuid, FK to companies)
- `is_parent_company`, `is_franchise` (boolean)

#### `contacts`
Contact records linked to companies
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `branch_id` (uuid, FK to company_branches)
- `first_name`, `last_name`, `title` (text)
- `email`, `phone`, `mobile` (text)
- `linkedin_url` (text)
- `decision_tier` (decision_tier enum: Decision Maker, Influencer, Gatekeeper)
- `linkedin_connections`, `linkedin_activity_score` (integer)
- `preferred_contact_method` (contact_method enum)

#### `company_branches`
Multi-location company tracking
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `branch_name`, `address_line1`, `address_line2`, `city`, `state`, `zip` (text)
- `phone`, `email` (text)
- `annual_volume`, `branch_revenue` (integer/numeric)
- `is_headquarters` (boolean)
- `geographic_coverage` (array)

#### `outreach_activities`
Activity and engagement tracking
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `contact_id` (uuid, FK to contacts)
- `branch_id` (uuid, FK to company_branches)
- `activity_type` (activity_type enum)
- `outcome` (activity_outcome enum)
- `scheduled_date`, `completed_date` (date)
- `sequence_name`, `sequence_phase`, `sequence_day` (text/integer)
- `subject_line`, `message_content`, `notes` (text)
- `created_by` (uuid, FK to auth.users)

#### `installation_history`
Google Nest product installation tracking
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `branch_id` (uuid, FK to company_branches)
- `product_type` (nest_product enum)
- `quantity` (integer)
- `installation_date` (date)
- `project_name`, `pro_id_reference`, `notes` (text)

#### `builder_scoring_details`
Detailed builder scoring breakdown
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `volume_score`, `price_point_score`, `geographic_score`, `stability_score` (integer)
- `firmographic_total` (integer)
- `website_quality_score`, `social_media_score`, `technology_adoption_score` (integer)
- `digital_total` (integer)
- `decision_authority_score`, `linkedin_professional_score` (integer)
- `contact_total` (integer)
- `total_score` (integer)
- `priority_tier`, `confidence` (text)
- `calculated_at` (timestamp)

#### `contractor_scoring_details`
Detailed contractor scoring breakdown
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `volume_score`, `revenue_score`, `geographic_score`, `stability_score`, `business_model_score` (integer)
- `firmographic_total` (integer)
- `website_quality_score`, `social_media_score`, `technology_adoption_score` (integer)
- `digital_total` (integer)
- `decision_authority_score`, `linkedin_professional_score` (integer)
- `contact_total` (integer)
- `total_score` (integer)
- `priority_tier`, `confidence` (text)
- `calculated_at` (timestamp)

#### `company_partner_matches`
Partner matching recommendations
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `partner_id` (uuid, FK to nest_pro_partners)
- `relationship_status` (relationship_status enum)
- `match_score` (integer)
- `match_reason`, `introduction_date` (text/date)

#### `nest_pro_partners`
Nest Pro partner directory
- `id` (uuid, PK)
- `partner_name`, `contact_name`, `contact_email`, `contact_phone` (text)
- `builder_capacity`, `contractor_capacity` (boolean)
- `specializations`, `service_areas` (arrays)

#### `training_certifications`
Training and certification tracking
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `contact_id` (uuid, FK to contacts)
- `training_type` (training_type enum)
- `scheduled_date`, `completed_date`, `expiration_date` (date)
- `score` (integer)
- `certification_issued` (boolean)
- `certification_number`, `notes` (text)

#### `pilot_programs`
Pilot program management
- `id` (uuid, PK)
- `company_id` (uuid, FK to companies)
- `branch_id` (uuid, FK to company_branches)
- `program_type` (program_type enum)
- `status` (program_status enum)
- `start_date`, `end_date` (date)
- `target_installations`, `actual_installations` (integer)
- `success_metrics`, `roi_data` (jsonb)
- `notes` (text)

### Database Functions

#### `handle_new_user()`
Trigger function that creates profile on user signup
- Automatically assigns role based on email
- Sets default role to 'sales_rep'
- Special handling for admin email

#### `update_updated_at_column()`
Trigger function for automatic timestamp updates
- Updates `updated_at` column on row modification

#### `auto_assign_priority_tier()`
Trigger function for automatic priority tier assignment
- Assigns P1/P2/P3/Unscored based on lead_score
- Updates score_calculated_at timestamp

#### `mark_company_for_recalculation()`
Trigger function to mark companies for score recalculation
- Triggered on related data changes (contacts, installations, etc.)

#### `get_user_role(user_id)`
Security definer function to get user role
- Stable function for RLS policy checks

#### `has_elevated_access(user_id)`
Security definer function to check admin/manager access
- Returns true for admin or sales_manager roles

#### `is_user_approved(user_id)`
Security definer function to check approval status
- Returns true if user is approved

### Row Level Security (RLS)

All tables have RLS enabled with policies based on:
- User approval status (must be approved)
- Role-based access (admin, sales_manager, sales_rep, read_only)
- Record ownership (created_by = auth.uid())
- Elevated access for admins and managers

Common policy patterns:
- SELECT: Approved users can view their own data or elevated users can view all
- INSERT: Users can create records with their user_id
- UPDATE: Users can update their own records or elevated users can update all
- DELETE: Only elevated users can delete

## Edge Functions

#### `get-user-emails`
Retrieves user emails from auth.users table
- Uses service role key for admin access
- Called by UserApprovalPanel to display pending user emails
- Input: Array of user IDs
- Output: Map of user_id to email

**File:** `supabase/functions/get-user-emails/index.ts`

## UI Components

### Layout Components
- `AppLayout.tsx` - Main application layout with sidebar and auth checks
- `AppSidebar.tsx` - Navigation sidebar with route links

### Company Components
- `CompanyTable.tsx` - Sortable, filterable company data table
- `AddCompanyDialog.tsx` - Company creation form
- `EditCompanyDialog.tsx` - Company editing form
- `CompaniesFilterSidebar.tsx` - Advanced filtering interface
- `BulkActionBar.tsx` - Bulk operations on selected companies
- `ColumnCustomization.tsx` - Column visibility controls
- `ExportDialog.tsx` - Data export functionality
- `ImportDialog.tsx` - CSV import functionality
- `QuickActionsMenu.tsx` - Quick action shortcuts
- `RecalculateScoreButton.tsx` - Score recalculation trigger
- `SavedFilters.tsx` - Saved filter management
- `TablePagination.tsx` - Pagination controls

### Contact Components
- `ContactTable.tsx` - Contact data table
- `AddContactDialog.tsx` - Contact creation form
- `EditContactDialog.tsx` - Contact editing form

### Activity Components
- `AddActivityDialog.tsx` - Activity creation form

### Dashboard Components
- `PriorityDistributionCard.tsx` - Priority tier distribution chart
- `SegmentPerformanceGrid.tsx` - Segment performance metrics

### Settings Components
- `UserApprovalPanel.tsx` - Admin user approval interface
- `UserManagement.tsx` - User role management

### Shared UI Components (Shadcn/UI)
Located in `src/components/ui/`:
- Buttons, Cards, Dialogs, Forms, Inputs, Selects
- Tables, Tabs, Toasts, Tooltips
- Sidebar, Sheet, Accordion, Alert
- Calendar, Carousel, Chart, Progress
- And 40+ more Radix UI-based components

## Utilities

### Validation
- `src/lib/validation/companyValidation.ts` - Company data validation schemas

### Helpers
- `src/lib/utils.ts` - Utility functions (cn for className merging, etc.)
- `src/hooks/useDebounce.ts` - Debounce hook for search inputs
- `src/hooks/use-mobile.tsx` - Mobile detection hook
- `src/hooks/use-toast.ts` - Toast notification hook

### Form Options
- `src/components/companies/formOptions.ts` - Dropdown options for company forms

## Design System

### Color Tokens (HSL)
Defined in `src/index.css`:
- Primary, Secondary, Accent colors
- Muted, Destructive, Success colors
- Border, Input, Ring colors
- Card, Popover backgrounds
- Foreground variants for each

### Tailwind Configuration
Extended in `tailwind.config.ts`:
- Custom animations (accordion-down, accordion-up)
- Border radius utilities
- Color system integration
- Typography plugins

## Authentication Flow

1. User visits `/auth` and signs up with email/password + first/last name
2. `handle_new_user()` trigger creates profile with `approval_status = 'pending'`
3. User sees "Account Pending Approval" message
4. Admin navigates to Settings → User Approval Panel
5. Admin approves or rejects user
6. Approved users can access the application
7. Rejected users see "Account Not Approved" message

## Data Access Patterns

### Role Permissions
- **Admin**: Full CRUD access to all records, user management
- **Sales Manager**: Full CRUD access to all records
- **Sales Rep**: CRUD access to own records, view others
- **Read Only**: View-only access to all records

### Security Principles
- All data access controlled via RLS policies
- No client-side role checks (all server-side)
- Secure functions use SECURITY DEFINER for privilege elevation
- Service role key restricted to edge functions only

## Key Workflows

### 1. Adding a New Company
1. Navigate to Companies page
2. Click "Add Company" button
3. Fill form with company details
4. System assigns created_by to current user
5. Lead score calculated on save
6. Priority tier automatically assigned

### 2. Scoring a Company
1. User creates/updates company with firmographic data
2. Add contacts with decision authority and LinkedIn info
3. Add installation history for technology adoption score
4. Click "Recalculate Score" button
5. System routes to appropriate scoring algorithm (builder/contractor)
6. Detailed breakdown saved to scoring_details table
7. Total score and priority tier updated on company record

### 3. Managing User Approvals
1. Admin navigates to Settings
2. Views User Approval Panel
3. Reviews pending user details (name, email, date)
4. Clicks Approve or Reject
5. System updates approval_status and records approver
6. User can now access system (if approved) or sees rejection message

### 4. Tracking Outreach Activities
1. Navigate to Activities page
2. Click "Add Activity"
3. Select company, contact, activity type
4. Set scheduled date and sequence info
5. Update outcome when completed
6. Activity logged and visible in company timeline

## File Structure Summary

```
├── src/
│   ├── components/
│   │   ├── activities/       # Activity management
│   │   ├── companies/        # Company management (10+ components)
│   │   ├── contacts/         # Contact management
│   │   ├── dashboard/        # Dashboard widgets
│   │   ├── layout/           # Layout components (sidebar, app layout)
│   │   ├── settings/         # Settings panels (user approval, management)
│   │   └── ui/               # 50+ Shadcn UI components
│   ├── hooks/                # Custom React hooks
│   ├── integrations/
│   │   └── supabase/         # Supabase client and types (auto-generated)
│   ├── lib/
│   │   ├── companies/        # Company business logic
│   │   ├── contacts/         # Contact business logic
│   │   ├── installations/    # Installation business logic
│   │   ├── scoring/          # Lead scoring algorithms
│   │   └── validation/       # Zod validation schemas
│   ├── pages/                # Main route pages
│   ├── App.tsx               # App entry with routing
│   ├── main.tsx              # React DOM root
│   └── index.css             # Global styles and design tokens
├── supabase/
│   ├── functions/            # Edge functions
│   │   └── get-user-emails/
│   └── migrations/           # Database migrations
├── public/                   # Static assets
├── vite.config.ts            # Vite configuration
└── tailwind.config.ts        # Tailwind configuration
```

## Environment Variables

Automatically configured by Lovable Cloud:
- `VITE_SUPABASE_URL` - Supabase API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint
```

## Production Deployment

Application is deployed via Lovable Cloud:
1. Click "Publish" button in Lovable interface
2. Automatic build and deployment
3. Custom domain configuration available in project settings

## Future Enhancement Opportunities

### Features
- Email sequence automation
- Calendar integration for activity scheduling
- Document/proposal storage
- Mobile app version
- Advanced analytics and forecasting
- Integration with Google Nest Pro API
- Automated partner matching recommendations
- Pipeline visualization and kanban boards

### Technical
- Real-time collaboration features
- Optimistic UI updates
- Advanced caching strategies
- Background job processing
- Webhook integrations
- API rate limiting
- Comprehensive audit logging
- Data export to multiple formats

## Support & Maintenance

### Code Organization Principles
- Component-based architecture
- Separation of concerns (UI, logic, data)
- Type safety with TypeScript
- Validation with Zod schemas
- Reusable UI components
- Consistent styling with design tokens

### Performance Optimizations
- React Query caching
- Lazy loading of routes and components
- Debounced search inputs
- Pagination for large datasets
- Indexed database queries
- Optimized Tailwind CSS bundle

### Security Best Practices
- Row Level Security on all tables
- Server-side authorization checks
- Secure credential storage
- HTTPS-only communication
- SQL injection prevention via parameterized queries
- XSS prevention via React's built-in escaping

---

**Last Updated:** 2025-10-01
**Version:** 1.0
**Built with:** Lovable + React + Supabase
