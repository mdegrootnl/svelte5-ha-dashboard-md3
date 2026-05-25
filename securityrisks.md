# Security Risks And Issues

Review date: May 25, 2026

This file tracks known security posture and gaps. It is intentionally conservative: if a claim depends on deployment shape, it should be described as a current tradeoff rather than as finished hardening.

## Summary

| Severity | Count | Status |
| --- | ---: | --- |
| High | 0 | No known high-severity app issues |
| Medium | 3 | 3 mitigated |
| Low | 8 | 6 mitigated, 2 partially mitigated |

## Medium Severity

### 1. Token Storage In Browser Storage

Status: mitigated for standalone OAuth/token mode.

Issue: standalone Home Assistant auth should avoid durable browser-accessible token storage, because `localStorage` tokens are vulnerable if an XSS issue is introduced.

Current mitigations:

- Add-on mode keeps the Supervisor token server-side.
- Standalone mode now stores durable Home Assistant OAuth tokens in ignored server-side `data/ha-sessions.json` behind an HttpOnly, SameSite=Lax session cookie.
- Legacy `localStorage` key `hass_tokens` is migrated into the server session once and then removed.
- Standalone image/media/history proxy requests can authenticate from the server session, so those browser requests no longer need to include the HA bearer token or configured HA origin header.
- Standalone OAuth login starts through `/api/ha-session/auth/start` and returns through `/api/ha-session/auth/callback`; the callback code is exchanged server-side and the browser receives only the normal app redirect.
- Standalone Home Assistant WebSocket traffic uses `/api/ha-websocket`; the browser sends a harmless local token and the server rewrites only the initial auth frame to the real Home Assistant token from the server session.
- The Node WebSocket proxy refreshes expired Home Assistant OAuth access tokens before opening the upstream connection.
- API mutations are same-origin guarded.
- Runtime integration secrets are stored under ignored server-side `data/` files.

Possible next steps:

- Continue CSP hardening.
- Keep token revocation coverage current if Home Assistant changes the auth API.

### 2. Home Assistant URL And Resource Proxy Validation

Status: mitigated.

Issue: user-supplied Home Assistant hosts, ports, and proxied resource paths need validation before use. Proxy routes must not let a browser-supplied path escape the configured Home Assistant origin while forwarding an authorization header.

Current state:

- Settings and auth helpers validate/sanitize host and port values.
- `/api/ha-proxy` rejects absolute/protocol-relative paths, dot-segment escapes, unsupported Home Assistant resource paths, invalid protocols, and target-origin escapes before forwarding authorization headers.
- `/ha-history` validates and encodes the timestamp path segment, rejects non-HTTP(S) Home Assistant origins, preserves the configured Host header, and keeps production error responses generic.
- Route-level tests cover the proxy and history boundary cases.

Keep this covered when adding new connection paths.

### 3. HTTPS Default

Status: mitigated.

Issue: defaulting to plain HTTP can expose credentials on hostile networks.

Current state: standalone setup defaults to HTTPS unless the user explicitly provides a scheme. Local/home-network HTTP remains possible when chosen by the user.

## Low Severity

### 4. Dependency Vulnerabilities

Status: mitigated in the current lockfile.

Issue: transitive dependency advisories can appear over time.

Current mitigation:

- Release audit surfaced a low-severity transitive `cookie <0.7.0` advisory through SvelteKit.
- `package.json` pins `cookie@0.7.2` through an npm override until SvelteKit raises its declared dependency range.
- `npm install --package-lock-only` now reports zero vulnerabilities.

Action: keep running `npm audit` before releases and remove the override once the upstream SvelteKit dependency range includes a patched cookie release.

### 5. Content Security Policy

Status: mostly mitigated; inline script compatibility remains the main CSP compromise.

Issue: the app has a production CSP, but it still allows inline scripts/styles for SvelteKit/application compatibility. Older standalone deployments may also need an explicit compatibility mode if they depend on direct browser access to broad local HTTP/WS origins.

Current implementation:

- `hooks.server.ts` sets production security headers.
- `src/lib/server/securityHeaders.ts` builds deployment-aware CSP directives.
- Production script policy no longer allows `unsafe-eval`.
- Home Assistant add-on deployments default to hardened same-origin connect rules.
- Standalone production deployments now default to hardened same-origin connect rules because Home Assistant, Mealie, AH, weather, upload, and image-provider flows are routed through app-owned same-origin endpoints.
- Standalone deployments can add explicit origins through `DASHBOARD_CSP_CONNECT_SRC` and `DASHBOARD_CSP_IMG_SRC`, or temporarily opt into broad compatibility with `DASHBOARD_CSP_MODE=compat`.
- Cross-origin API mutations are blocked.
- Standalone framing is denied.
- Home Assistant add-on framing is limited to same-origin ingress.
- Hook-level tests verify production CSP/security headers, report-only hardened standalone env flags, and cross-origin API mutation blocking.

