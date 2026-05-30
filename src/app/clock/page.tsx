import { Suspense } from "react";

import { PublicClockScreen } from "@/components/temptrack/public-clock-screen";

export const dynamic = "force-dynamic";

export default function ClockPage() {
  return (
    <Suspense fallback={null}>
      <PublicClockScreen />
    </Suspense>
  );
}
