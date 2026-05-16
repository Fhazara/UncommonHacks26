import { SandboxRunner } from "@/components/SandboxRunner";

export default function SandboxPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold font-mono text-white">Sandbox Scenarios</h1>
          <p className="text-gray-400 text-sm mt-1">
            Run pre-built attack and cognitive drift scenarios against the safety engine.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
          <SandboxRunner />
        </div>
      </div>
    </div>
  );
}
