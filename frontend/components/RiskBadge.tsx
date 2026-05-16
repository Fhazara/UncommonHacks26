import type { SeverityLevel } from "@/lib/types";

const severityColors: Record<SeverityLevel, string> = {
  low: "bg-green-900 text-green-300 border border-green-700",
  medium: "bg-yellow-900 text-yellow-300 border border-yellow-700",
  high: "bg-orange-900 text-orange-300 border border-orange-700",
  critical: "bg-red-900 text-red-300 border border-red-700",
};

const enforcementLabels: Record<string, string> = {
  allowed: "ALLOWED",
  warned: "WARNING",
  would_warn: "WOULD WARN",
  reflection_required: "REFLECT",
  would_reflect: "WOULD REFLECT",
  blocked: "BLOCKED",
  would_block: "WOULD BLOCK",
};

interface Props {
  severity: SeverityLevel;
  enforcement: string;
}

export function RiskBadge({ severity, enforcement }: Props) {
  const colorClass = severityColors[severity] ?? severityColors.low;
  const label = enforcementLabels[enforcement] ?? enforcement.toUpperCase().replace(/_/g, " ");
  const pulse = enforcement === "blocked" || enforcement === "would_block" ? " animate-pulse" : "";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${colorClass}${pulse}`}>
      {label}
    </span>
  );
}
