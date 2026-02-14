"use client";

import { useEffect, useState } from "react";
import { formatDateTimeTR } from "@/lib/format";

export function LiveClock() {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date()); // client-side hydration fix
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!now) {
        return (
            <span className="opacity-0" aria-hidden="true">
                ...
            </span>
        );
    }

    return <>{formatDateTimeTR(now)}</>;
}
