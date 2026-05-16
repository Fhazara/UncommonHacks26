interface Stat {
  label: string;
  value: number;
  color: string;
}

interface Props {
  total: number;
  allowed: number;
  warned: number;
  reflected: number;
  blocked: number;
}

export function StatsCards({ total, allowed, warned, reflected, blocked }: Props) {
  const stats: Stat[] = [
    { label: "TOTAL", value: total, color: "text-white" },
    { label: "ALLOWED", value: allowed, color: "text-green-400" },
    { label: "WARNED", value: warned, color: "text-yellow-400" },
    { label: "REFLECTED", value: reflected, color: "text-orange-400" },
    { label: "BLOCKED", value: blocked, color: "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-xs font-mono">{s.label}</p>
          <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
