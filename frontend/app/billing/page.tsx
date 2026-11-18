import { BillingDashboard } from "../components/billing/billing-dashboard";

export const metadata = {
  title: "Subscription & Commercial Management | TATTVA AI",
  description:
    "Manage commercial plans, subscription tiers, API token quotas, cloud storage allocations, and official tax invoices for TATTVA AI.",
};

export default function BillingPage() {
  return <BillingDashboard />;
}
