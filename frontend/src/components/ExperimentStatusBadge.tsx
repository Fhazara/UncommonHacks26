import type { ExperimentStatus } from "@/lib/types";

interface Props {
  status: ExperimentStatus;
  className?: string;
}

const STYLES: Record<ExperimentStatus, string> = {
  running:
    "bg-green-900 text-green-300 border border-green-700 animate-pulse",
  provisioning:
    "bg-yellow-900 text-yellow-300 border border-yellow-700 animate-pulse",
  stopping: "bg-orange-900 text-orange-300 border border-orange-700",
  completed: "bg-gray-800 text-gray-400 border border-gray-700",
  failed: "bg-red-900 text-red-300 border border-red-700",
  created: "bg-gray-800 text-gray-500 border border-gray-700",
};

export function ExperimentStatusBadge({ status, className }: Props) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded font-mono ${STYLES[status]} ${className ?? ""}`}
    >
      {status}
    </span>
  );
}
