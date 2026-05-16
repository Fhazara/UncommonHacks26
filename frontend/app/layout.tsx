import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Claude Code on a Leash",
  description: "AI agent safety, comprehension, and telemetry firewall",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-white font-mono">🔒 Claude Code on a Leash</span>
          <a href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">Dashboard</a>
          <a href="/sandbox" className="text-gray-400 hover:text-white text-sm transition-colors">Sandbox</a>
          <a href="/policies" className="text-gray-400 hover:text-white text-sm transition-colors">Policies</a>
          <a href="/telemetry" className="text-gray-400 hover:text-white text-sm transition-colors">Telemetry</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
