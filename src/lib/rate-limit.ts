const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): {
    allowed: boolean;
    retryAfterMs: number;
} {
    const now = Date.now();
    const record = attempts.get(key);

    if (!record || now > record.resetAt) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true, retryAfterMs: 0 };
    }

    if (record.count >= MAX_ATTEMPTS) {
        return { allowed: false, retryAfterMs: record.resetAt - now };
    }

    record.count++;
    return { allowed: true, retryAfterMs: 0 };
}
