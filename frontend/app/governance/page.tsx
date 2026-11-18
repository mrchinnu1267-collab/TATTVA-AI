import { GovernanceDashboard } from "../components/governance/governance-dashboard";

export const metadata = {
  title: "AI Governance & Responsible AI Control Center | TATTVA AI",
  description:
    "Enterprise AI governance, content safety evaluation, sensitive PII redaction, prompt injection defense, human-in-the-loop approvals, and audit trail for TATTVA AI.",
};

export default function GovernancePage() {
  return <GovernanceDashboard />;
}
