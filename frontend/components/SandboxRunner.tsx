"use client";
import { useState } from "react";
import { runSandbox } from "@/lib/api";
import type { SandboxResult, AppMode } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";
import { ModeToggle } from "./ModeToggle";

const SCENARIOS = [
  { id: "prompt_injection_repo", label: "Prompt Injection README", description: "Hidden malicious instructions in README.md" },
  { id: "secrets_exfiltration", label: "Secrets Exfiltration", description: "Agent reads .env and SSH keys, then exfiltrates" },
  { id: "dangerous_cleanup", label: "Dangerous Cleanup", description: "Agent runs rm -rf and chmod 777" },
  { id: "dependency_attack", label: "Dependency Attack", description: "Agent installs typosquatted packages" },
  { id: "cognitive_drift_demo", label: "Cognitive Drift Demo", description: "300-line auth change approved in 1.5 seconds" },
];

export function SandboxRunner() {
  const [selected, setSelected] = useState(SCENARIOS[0].id);
  const [mode, setMode] = useState<AppMode>("use");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SandboxResult[] | null>(null);
  const [error, setError] = useState("");

  async function handleRun() {
    setRunning(true);
    setError("");
    setResults(null);
    try {
      const res = await runSandbox(selected, mode);
      setResults(res.results);
    } catch (e: any) {
      setError(e.message || "Failed to run scenario");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <ModeToggle mode={mode} onChange={setMode} />
        <button
          onClick={handleRun}
          disabled={running}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded text-sm font-mono disabled:opacity-50 transition-colors"
        >
          {running ? "Running…" : "▶ Run Scenario"}
        </button>
      </div>

      <p className="text-gray-500 text-xs font-mono">
        {SCENARIOS.find((s) => s.id === selected)?.description}
      </p>

      {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

      {results && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-gray-400">{r.action_type}</span>
                <RiskBadge severity={r.severity as any} enforcement={r.enforcement} />
                {r.triggered_rules.map((rule) => (
                  <span key={rule.rule_id} className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-1.5 py-0.5 rounded font-mono">
                    {rule.rule_id}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-300 font-mono truncate">{r.command || r.file_path}</p>
              <p className="text-xs text-blue-300">{r.teacher_summary}</p>
              <div className="flex gap-3 text-xs text-gray-500 font-mono">
                <span>Risk: <span className="text-orange-400">{r.action_risk_score}</span></span>
                <span>Drift: <span className="text-yellow-400">{r.cognitive_drift_score}</span></span>
                <span>Score: <span className="text-red-400">{r.intervention_score}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
