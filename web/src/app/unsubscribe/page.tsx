import type { Metadata } from "next";
import { Suspense } from "react";
import { UnsubscribeCard } from "./UnsubscribeCard";

export const metadata: Metadata = {
  title: "Unsubscribe · CrewJio",
  robots: { index: false },
};

export default function UnsubscribePage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[32rem] flex-col justify-center px-4 py-16">
      <Suspense fallback={<div className="h-56 rounded-[2rem] bg-card/60" />}>
        <UnsubscribeCard />
      </Suspense>
    </main>
  );
}
