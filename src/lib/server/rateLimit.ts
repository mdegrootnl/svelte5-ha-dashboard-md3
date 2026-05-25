export interface RateLimitRule {
    id: string;
    windowMs: number;
    max: number;
    methods?: readonly string[];
    pathPattern: RegExp;
}

export interface RateLimitResult {
    allowed: boolean;
    rule: RateLimitRule | null;
    remaining: number;
    retryAfterSeconds: number;
    resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;

export const DEFAULT_RATE_LIMIT_RULES: readonly RateLimitRule[] = [
    {
        id: 'auth',
        windowMs: 5 * DEFAULT_WINDOW_MS,
        max: 40,
        methods: ['POST', 'DELETE'],
        pathPattern: /^\/api\/(?:ha-session|ah\/auth)(?:\/|$)/,
    },
    {
        id: 'upload',
        windowMs: 10 * DEFAULT_WINDOW_MS,
        max: 30,
        methods: ['POST'],
        pathPattern: /^\/api\/upload$/,
    },
    {
        id: 'heavy-import',
        windowMs: DEFAULT_WINDOW_MS,
        max: 60,
        pathPattern: /^\/api\/(?:mealie\/import|image-providers\/[^/]+\/(?:search|download))(?:\/|$)/,
    },
    {
        id: 'external-search',
        windowMs: DEFAULT_WINDOW_MS,
        max: 120,
        pathPattern: /^\/api\/(?:ah\/products\/search|image-providers\/[^/]+\/search)(?:\/|$)/,
    },
    {
        id: 'proxy',
        windowMs: DEFAULT_WINDOW_MS,
        max: 600,
        pathPattern: /^(?:\/api\/(?:ha-proxy|mealie)(?:\/|$)|\/ha-history$|\/rain-proxy$)/,
    },
    {
        id: 'api-mutation',
        windowMs: DEFAULT_WINDOW_MS,
        max: 240,
        methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
        pathPattern: /^\/api(?:\/|$)/,
    },
];

interface RateLimitBucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

export function resetRateLimitState() {
    buckets.clear();
}

export function selectRateLimitRule(
    method: string,
    pathname: string,
    rules: readonly RateLimitRule[] = DEFAULT_RATE_LIMIT_RULES,
) {
    const normalizedMethod = method.toUpperCase();
    return rules.find((rule) => {
        if (rule.methods && !rule.methods.includes(normalizedMethod)) return false;
        return rule.pathPattern.test(pathname);
    }) ?? null;
}

export function checkRateLimit({
    identifier,
    method,
    pathname,
    now = Date.now(),
    rules = DEFAULT_RATE_LIMIT_RULES,
}: {
    identifier: string;
    method: string;
    pathname: string;
    now?: number;
    rules?: readonly RateLimitRule[];
}): RateLimitResult {
    const rule = selectRateLimitRule(method, pathname, rules);
    if (!rule) {
        return {
            allowed: true,
            rule: null,
            remaining: Number.POSITIVE_INFINITY,
            retryAfterSeconds: 0,
            resetAt: now,
        };
    }

    const key = `${identifier}:${rule.id}`;
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + rule.windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(rule.max - bucket.count, 0);
    const retryAfterSeconds = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1);

    return {
        allowed: bucket.count <= rule.max,
        rule,
        remaining,
        retryAfterSeconds: bucket.count > rule.max ? retryAfterSeconds : 0,
        resetAt: bucket.resetAt,
    };
}
