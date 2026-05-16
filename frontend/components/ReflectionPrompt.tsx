"use client";
import { useState } from "react";
import { submitReflectionAnswer } from "@/lib/api";

interface Props {
  actionId: string;
  sessionId: string;
  question: string;
  onComplete: () => void;
}

export function ReflectionPrompt({ actionId, sessionId, question, onComplete }: Props) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (answer.trim().length < 5) return;
    setSubmitting(true);
    try {
      await submitReflectionAnswer({ action_id: actionId, session_id: sessionId, answer });
      setSubmitted(true);
      setTimeout(onComplete, 1500);
    } catch {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-950 border border-green-700 rounded-lg p-4 text-center">
        <p className="text-green-300 font-mono text-sm">Response recorded. Proceeding with caution.</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-950 border border-yellow-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-yellow-400 text-xs font-mono font-bold">REFLECTION REQUIRED</span>
        <span className="text-yellow-500 text-xs">Answer before continuing</span>
      </div>
      <p className="text-yellow-200 font-medium">{question}</p>
      <textarea
        className="w-full bg-gray-900 text-white border border-gray-600 rounded p-2 text-sm font-mono resize-none h-24 focus:border-yellow-500 focus:outline-none"
        placeholder="Type your understanding before continuing..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={answer.trim().length < 5 || submitting}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Submitting…" : "Submit & Continue"}
        </button>
        <span className="text-gray-500 text-xs">Min 5 characters required</span>
      </div>
    </div>
  );
}