Next step: validate the hardened standalone default with real direct Home Assistant, media, weather, image-provider, Mealie, and AH flows; keep `DASHBOARD_CSP_MODE=compat` as a documented escape hatch for trusted local deployments.

### 6. Token Revocation On Disconnect

Status: mitigated.

Issue: local logout clears local state, but may not revoke Home Assistant tokens server-side.

Current mitigation: standalone disconnect loads the server-side Home Assistant session, posts the refresh token to Home Assistant `/auth/revoke`, and clears the local session even if Home Assistant is unavailable.

Action: keep revocation best-effort and covered by route tests.

### 7. Debug Logging

Status: mitigated.

Issue: debug logging can expose runtime config or entity details in production.

Action: keep production logging intentional and avoid printing credentials, tokens, or personal data.

### 8. Service Call Rate Limiting

Status: mitigated at common UI and server API layers.

Issue: repeated taps, broken clients, or unauthenticated browser loops can trigger too many Home Assistant service calls or expensive integration/proxy requests.

Current mitigation:

- Touch controls are debounced/throttled where repeated service calls are possible.
- `hooks.server.ts` applies in-memory per-client rate limits to auth/session writes, uploads, heavy recipe/image imports, external searches, Home Assistant/Mealie/history proxies, and generic API mutations.
- Rate-limit responses return `429` plus `Retry-After` and `X-RateLimit-*` headers.
- `DASHBOARD_RATE_LIMIT=false` can disable this only for trusted local troubleshooting.

Action: keep endpoint-specific limits updated when adding expensive integrations or mutation-heavy features.

### 9. CSRF Protection

Status: partially mitigated and reassessed for cookie-backed Home Assistant sessions.

Issue: server-side mutation routes exist, so cross-origin writes must stay blocked.

Current mitigation:

- `hooks.server.ts` rejects cross-origin API mutations using `Origin` and `Sec-Fetch-Site`.
- The Home Assistant session cookie is HttpOnly and SameSite=Lax.
- Sensitive mutation routes are also rate-limited.

Action: add a dedicated app CSRF token if the app grows beyond same-origin household use, adds multi-user app accounts, or needs to accept mutation requests from less predictable browser contexts.

### 10. Add-on WebSocket Proxy Boundary

Status: mitigated.

Issue: the add-on WebSocket bridge must not expose `SUPERVISOR_TOKEN` to the browser or forward unauthenticated browser commands upstream.

Current state:

- Browser-side add-on auth still uses the harmless placeholder token.
- The server rewrites only the initial valid browser auth frame to `SUPERVISOR_TOKEN`.
- Invalid first browser frames close the proxy before commands are forwarded upstream.
- Browser WebSocket upgrades are origin-checked against the request/proxy host, with `DASHBOARD_WS_ALLOWED_ORIGINS` available for unusual trusted reverse-proxy setups.
- Tests cover origin rejection, explicit allowed origins, auth rewriting, invalid first-frame closure, and normal post-auth command forwarding.

### 11. External Outbound Requests

Status: mitigated at current known external/browser-import boundaries.

Issue: import/proxy features can become SSRF risks if user-controlled URLs are forwarded to arbitrary internal services.

Current state:

- Browser-assisted recipe import accepts only public `http://` and `https://` recipe URLs, rejects localhost/private/reserved addresses, verifies DNS before navigation, and applies the same policy to every Chromium request, redirect, and recipe-image download.
- Fixed external integrations such as Albert Heijn, Unsplash, Pexels, and Buienradar use fixed upstream origins.
- The Buienradar rain proxy accepts only numeric latitude/longitude values in valid ranges and builds the upstream URL through structured `URLSearchParams`.
- Mealie base URLs allow household-local Docker deployments, but reject malformed URLs, unsupported schemes, and embedded credentials.

Action: keep new import/proxy integrations on either fixed upstream origins or an explicit URL validation policy.

## Good Practices

- No known hardcoded credentials in source.
- Runtime secrets and tokens are ignored under `data/`.
- TypeScript and Zod are used at important boundaries.
- Server-side proxies keep privileged add-on tokens out of the browser.
- Uploads are stored under opaque filenames and served with private cache headers plus `nosniff`.
- Security claims in docs should stay aligned with the actual code.
