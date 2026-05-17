import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getExperiment, getTelemetry, stopExperiment } from "@/lib/api";
import type {
  ExperimentDetail,
  ParsedConfig,
  TelemetryEvent,
  TelemetryResponse,
} from "@/lib/types";
import { ExperimentStatusBadge } from "@/components/ExperimentStatusBadge";
import { MetricCard } from "@/components/MetricCard";

export const Route = createFileRoute("/experiments/$id")({
  component: ExperimentDashboard,
});

function ExperimentDashboard() {
  const { id } = useParams({ from: "/experiments/$id" });
  const [exp, setExp] = useState<ExperimentDetail | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, t] = await Promise.all([getExperiment(id), getTelemetry(id)]);
      setExp(e);
      setTelemetry(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!exp) return;
    if (exp.status !== "running" && exp.status !== "provisioning") return;
    const i = setInterval(load, 8_000);
    return () => clearInterval(i);
  }, [exp, load]);

  const handleStop = async () => {
    setStopping(true);
    try {
      await stopExperiment(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setStopping(false);
    }
  };

  const parsedConfig = useMemo<ParsedConfig | null>(() => {
    if (!exp?.parsed_config) return null;
    try {
      return JSON.parse(exp.parsed_config) as ParsedConfig;
    } catch {
      return null;
    }
  }, [exp]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-10 text-sm text-gray-400">
        <Spinner /> Loading experiment…
      </div>
    );
  }
  if (error || !exp) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-sm text-red-400">
        {error ?? "Experiment not found"}
      </div>
    );
  }

  const taskName = parsedConfig?.task_name ?? "Experiment";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 font-mono text-white">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-xl font-semibold">{taskName}</h1>
            <ExperimentStatusBadge status={exp.status} />
          </div>
          <p className="mt-2 text-sm text-gray-400">
            {exp.nl_description.length > 120
              ? `${exp.nl_description.slice(0, 120)}…`
              : exp.nl_description}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            {exp.started_at && (
              <span>Started: {new Date(exp.started_at).toLocaleString()}</span>
            )}
            {(exp.status === "completed" || exp.status === "failed") &&
              exp.ended_at && (
                <span>Ended: {new Date(exp.ended_at).toLocaleString()}</span>
              )}
            <span>Model: {exp.model}</span>
            <span>Source: {exp.starter_code_source}</span>
          </div>
          {exp.error && (
            <p className="mt-2 text-xs text-red-400">{exp.error}</p>
          )}
        </div>

        <div className="flex gap-2">
          {exp.status === "running" && exp.vscode_port && (
            <a
              href={`http://localhost:${exp.vscode_port}`}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-blue-700 px-3 py-1 text-sm text-white hover:bg-blue-600"
            >
              Open VS Code
            </a>
          )}
          {exp.status === "running" && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="inline-flex items-center gap-2 rounded bg-red-800 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {stopping && <Spinner />} Stop Experiment
            </button>
          )}
        </div>
      </div>

      {/* Config */}
      <div className="mt-8 rounded-lg border border-gray-800 bg-gray-900">
        <button
          onClick={() => setConfigOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs tracking-widest text-gray-500"
        >
          <span>EXPERIMENT CONFIGURATION</span>
          <span>{configOpen ? "▾" : "▸"}</span>
        </button>
        {configOpen && parsedConfig && (
          <div className="space-y-4 border-t border-gray-800 px-4 py-4 text-sm">
            <ConfigRow label="TASK" value={parsedConfig.task_description} />
            <ConfigRow label="JUDGE PERSONA" value={parsedConfig.judge_persona} />
            <div>
              <div className="text-xs tracking-widest text-gray-500">
                END CONDITIONS
              </div>
              <ul className="mt-1 ml-4 list-disc space-y-0.5 text-gray-300">
                {parsedConfig.end_conditions.time_limit_seconds != null && (
                  <li>
                    Time limit:{" "}
                    {Math.round(
                      parsedConfig.end_conditions.time_limit_seconds / 60,
                    )}{" "}
                    minutes
                  </li>
                )}
                {parsedConfig.end_conditions.task_completion && (
                  <li>
                    Task completion:{" "}
                    {parsedConfig.end_conditions.task_completion.type}
                  </li>
                )}
                <li>Manual stop: {String(parsedConfig.end_conditions.manual)}</li>
              </ul>
            </div>
            <div>
              <div className="text-xs tracking-widest text-gray-500 mb-2">
                ACTIVE INTERVENTIONS
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(parsedConfig.active_interventions).map(
                  ([k, on]) => (
                    <span
                      key={k}
                      className={`rounded px-2 py-0.5 text-xs ${
                        on
                          ? "bg-blue-900 text-blue-300"
                          : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {k}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
        {configOpen && !parsedConfig && (
          <div className="border-t border-gray-800 px-4 py-4 text-xs text-gray-500">
            No parsed config available.
          </div>
        )}
      </div>

      {/* Telemetry */}
      <TelemetrySection telemetry={telemetry} />
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs tracking-widest text-gray-500">{label}</div>
      <p className="mt-1 whitespace-pre-wrap text-gray-200">{value}</p>
    </div>
  );
}

function TelemetrySection({ telemetry }: { telemetry: TelemetryResponse | null }) {
  if (!telemetry || telemetry.count === 0) {
    return (
      <div className="mt-10 py-8 text-center text-sm text-gray-600">
        No telemetry collected yet. The VS Code extension will send events as
        the experiment runs.
      </div>
    );
  }

  const events = telemetry.events;
  const ofType = (type: string) => events.filter((e) => e.event_type === type);

  // Engagement
  const responseTimes = ofType("response_timing")
    .map((e) => e.data.response_time_ms as number | undefined)
    .filter((v): v is number => typeof v === "number");
  const avgResponseTime = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  const agentOutputs = ofType("agent_output").length;
  const humanEdits = ofType("human_edit_of_agent_code").length;
  const editRate = agentOutputs > 0 ? humanEdits / agentOutputs : null;

  const diffScrollDepths = ofType("diff_view")
    .map((e) => e.data.scroll_depth_pct as number | undefined)
    .filter((v): v is number => typeof v === "number");
  const avgScrollDepth = diffScrollDepths.length
    ? Math.round(
        diffScrollDepths.reduce((a, b) => a + b, 0) / diffScrollDepths.length,
      )
    : null;

  const overrides = ofType("override").length;

  // Agency
  const fileEdits = ofType("file_edit");
  const sumLines = (author: string) =>
    fileEdits
      .filter((e) => e.data.author === author)
      .reduce((s, e) => s + ((e.data.lines_added as number) || 0), 0);
  const humanLines = sumLines("human");
  const agentLines = sumLines("agent");
  const totalLines = humanLines + agentLines;
  const humanPct = totalLines > 0 ? (humanLines / totalLines) * 100 : 50;

  const humanInitiated = ofType("task_initiation").filter(
    (e) => e.data.initiator === "human",
  ).length;
  const agentInitiated = ofType("task_initiation").filter(
    (e) => e.data.initiator === "agent",
  ).length;

  // Understanding
  const judgeInteractions = ofType("judge_interaction");
  const predAccs = judgeInteractions
    .map((e) => e.data.prediction_accuracy as number | undefined)
    .filter((v): v is number => typeof v === "number");
  const avgPredAcc = predAccs.length
    ? (predAccs.reduce((a, b) => a + b, 0) / predAccs.length).toFixed(2)
    : null;

  const bugEvents = judgeInteractions.filter((e) => e.data.bug_injected);
  const bugCaught = bugEvents.filter((e) => e.data.bug_caught).length;
  const bugCatchRate =
    bugEvents.length > 0 ? bugCaught / bugEvents.length : null;

  return (
    <div className="mt-10 space-y-10">
      <section>
        <h2 className="text-xs tracking-widest text-gray-500 mb-3">
          HUMAN ENGAGEMENT
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label="Avg Response Time"
            value={avgResponseTime}
            suffix="ms"
          />
          <MetricCard
            label="Edit Rate"
            value={editRate !== null ? `${Math.round(editRate * 100)}%` : null}
            highlight={
              editRate === null
                ? "none"
                : editRate > 0.3
                  ? "blue"
                  : editRate < 0.1
                    ? "yellow"
                    : "none"
            }
          />
          <MetricCard
            label="Avg Diff Scroll"
            value={avgScrollDepth !== null ? `${avgScrollDepth}%` : null}
            highlight={
              avgScrollDepth === null
                ? "none"
                : avgScrollDepth > 80
                  ? "green"
                  : avgScrollDepth < 40
                    ? "yellow"
                    : "none"
            }
          />
          <MetricCard
            label="Overrides"
            value={overrides}
            highlight={overrides > 5 ? "red" : "none"}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs tracking-widest text-gray-500 mb-3">
          AGENCY DISTRIBUTION
        </h2>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Human — {humanLines} lines</span>
            <span>Agent — {agentLines} lines</span>
          </div>
          <div className="mt-2 flex h-3 w-full overflow-hidden rounded bg-gray-800">
            <div
              className="bg-blue-600"
              style={{ width: `${humanPct}%` }}
            />
            <div
              className="bg-gray-500"
              style={{ width: `${100 - humanPct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-6 text-xs text-gray-500">
            <span>Human-initiated tasks: {humanInitiated}</span>
            <span>Agent-initiated tasks: {agentInitiated}</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs tracking-widest text-gray-500 mb-3">
          HUMAN UNDERSTANDING
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <MetricCard label="Avg Prediction Accuracy" value={avgPredAcc} />
          <MetricCard
            label="Bug Catch Rate"
            value={
              bugCatchRate !== null
                ? `${Math.round(bugCatchRate * 100)}%`
                : null
            }
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs tracking-widest text-gray-500 mb-3">
          EVENT TIMELINE
        </h2>
        <div>
          {[...events]
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            )
            .slice(0, 20)
            .map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
        </div>
      </section>
    </div>
  );
}

function EventRow({ event }: { event: TelemetryEvent }) {
  const summary = (() => {
    const d = event.data;
    if (event.event_type === "file_edit" && typeof d.file_path === "string")
      return d.file_path;
    if (
      event.event_type === "terminal_command" &&
      typeof d.command_line === "string"
    )
      return d.command_line;
    if (
      event.event_type === "judge_interaction" &&
      typeof d.prompt_text === "string"
    )
      return d.prompt_text.slice(0, 80);
    return JSON.stringify(d).slice(0, 80);
  })();
  const time = new Date(event.timestamp).toLocaleTimeString();
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-800 py-2 text-xs">
      <span className="w-48 shrink-0 text-gray-500 uppercase">
        {event.event_type}
      </span>
      <span className="min-w-0 flex-1 truncate text-gray-300">{summary}</span>
      <span className="shrink-0 text-gray-600">{time}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
  );
}
