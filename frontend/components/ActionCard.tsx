import type { ActionLog } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";
import { InterventionBanner } from "./InterventionBanner";

interface Props {
  log: ActionLog;
  onClick?: () => void;
}

export function ActionCard({ log, onClick }: Props) {
  const triggered = (() => {
    try {
      return JSON.parse(log.triggered_rules || "[]");
    } catch {
      return [];
    }
  })();

  return (
    <div
      onClick={onClick}
      className="p-4 flex items-start gap-4 hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-800 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-mono text-gray-400">{log.action_type}</span>
          <RiskBadge severity={log.severity as any} enforcement={log.enforcement} />
          {triggered.slice(0, 2).map((r: any) => (
            <span key={r.rule_id} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded font-mono">
              {r.rule_id}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-200 truncate font-mono">
          {log.command || log.file_path || "(no target)"}
        </p>
        <div className="flex gap-4 mt-1 text-xs text-gray-500 font-mono">
          <span>Risk: <span className="text-orange-400">{log.action_risk_score}</span></span>
          <span>Drift: <span className="text-yellow-400">{log.cognitive_drift_score}</span></span>
          <span>Score: <span className="text-red-400">{log.intervention_score}</span></span>
          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
      <div className="shrink-0">
        <InterventionBanner enforcement={log.enforcement} mode={log.mode} />
      </div>
    </div>
  );
}
