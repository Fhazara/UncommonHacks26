"use client";
import { useEffect, useState } from "react";
import { getActionLogs } from "@/lib/api";
import { MOCK_LOGS } from "@/lib/mockData";

export default function TelemetryPage() {
  const [logs, setLogs] = useState(MOCK_LOGS);

  useEffect(() => {
    getActionLogs(100).then(setLogs).catch(() => {});
  }, []);

  const avgRisk = Math.round(logs.reduce((s, l) => s + (l.action_risk_score || 0), 0) / Math.max(logs.length, 1));
  const avgDrift = Math.round(logs.reduce((s, l) => s + (l.cognitive_drift_score || 0), 0) / Math.max(logs.length, 1));
  const avgScore = Math.round(logs.reduce((s, l) => s + (l.intervention_score || 0), 0) / Math.max(logs.length, 1));

  const decisionCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.decision] = (acc[l.decision] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold font-mono text-white">Research Telemetry</h1>
          <p className="text-gray-400 text-sm">Aggregated session metrics for human-AI oversight research.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "AVG ACTION RISK", value: avgRisk, color: "text-orange-400" },
            { label: "AVG DRIFT SCORE", value: avgDrift, color: "text-yellow-400" },
            { label: "AVG INTERVENTION", value: avgScore, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-500 text-xs font-mono">{s.label}</p>
              <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-xs font-mono mb-3">DECISION DISTRIBUTION</p>
          <div className="space-y-2">
            {Object.entries(decisionCounts).map(([decision, count]) => (
              <div key={decision} className="flex items-center gap-3">
                <span className="text-gray-400 font-mono text-xs w-24">{decision.toUpperCase()}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      decision === "allow" ? "bg-green-500" :
                      decision === "warn" ? "bg-yellow-500" :
                      decision === "reflect" ? "bg-orange-500" : "bg-red-500"
                    }`}
                    style={{ width: `${(count / logs.length) * 100}%` }}
                  />
                </div>
                <span className="text-gray-400 font-mono text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
          <p className="text-gray-400 text-xs font-mono mb-3">EXPORT STATUS</p>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-green-400">●</span>
            <span className="text-gray-300">Local SQLite + JSONL: Active</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-gray-600">○</span>
            <span className="text-gray-500">Snowflake: Set SNOWFLAKE_ENABLED=true in .env</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-mono">
            <span className="text-gray-600">○</span>
            <span className="text-gray-500">Wafer: Set WAFER_ENABLED=true in .env</span>
          </div>
        </div>
      </div>
    </div>
  );
}
