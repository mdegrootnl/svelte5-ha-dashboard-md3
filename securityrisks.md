# Security Risks & Issues

**Review Date**: January 3, 2026  
**Status**: 3 issues fixed on January 3, 2026

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 High | 0 | - |
| 🟠 Medium | 3 | ✅ 2 Fixed, 1 Mitigated |
| 🟡 Low | 6 | ✅ 3 Fixed, 3 Pending |

---

## 🟠 Medium Severity

### 1. [ ] Insecure Token Storage in localStorage

**File**: `src/lib/stores/ha.svelte.ts` (lines 92-104)

**Issue**: Authentication tokens stored in localStorage are vulnerable to XSS attacks.

**Fix**:
- Consider HttpOnly cookies (requires server component)
- Implement token rotation with short expiration
- Add Content Security Policy headers

---

### 2. [x] HTTP Default for Home Assistant Connections ✅ FIXED

**File**: `src/lib/stores/ha.svelte.ts` (lines 43-45)

**Issue**: Login defaults to `http://` instead of `https://`, exposing credentials on the network.

**Fix**:
```diff
- const protocol = host.startsWith("http") ? "" : "http://";
+ const protocol = host.startsWith("http") ? "" : "https://";
```

---

### 3. [x] No Input Validation on Host/Port Fields ✅ FIXED

**File**: `src/routes/settings/+page.svelte` (lines 7-16)

**Issue**: User-supplied host/port values used directly without sanitization.

**Fix**:
- Validate hostname format (alphanumeric, dots, hyphens)
- Validate port is numeric (1-65535)
- Reject URLs with malicious patterns

---

## 🟡 Low Severity

### 4. [ ] Dependency Vulnerabilities

**Issue**: 6 low-severity vulnerabilities detected by `npm audit`:
- `cookie` < 0.7.0 - accepts out-of-bounds characters
- Transitive deps: `@sveltejs/kit`, `@sveltejs/adapter-auto`, `bits-ui`

**Fix**: Run `npm audit fix` - Note: Full fix requires breaking changes to `@sveltejs/kit`. Safe to defer until next major upgrade.

---

### 5. [x] Missing Content Security Policy (CSP) ✅ FIXED

**Issue**: No CSP headers configured, increasing XSS attack surface.

**Fix**: Create `src/hooks.server.ts`:
```typescript
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);
    response.headers.set('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' ws: wss:; " +
        "img-src 'self' data: https://www.home-assistant.io;"
    );
    return response;
};
```

---

### 6. [ ] No Token Revocation on Disconnect

**File**: `src/lib/stores/ha.svelte.ts` (lines 81-89)

**Issue**: Tokens remain valid on HA server after local logout.

**Fix**: Call Home Assistant token revocation endpoint on disconnect.

---

### 7. [x] Debug Console Logging ✅ FIXED

**File**: `src/lib/components/cards/ButtonCard.svelte` (line 138)

**Issue**: `console.log` exposes config data in browser console.

**Fix**: Remove or disable in production builds.

---

### 8. [x] Missing Rate Limiting on Service Calls ✅ FIXED

**File**: `src/lib/components/cards/ButtonCard.svelte`

**Issue**: Direct service calls (toggle) have no rate limiting.

**Fix**: Add debouncing/throttling to all service call handlers.

---

### 9. [ ] No CSRF Protection (Informational)

**Issue**: No CSRF protection. Currently not exploitable (no server-side state-changing routes).

**Fix**: Implement if API routes are added in the future.

---

## ✅ Good Practices (No Action Needed)

- [x] No XSS-prone patterns (`innerHTML`, `@html`, `eval`)
- [x] Proper `.gitignore` for `.env` files
- [x] No hardcoded secrets in source code
- [x] TypeScript used throughout
- [x] External resources loaded with `crossorigin`

---

## Priority Order

1. ~~⚡ Switch to HTTPS default~~ ✅ Done
2. ~~⚡ Add input validation~~ ✅ Done
3. ~~⚡ Implement CSP~~ ✅ Done
4. ⚡ Run `npm audit fix`
5. ~~🔧 Add rate limiting~~ ✅ Done
6. ~~🔧 Remove console.log statements~~ ✅ Done
7. 🔧 Implement token revocation
