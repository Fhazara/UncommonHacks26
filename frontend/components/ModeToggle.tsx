"use client";
import type { AppMode } from "@/lib/types";

interface Props {
  mode: AppMode;
  onChange: (m: AppMode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
      <button
        onClick={() => onChange("research")}
        className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
          mode === "research"
            ? "bg-blue-700 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        RESEARCH
      </button>
      <button
        onClick={() => onChange("use")}
        className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
          mode === "use"
            ? "bg-red-700 text-white"
            : "text-gray-400 hover:text-white"
        }`}
      >
        USE MODE
      </button>
    </div>
  );
}
