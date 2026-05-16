interface Props {
  score: number;
}

export function CognitiveDriftMeter({ score }: Props) {
  const clamped = Math.min(Math.max(score, 0), 100);

  const level =
    clamped < 25
      ? "Engaged"
      : clamped < 50
      ? "Mild Drift"
      : clamped < 75
      ? "Strong Drift"
      : "Passive Approval";

  const barColor =
    clamped < 25
      ? "bg-green-500"
      : clamped < 50
      ? "bg-yellow-500"
      : clamped < 75
      ? "bg-orange-500"
      : "bg-red-500";

  const textColor =
    clamped < 25
      ? "text-green-400"
      : clamped < 50
      ? "text-yellow-400"
      : clamped < 75
      ? "text-orange-400"
      : "text-red-400";

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400 text-xs font-mono">COGNITIVE DRIFT</span>
        <span className={`font-bold text-sm font-mono ${textColor}`}>
          {clamped} — {level}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className={`${barColor} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1 font-mono">
        <span>Engaged</span>
        <span>Mild</span>
        <span>Strong</span>
        <span>Passive</span>
      </div>
    </div>
  );
}
