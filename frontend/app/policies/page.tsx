"use client";
import { useEffect, useState } from "react";
import { getPolicies, reloadPolicies } from "@/lib/api";
import { PolicyTable } from "@/components/PolicyTable";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await getPolicies();
      setPolicies(data.policies ?? []);
    } catch (e: any) {
      setError("Backend offline — cannot load policies");
    } finally {
      setLoading(false);
    }
  }

  async function handleReload() {
    await reloadPolicies();
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-white">Active Policies</h1>
            <p className="text-gray-400 text-sm">{policies.length} rules loaded from default_policies.yaml</p>
          </div>
          <button
            onClick={handleReload}
            className="px-3 py-1.5 bg-gray-800 border border-gray-600 text-gray-300 rounded text-xs font-mono hover:bg-gray-700 transition-colors"
          >
            Reload YAML
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-gray-600 font-mono text-sm">Loading policies…</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 font-mono text-sm">{error}</div>
          ) : (
            <PolicyTable policies={policies} />
          )}
        </div>
      </div>
    </div>
  );
}
