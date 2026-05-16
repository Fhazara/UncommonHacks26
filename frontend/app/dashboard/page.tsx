"use client";
import { useEffect, useState } from "react";
import { getActionLogs } from "@/lib/api";
import { MOCK_LOGS } from "@/lib/mockData";
import type { ActionLog, AppMode } from "@/lib/types";
import { StatsCards } from "@/components/StatsCards";
import { ActionCard } from "@/components/ActionCard";
import { CognitiveDriftMeter } from "@/components/CognitiveDriftMeter";
import { ModeToggle } from "@/components/ModeToggle";

export default function DashboardPage() {
  const [logs, setLogs] = useState<ActionLog[]>(MOCK_LOGS);
  const [mode, setMode] = useState<AppMode>("research");
  const [connected, setConnected] = useState(false);

  async function load() {
    try {
      const data = await getActionLogs(50);
      if (data && data.length > 0) {
        setLogs(data);
        setConnected(true);
      }
    } catch {
      // Backend not available — keep mock data
      setConnected(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: logs.length,
    allowed: logs.filter((l) => l.enforcement === "allowed").length,
    warned: logs.filter((l) => ["warned", "would_warn"].includes(l.enforcement)).length,
    reflected: logs.filter((l) => ["reflection_required", "would_reflect"].includes(l.enforcement)).length,
    blocked: logs.filter((l) => ["blocked", "would_block"].includes(l.enforcement)).length,
  };

  const latestDrift = logs[0]?.cognitive_drift_score ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold font-mono text-white">Agent Safety Monitor</h1>
            <p className="text-gray-500 text-xs font-mono">
              {connected ? "● Connected to backend" : "○ Using demo data (backend offline)"}
            </p>
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        <StatsCards {...stats} />

        <CognitiveDriftMeter score={latestDrift} />

        <div className="bg-gray-900 border border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-mono text-sm text-gray-300">ACTION TIMELINE</h2>
            <span className="text-xs text-gray-500 font-mono">Auto-refreshes every 3s</span>
          </div>
          <div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-600 font-mono text-sm">
                No actions yet. Run a sandbox scenario to populate the timeline.
              </div>
            ) : (
              logs.map((log) => (
                <ActionCard
                  key={log.id}
                  log={log}
                  onClick={() => window.open(`/reports/${log.id}`, "_blank")}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
