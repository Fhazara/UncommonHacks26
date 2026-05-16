import type { ExportStatus } from "@/lib/types";

interface Props {
  exports: ExportStatus;
  actionRiskScore: number;
  driftScore: number;
  interventionScore: number;
  approvalTimeMs?: number;
  diffViewed?: boolean;
  explanationViewed?: boolean;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${active ? "bg-green-400" : "bg-gray-600"}`}
    />
  );
}

export function TelemetryPanel({ exports, actionRiskScore, driftScore, interventionScore, approvalTimeMs, diffViewed, explanationViewed }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      <p className="text-gray-400 text-xs font-mono">TELEMETRY</p>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <StatusDot active={exports.local} />
          <span className="text-gray-300">Local SQLite/JSONL</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot active={exports.snowflake} />
          <span className="text-gray-300">Snowflake</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot active={exports.wafer} />
          <span className="text-gray-300">Wafer</span>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-3 grid grid-cols-2 gap-2 text-xs font-mono">
        <div>
          <span className="text-gray-500">Action Risk</span>
          <span className="ml-2 text-orange-400 font-bold">{actionRiskScore}</span>
        </div>
        <div>
          <span className="text-gray-500">Drift Score</span>
          <span className="ml-2 text-yellow-400 font-bold">{driftScore}</span>
        </div>
        <div>
          <span className="text-gray-500">Intervention</span>
          <span className="ml-2 text-red-400 font-bold">{interventionScore}</span>
        </div>
        {approvalTimeMs !== undefined && (
          <div>
            <span className="text-gray-500">Approval Time</span>
            <span className="ml-2 text-gray-300">{approvalTimeMs}ms</span>
          </div>
        )}
        {diffViewed !== undefined && (
          <div>
            <span className="text-gray-500">Diff Viewed</span>
            <span className={`ml-2 ${diffViewed ? "text-green-400" : "text-red-400"}`}>
              {diffViewed ? "Yes" : "No"}
            </span>
          </div>
        )}
        {explanationViewed !== undefined && (
          <div>
            <span className="text-gray-500">Explanation Viewed</span>
            <span className={`ml-2 ${explanationViewed ? "text-green-400" : "text-red-400"}`}>
              {explanationViewed ? "Yes" : "No"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
