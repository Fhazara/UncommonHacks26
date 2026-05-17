interface Props {
  label: string;
  value: string | number | null;
  highlight?: "green" | "blue" | "yellow" | "red" | "none";
  suffix?: string;
}

const COLORS: Record<NonNullable<Props["highlight"]>, string> = {
  green: "text-green-400",
  blue: "text-blue-400",
  yellow: "text-yellow-400",
  red: "text-red-400",
  none: "text-white",
};

export function MetricCard({ label, value, highlight = "none", suffix }: Props) {
  const isNull = value === null || value === undefined;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="text-xs text-gray-500 tracking-widest mb-1 uppercase">
        {label}
      </div>
      <div
        className={`text-2xl font-bold font-mono ${isNull ? "text-gray-600" : COLORS[highlight]}`}
      >
        {isNull ? "—" : value}
        {!isNull && suffix ? (
          <span className="text-sm text-gray-500 ml-1">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}
