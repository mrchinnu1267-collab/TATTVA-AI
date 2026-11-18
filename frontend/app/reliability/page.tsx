import { ReliabilityDashboard } from "../components/reliability/reliability-dashboard";

export const metadata = {
  title: "Production Reliability Engineering | TATTVA AI",
  description:
    "99.95% SLA verification, automated incident mitigation playbooks, synthetic health probes, circuit breakers, and latency heatmaps for TATTVA AI.",
};

export default function ReliabilityPage() {
  return <ReliabilityDashboard />;
}
