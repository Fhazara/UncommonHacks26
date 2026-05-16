import type { SeverityLevel } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

interface Policy {
  id: string;
  name: string;
  severity: SeverityLevel;
  risk_points: number;
  reason: string;
  safer_alternative: string;
}

interface Props {
  policies: Policy[];
}

export function PolicyTable({ policies }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-xs">
            <th className="text-left py-2 px-3">RULE ID</th>
            <th className="text-left py-2 px-3">NAME</th>
            <th className="text-left py-2 px-3">SEVERITY</th>
            <th className="text-left py-2 px-3">POINTS</th>
            <th className="text-left py-2 px-3">REASON</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {policies.map((p) => (
            <tr key={p.id} className="hover:bg-gray-800 transition-colors">
              <td className="py-2 px-3 text-blue-400">{p.id}</td>
              <td className="py-2 px-3 text-gray-200">{p.name}</td>
              <td className="py-2 px-3">
                <RiskBadge severity={p.severity} enforcement={p.severity === "critical" ? "blocked" : p.severity === "high" ? "warned" : "allowed"} />
              </td>
              <td className="py-2 px-3 text-orange-400 font-bold">{p.risk_points}</td>
              <td className="py-2 px-3 text-gray-400 max-w-xs truncate">{p.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
