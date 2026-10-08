"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

type State = "idle" | "working" | "done" | "error";

export function UnsubscribeCard() {
  const token = useSearchParams().get("t") ?? "";
  const [state, setState] = useState<State>(token ? "idle" : "error");

  async function unsubscribe() {
    setState("working");
    try {
      const res = await fetch(`/api/unsubscribe?t=${encodeURIComponent(token)}`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-[2rem] bg-white/[0.03] p-1.5 ring-1 ring-white/[0.08]">
      <div className="flex flex-col items-start gap-5 rounded-[calc(2rem-0.375rem)] bg-card p-8 shadow-[inset_0_1px_1px_rgb(255_255_255/0.08)]">
        {state === "done" ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">You&apos;re unsubscribed</h1>
            <p className="leading-relaxed text-muted">We won&apos;t email you about CrewJio again. Changed your mind? Just reply to any of our emails.</p>
          </>
        ) : state === "error" ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">That link didn&apos;t work</h1>
            <p className="leading-relaxed text-muted">
              Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Unsubscribe`} className="text-cloud underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>{" "}
              and we&apos;ll take you off the list by hand.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Unsubscribe from CrewJio?</h1>
            <p className="leading-relaxed text-muted">You&apos;ll stop getting waitlist and launch emails.</p>
            <button
              type="button"
              onClick={unsubscribe}
              disabled={state === "working"}
              className="min-h-12 rounded-full bg-amber px-6 font-semibold text-on-amber transition-transform duration-500 ease-fluid active:scale-[0.97] disabled:opacity-80"
            >
              {state === "working" ? "Unsubscribing" : "Unsubscribe"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
