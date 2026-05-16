const STYLES: Record<string, string> = {
  allowed: "bg-green-950 border-green-700 text-green-300",
  warned: "bg-yellow-950 border-yellow-700 text-yellow-300",
  would_warn: "bg-yellow-950 border-yellow-700 text-yellow-400 opacity-80",
  reflection_required: "bg-orange-950 border-orange-700 text-orange-300",
  would_reflect: "bg-orange-950 border-orange-700 text-orange-400 opacity-80",
  blocked: "bg-red-950 border-red-700 text-red-300",
  would_block: "bg-red-950 border-red-700 text-red-400 opacity-80",
};

const ICONS: Record<string, string> = {
  allowed: "✓",
  warned: "⚠",
  would_warn: "⚠",
  reflection_required: "?",
  would_reflect: "?",
  blocked: "✗",
  would_block: "✗",
};

interface Props {
  enforcement: string;
  mode: string;
}

export function InterventionBanner({ enforcement, mode }: Props) {
  const style = STYLES[enforcement] ?? "bg-gray-900 border-gray-700 text-gray-300";
  const icon = ICONS[enforcement] ?? "·";
  const label = enforcement.replace(/_/g, " ").toUpperCase();
  const researchNote = mode === "research" ? " (Research — Not Enforced)" : "";

  return (
    <div className={`border rounded px-3 py-1.5 text-xs font-mono flex items-center gap-2 ${style}`}>
      <span>{icon}</span>
      <span>
        {label}
        {researchNote}
      </span>
    </div>
  );
}
