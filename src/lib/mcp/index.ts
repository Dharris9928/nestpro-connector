import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyHotLeads from "./tools/list-my-hot-leads";
import searchCompanies from "./tools/search-companies";
import listOverdueMeetings from "./tools/list-overdue-meetings";
import listMyNotifications from "./tools/list-my-notifications";
import getCompany from "./tools/get-company";
import createActivity from "./tools/create-activity";

// Issuer MUST be direct supabase.co host, not the Lovable Cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nest-pro-connector-mcp",
  title: "Nest Pro Connector",
  version: "0.1.0",
  instructions:
    "Tools for the Nest Pro Connector CRM. Read the signed-in user's hot leads, overdue meetings, notifications, and search companies. Log outreach activities against companies. All access respects the user's role and RLS policies.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMyHotLeads,
    searchCompanies,
    listOverdueMeetings,
    listMyNotifications,
    getCompany,
    createActivity,
  ],
});
