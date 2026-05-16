import type { TeacherExplanation } from "@/lib/types";

const BORDER_COLORS: Record<string, string> = {
  low: "border-green-700",
  medium: "border-yellow-700",
  high: "border-orange-700",
  critical: "border-red-700",
};

interface Props {
  explanation: TeacherExplanation;
}

export function TeacherExplanationCard({ explanation }: Props) {
  const borderColor = BORDER_COLORS[explanation.risk_level] ?? "border-gray-700";

  return (
    <div className={`bg-gray-900 border-l-4 ${borderColor} rounded-lg p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <span className="text-blue-400 text-xs font-mono font-bold">TEACHER MODEL</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${borderColor} text-gray-300`}>
          {explanation.risk_level.toUpperCase()}
        </span>
      </div>

      <p className="text-white font-medium">{explanation.plain_english_summary}</p>

      <div className="space-y-2 text-sm">
        <div>
          <p className="text-gray-400 text-xs font-mono mb-0.5">WHY IT MATTERS</p>
          <p className="text-gray-200">{explanation.why_it_matters}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs font-mono mb-0.5">WHAT COULD GO WRONG</p>
          <p className="text-gray-200">{explanation.what_could_go_wrong}</p>
        </div>
        {explanation.safer_alternative && (
          <div>
            <p className="text-green-400 text-xs font-mono mb-0.5">SAFER ALTERNATIVE</p>
            <p className="text-green-200">{explanation.safer_alternative}</p>
          </div>
        )}
      </div>
    </div>
  );
}
