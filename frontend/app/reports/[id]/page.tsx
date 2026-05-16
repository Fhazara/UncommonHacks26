"use client";
import { useEffect, useState } from "react";
import { getActionDetail } from "@/lib/api";
import { TeacherExplanationCard } from "@/components/TeacherExplanationCard";
import { InterventionBanner } from "@/components/InterventionBanner";
import { CognitiveDriftMeter } from "@/components/CognitiveDriftMeter";
import { TelemetryPanel } from "@/components/TelemetryPanel";

export default function ReportPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getActionDetail(params.id).then(setData).catch(() => setError("Action not found"));
  }, [params.id]);

  if (error) return <div className="p-8 text-red-400 font-mono">{error}</div>;
  if (!data) return <div className="p-8 text-gray-400 font-mono">Loading…</div>;

  const { event, decision } = data;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold font-mono text-white">Action Report</h1>
            <p className="text-gray-500 text-xs font-mono">{params.id}</p>
          </div>
          <InterventionBanner enforcement={decision.enforcement} mode={event.mode} />
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
          <p className="text-gray-400 text-xs font-mono">ACTION DETAILS</p>
          <div className="grid grid-cols-2 gap-2 text-sm font-mono">
            <div><span className="text-gray-500">Type: </span><span className="text-gray-200">{event.action_type}</span></div>
            <div><span className="text-gray-500">Mode: </span><span className="text-gray-200">{event.mode}</span></div>
            {event.command && <div className="col-span-2"><span className="text-gray-500">Command: </span><span className="text-orange-300">{event.command}</span></div>}
            {event.file_path && <div className="col-span-2"><span className="text-gray-500">File: </span><span className="text-blue-300">{event.file_path}</span></div>}
          </div>
        </div>

        {decision.teacher_explanation && (
          <TeacherExplanationCard explanation={decision.teacher_explanation} />
        )}

        <CognitiveDriftMeter score={decision.cognitive_drift_score ?? 0} />

        <TelemetryPanel
          exports={decision.exports ?? { local: true, snowflake: false, wafer: false }}
          actionRiskScore={decision.action_risk_score}
          driftScore={decision.cognitive_drift_score}
          interventionScore={decision.intervention_score}
          approvalTimeMs={event.approval_time_ms}
          diffViewed={event.diff_viewed}
          explanationViewed={event.explanation_viewed}
        />

        {decision.triggered_rules?.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
            <p className="text-gray-400 text-xs font-mono">TRIGGERED RULES</p>
            {decision.triggered_rules.map((r: any) => (
              <div key={r.rule_id} className="border-l-2 border-red-700 pl-3 space-y-0.5">
                <p className="text-red-300 text-xs font-mono font-bold">{r.rule_id}</p>
                <p className="text-gray-200 text-sm">{r.reason}</p>
                <p className="text-green-400 text-xs">{r.safer_alternative}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
