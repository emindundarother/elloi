"use client";

import { useEffect, useState } from "react";
import { formatDateTimeTR } from "@/lib/format";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <time dateTime={now.toISOString()} suppressHydrationWarning>
      {formatDateTimeTR(now)}
    </time>
  );
}
