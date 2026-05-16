import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-white font-mono mb-3">
            Claude Code on a Leash
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            A safety, comprehension, and telemetry layer for AI coding agents.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-left space-y-4">
          <p className="text-gray-300">
            AI coding agents are powerful — but they can be manipulated, and humans often approve
            agent actions without understanding the consequences.
          </p>
          <p className="text-gray-300">
            This system separates <span className="text-white font-bold">approval</span> from{" "}
            <span className="text-white font-bold">understanding</span>. It watches both the agent
            and the human.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm font-mono">
          <div className="bg-gray-900 border border-green-800 rounded-lg p-3">
            <p className="text-green-400 font-bold">ALLOW</p>
            <p className="text-gray-400">Score 0–24</p>
          </div>
          <div className="bg-gray-900 border border-yellow-800 rounded-lg p-3">
            <p className="text-yellow-400 font-bold">WARN</p>
            <p className="text-gray-400">Score 25–59</p>
          </div>
          <div className="bg-gray-900 border border-red-800 rounded-lg p-3">
            <p className="text-red-400 font-bold">BLOCK</p>
            <p className="text-gray-400">Score 100+</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg font-mono transition-colors"
          >
            Open Dashboard →
          </Link>
          <Link
            href="/sandbox"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg font-mono border border-gray-600 transition-colors"
          >
            Run Demo Scenario
          </Link>
        </div>

        <p className="text-gray-600 text-xs font-mono">
          UncommonHacks 2026 · github.com/Fhazara/UncommonHacks26
        </p>
      </div>
    </div>
  );
}
