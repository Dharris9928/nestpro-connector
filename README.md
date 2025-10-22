# Google Nest Pro CRM - Version 4.1

A comprehensive CRM system built for managing Google Nest Pro partnerships with builders and contractors.

## Latest Updates (v4.1)

### New Features
- **Building Permits Discovery**: AI-powered permit search across regions, states, metros, and cities
  - Multi-level geographic search (Region, State, Metro Area, City)
  - Automatic matching to existing companies with fuzzy logic
  - Auto-create new leads from unmatched permits
  - High-value opportunity alerts (200+ units or $50M+ projects)
  - Status filtering (Filed, Under Review, Approved, Issued)
  - Comprehensive permit analytics and tracking
- **AI Error Helper**: Interactive chatbot in Settings that helps troubleshoot errors with image support
- **Enhanced Perspective Filtering**: All dashboard components now respect user perspective filtering (My Records, Assigned to Me, All Records)
- **Improved Data Views**: Consistent filtering across Priority Distribution, Segment Performance, and Smart Recommendations

## Project info

**URL**: https://lovable.dev/projects/fecf655d-278f-48e9-a0cd-40927fe3377c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fecf655d-278f-48e9-a0cd-40927fe3377c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Frontend**: React 18.3.1 + TypeScript + Vite
- **Backend**: Lovable Cloud (Supabase)
- **UI Components**: shadcn-ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **AI Integration**: Lovable AI (Google Gemini)

## Key Features

- **Building Permit Discovery**: AI-powered search to find large-scale residential developments
  - Search by region, state, metro area, or city
  - Auto-match permits to existing companies
  - Create new leads from unmatched builders
  - Track high-value opportunities (200+ units, $50M+)
  - Filter by permit status (Filed, Approved, Issued)
  - Comprehensive analytics and visualizations
- **Intelligent Lead Scoring**: Industry-specific scoring algorithms for builders and contractors
- **Contact Management**: Track decision makers and influencers
- **Activity Tracking**: Monitor outreach and engagement
- **AI-Powered Features**: 
  - Building permit discovery and analysis
  - Error troubleshooting assistant
  - Lead prioritization
  - Outreach strategy recommendations
  - Contact scoring
- **Advanced Security**: Field-level permissions, encryption, audit logs
- **Data Enrichment**: Apollo.io integration for company data
- **Comprehensive Reporting**: Priority distribution, segment performance analytics, permit discovery metrics

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fecf655d-278f-48e9-a0cd-40927fe3377c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
