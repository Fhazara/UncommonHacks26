import type {
  ExperimentSummary,
  ExperimentDetail,
  ExperimentStartResponse,
  CreateExperimentPayload,
  TelemetryResponse,
} from "./types";

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://leasing-imagine-lucy-pulled.trycloudflare.com";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function listExperiments(): Promise<ExperimentSummary[]> {
  return apiFetch("/api/experiments");
}

export async function getExperiment(id: string): Promise<ExperimentDetail> {
  return apiFetch(`/api/experiments/${id}`);
}

export async function createExperiment(
  payload: CreateExperimentPayload,
): Promise<{ experiment_id: string }> {
  return apiFetch("/api/experiments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startExperiment(
  id: string,
): Promise<ExperimentStartResponse> {
  return apiFetch(`/api/experiments/${id}/start`, { method: "POST" });
}

export async function stopExperiment(id: string): Promise<{ status: string }> {
  return apiFetch(`/api/experiments/${id}/stop`, { method: "POST" });
}

export async function getTelemetry(
  id: string,
  eventType?: string,
): Promise<TelemetryResponse> {
  const qs = eventType ? `?event_type=${eventType}` : "";
  return apiFetch(`/api/experiments/${id}/telemetry${qs}`);
}

export async function uploadStarterCode(
  file: File,
): Promise<{ upload_token: string; filename: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/starter-code/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch("/health");
}
