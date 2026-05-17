import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/experiments/")({
  component: ExperimentsIndex,
});

function ExperimentsIndex() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-6xl text-gray-700">⬡</div>
      <h1 className="mt-6 text-xl text-gray-400">Start a new experiment</h1>
      <p className="mt-2 text-sm text-gray-600">
        Design an HCI agentic coding study using natural language
      </p>
      <button
        onClick={() => navigate({ to: "/experiments/new" })}
        className="mt-8 rounded bg-blue-700 px-5 py-3 text-sm font-mono text-white hover:bg-blue-600"
      >
        + New Experiment
      </button>
    </div>
  );
}
