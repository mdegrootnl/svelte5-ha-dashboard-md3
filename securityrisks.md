# Security Risks And Issues

Review date: May 21, 2026

This file tracks known security posture and gaps. It is intentionally conservative: if a claim depends on deployment shape, it should be described as a current tradeoff rather than as finished hardening.

## Summary

| Severity | Count | Status |
| --- | ---: | --- |
| High | 0 | No known high-severity app issues |
| Medium | 3 | 2 mitigated, 1 open |
| Low | 5 | 2 mitigated, 3 open |

## Medium Severity

### 1. Token Storage In Browser Storage

Status: open for standalone OAuth/token mode.

Issue: standalone Home Assistant auth uses browser-accessible storage, which is vulnerable if an XSS issue is introduced.

Current mitigations:

- Add-on mode keeps the Supervisor token server-side.
- API mutations are same-origin guarded.
- Runtime integration secrets are stored under ignored server-side `data/` files.

Possible next steps:

- Investigate HttpOnly cookie/session-backed standalone auth.
- Continue CSP hardening.
- Support explicit token revocation on disconnect where Home Assistant exposes it.

### 2. Home Assistant URL Validation

Status: mitigated.

Issue: user-supplied Home Assistant hosts and ports need validation before use.

Current state: settings and auth helpers validate/sanitize host and port values. Keep this covered when adding new connection paths.

### 3. HTTPS Default

Status: mitigated.

Issue: defaulting to plain HTTP can expose credentials on hostile networks.

Current state: standalone setup defaults to HTTPS unless the user explicitly provides a scheme. Local/home-network HTTP remains possible when chosen by the user.

## Low Severity

### 4. Dependency Vulnerabilities

Status: open.

Issue: transitive dependency advisories can appear over time.

Action:

- Run `npm audit` before releases.
- Avoid breaking dependency upgrades mid-feature unless the advisory warrants it.

### 5. Content Security Policy

Status: present, hardening pending.

Issue: the app has a production CSP, but it is compatibility-oriented rather than strict. It currently allows inline/eval script behavior and broad `http:`/`https:` connect and image sources for SvelteKit, Home Assistant ingress, media/images, weather, uploads, Mealie, AH, and image-provider flows.

Current implementation:

- `hooks.server.ts` sets production security headers.
- Cross-origin API mutations are blocked.
- Standalone framing is denied.
- Home Assistant add-on framing is limited to same-origin ingress.

Next step: map required sources per deployment mode and replace broad allowances with explicit directives where possible.

### 6. Token Revocation On Disconnect

Status: open.

Issue: local logout clears local state, but may not revoke Home Assistant tokens server-side.

Action: add token revocation where supported by the active Home Assistant auth mode.

### 7. Debug Logging

Status: mitigated.

Issue: debug logging can expose runtime config or entity details in production.

Action: keep production logging intentional and avoid printing credentials, tokens, or personal data.

### 8. Service Call Rate Limiting

Status: mitigated at common UI layers.

Issue: repeated taps can trigger too many Home Assistant service calls.

Action: keep touch controls debounced/throttled where repeated service calls are possible.

### 9. CSRF Protection

Status: partially mitigated.

Issue: server-side mutation routes exist, so cross-origin writes must stay blocked.

Current mitigation: `hooks.server.ts` rejects cross-origin API mutations using `Origin` and `Sec-Fetch-Site`.

Action: reassess if cookie-backed auth is introduced.

## Good Practices

- No known hardcoded credentials in source.
- Runtime secrets and tokens are ignored under `data/`.
- TypeScript and Zod are used at important boundaries.
- Server-side proxies keep privileged add-on tokens out of the browser.
- Security claims in docs should stay aligned with the actual code.
