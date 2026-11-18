import { DataGovernanceDashboard } from "../components/data-governance/data-governance-dashboard";

export const metadata = {
  title: "Data Governance & Lifecycle Management | TATTVA AI",
  description:
    "GDPR & CCPA self-service data export, configurable retention windows, access auditing, and 'Right to be Forgotten' account purging for TATTVA AI.",
};

export default function DataGovernancePage() {
  return <DataGovernanceDashboard />;
}
