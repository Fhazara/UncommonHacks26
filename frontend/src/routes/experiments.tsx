import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { healthCheck, listExperiments } from "@/lib/api";
import type { ExperimentSummary } from "@/lib/types";
import { ExperimentStatusBadge } from "@/components/ExperimentStatusBadge";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsLayout,
});

function ExperimentsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // active experiment id from URL (if on /experiments/:id)
  const activeId = (() => {
    const m = location.pathname.match(/^\/experiments\/([^/]+)$/);
    return m && m[1] !== "new" ? m[1] : null;
  })();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await listExperiments();
        if (!cancelled) setExperiments(list);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-950 text-white font-mono">
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-950">
        <div className="p-3">
          <button
            onClick={() => navigate({ to: "/experiments/new" })}
            className="w-full rounded bg-blue-700 px-3 py-2 text-sm font-mono text-white hover:bg-blue-600"
          >
            + New Experiment
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading && experiments.length === 0 ? (
            <div className="mt-8 text-center text-xs text-gray-600">Loading…</div>
          ) : experiments.length === 0 ? (
            <div className="mt-8 text-center text-xs text-gray-600">No experiments yet</div>
          ) : (
            <ul className="space-y-1">
              {experiments.map((exp) => {
                const isActive = exp.experiment_id === activeId;
                return (
                  <li key={exp.experiment_id}>
                    <Link
                      to="/experiments/$id"
                      params={{ id: exp.experiment_id }}
                      className={`block rounded px-2 py-2 text-xs transition-colors ${
                        isActive
                          ? "bg-gray-800 border-l-2 border-blue-500"
                          : "hover:bg-gray-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-white">{exp.task_name}</span>
                        <ExperimentStatusBadge status={exp.status} />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date(exp.created_at).toLocaleString()}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-800 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                backendOk === null
                  ? "bg-gray-600"
                  : backendOk
                    ? "bg-green-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-gray-400">
              {backendOk === null
                ? "Checking backend…"
                : backendOk
                  ? "Backend connected"
                  : "Backend unreachable"}
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  );
}


