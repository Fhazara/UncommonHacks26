import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createExperiment, startExperiment, uploadStarterCode } from "@/lib/api";
import type { CreateExperimentPayload } from "@/lib/types";

export const Route = createFileRoute("/experiments/new")({
  component: NewExperimentPage,
});

type StarterSource = "none" | "github" | "upload";

function NewExperimentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step 1
  const [nlDescription, setNlDescription] = useState("");
  // step 2
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  // step 3
  const [starterSource, setStarterSource] = useState<StarterSource>("none");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubBranch, setGithubBranch] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);

  const canAdvance = (): boolean => {
    if (step === 1) return nlDescription.trim().length > 0;
    if (step === 2) return apiKey.trim().startsWith("sk-");
    if (step === 3) {
      if (starterSource === "github") return githubUrl.trim().length > 0;
      if (starterSource === "upload") return zipFile !== null;
      return true;
    }
    return true;
  };

  const handleLaunch = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (starterSource === "upload" && zipFile) {
        await uploadStarterCode(zipFile);
      }
      const payload: CreateExperimentPayload = {
        nl_description: nlDescription,
        starter_code_source: starterSource,
        anthropic_api_key: apiKey,
        model,
        ...(starterSource === "github"
          ? {
              github_url: githubUrl,
              github_token: githubToken || undefined,
            }
          : {}),
      };
      const { experiment_id } = await createExperiment(payload);
      await startExperiment(experiment_id);
      navigate({ to: "/experiments/$id", params: { id: experiment_id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to launch");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 font-mono text-white">
      <h1 className="text-2xl font-bold">New Experiment</h1>

      <StepIndicator current={step} />

      <div className="mt-8">
        {step === 1 && (
          <div>
            <label className="text-sm text-gray-400">
              Describe your experiment in natural language
            </label>
            <textarea
              rows={8}
              value={nlDescription}
              onChange={(e) => setNlDescription(e.target.value)}
              className="mt-2 w-full resize-none rounded border border-gray-700 bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={`Example: Study how junior developers' oversight quality degrades over a 30-minute session with an AI coding agent. The judge should be a skeptical senior engineer who periodically asks the human to predict what the agent will do next and explain recent changes. End after 30 minutes or when all tests pass.`}
            />
            <p className="mt-2 text-xs text-gray-500">
              The judge agent's persona, task setup, and end conditions will be
              parsed from your description.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm text-gray-400">Anthropic API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="mt-2 w-full rounded border border-gray-700 bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                Your key is sent directly to the backend and embedded in the
                experiment container. It is not stored beyond the experiment
                session.
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-2 w-full rounded border border-gray-700 bg-gray-900 p-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Recommended)</option>
                <option value="claude-opus-4-7">Claude Opus 4.7</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <StarterCard
              selected={starterSource === "none"}
              onClick={() => setStarterSource("none")}
              title="None"
              description="Start with an empty workspace. The participant begins with a blank VS Code environment."
            />
            <StarterCard
              selected={starterSource === "github"}
              onClick={() => setStarterSource("github")}
              title="GitHub Repository"
              description="Clone a GitHub repository."
            >
              {starterSource === "github" && (
                <div className="mt-4 space-y-3">
                  <input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full rounded border border-gray-700 bg-gray-950 p-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    placeholder="main"
                    className="w-full rounded border border-gray-700 bg-gray-950 p-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="Personal Access Token (optional, for private repos)"
                    className="w-full rounded border border-gray-700 bg-gray-950 p-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </StarterCard>
            <StarterCard
              selected={starterSource === "upload"}
              onClick={() => setStarterSource("upload")}
              title="Upload ZIP"
              description="Upload a ZIP file."
            >
              {starterSource === "upload" && (
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-700 p-6 text-sm text-gray-500 hover:border-blue-500">
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                  />
                  {zipFile ? (
                    <span className="text-blue-400">{zipFile.name}</span>
                  ) : (
                    <span>Drop .zip here or click to browse</span>
                  )}
                </label>
              )}
            </StarterCard>
          </div>
        )}

        {step === 4 && (
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-5 text-sm">
            <div className="text-xs tracking-widest text-gray-500">
              EXPERIMENT DESCRIPTION
            </div>
            <p className="mt-2 whitespace-pre-wrap text-gray-200">
              {nlDescription.slice(0, 200)}
              {nlDescription.length > 200 ? "…" : ""}
            </p>
            <div className="mt-6 grid grid-cols-[120px_1fr] gap-y-2 text-gray-300">
              <span className="text-gray-500">MODEL</span>
              <span>{model}</span>
              <span className="text-gray-500">STARTER CODE</span>
              <span>
                {starterSource === "github"
                  ? `GitHub → ${githubUrl}`
                  : starterSource === "upload"
                    ? `ZIP upload: ${zipFile?.name ?? "(none)"}`
                    : "None"}
              </span>
            </div>

            <button
              onClick={handleLaunch}
              disabled={submitting}
              className="mt-6 inline-flex items-center gap-2 rounded bg-green-700 px-6 py-2 font-mono text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Spinner />}
              Launch Experiment
            </button>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
      {step === 4 && (
        <div className="mt-8">
          <button
            onClick={() => setStep(3)}
            className="rounded border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = [1, 2, 3, 4];
  return (
    <div className="mt-6 flex items-center">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
              s < current
                ? "bg-blue-600 text-white"
                : s === current
                  ? "border border-blue-400 bg-blue-800 text-white"
                  : "bg-gray-800 text-gray-500"
            }`}
          >
            {s}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-px flex-1 ${s < current ? "bg-blue-600" : "bg-gray-800"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StarterCard({
  selected,
  onClick,
  title,
  description,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border bg-gray-900 p-4 transition-colors ${
        selected ? "border-blue-500" : "border-gray-700 hover:border-gray-600"
      }`}
    >
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs text-gray-500">{description}</div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}
