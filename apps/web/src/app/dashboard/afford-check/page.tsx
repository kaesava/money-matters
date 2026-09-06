import React, { Suspense } from "react";
import { AffordCheckScreen } from "./components/AffordCheckScreen";
import { AffordCheckSkeleton } from "./components/AffordCheckSkeleton";

export const metadata = {
  title: "Can I Afford It? | Money Matters",
  description: "Simulate the financial impact of a purchase or recurring commitment.",
};

export default function AffordCheckPage() {
  return (
    <Suspense fallback={<AffordCheckSkeleton />}>
      <AffordCheckScreen />
    </Suspense>
  );
}
