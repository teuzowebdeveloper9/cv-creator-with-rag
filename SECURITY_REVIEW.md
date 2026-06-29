# Security Review Report — RAG CV Creator

**Reviewer**: MiMoCode
**Date**: 2026-06-29
**Branch**: `security/hardening-improvements`

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 4 |
| Medium   | 5 |
| Low      | 3 |

---

## Findings

### [CRITICAL] Hardcoded Insecure Django Secret Key

**File**: `backend/config/settings.py:9`
**Evidence**: `SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-key')`
**Risk**: If `SECRET_KEY` env var is not set, Django runs with a known default key. Session tokens, CSRF tokens, and cryptographic signatures become forgeable.
**Impact**: Full session hijacking, CSRF bypass, data tampering.
**Fix**: Crash on startup if `SECRET_KEY` is not set or equals the insecure default.
**Suggested patch**:
```python
_secret_key = os.getenv('SECRET_KEY')
if not _secret_key or _secret_key == 'django-insecure-default-key':
    raise ImproperlyConfigured("SECRET_KEY must be set to a unique, random value.")
SECRET_KEY = _secret_key
```

---

### [HIGH] No Rate Limiting on Auth Endpoints

**File**: `backend/api/views.py` — `LoginView`, `RegisterView`
**Evidence**: No rate-limit middleware or decorator on login/register.
**Risk**: Brute-force password attacks, credential stuffing, account enumeration.
**Impact**: Account compromise, server resource exhaustion.
**Fix**: Add `django-ratelimit` or custom throttling per IP on auth endpoints.
**Suggested patch**: Add `@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'))` on LoginView and RegisterView.

---

### [HIGH] No Rate Limiting on LLM-Expensive Endpoints

**File**: `backend/api/views.py` — `GenerateView`, `UpdateCVView`, `DebateView`, `StartInterviewView`
**Evidence**: No throttling. Each request invokes LLM APIs costing real money.
**Impact**: Financial abuse — attacker can drain API credits.
**Fix**: Add per-user throttling: `Throttle_classes = [UserRateThrottle]` with limits like `generate/hour=10`.
**Suggested patch**: Add throttling classes to expensive views.

---

### [HIGH] Admin Endpoint Exposed Without Restriction

**File**: `backend/config/urls.py:6`
**Evidence**: `path('admin/', admin.site.urls)` — no additional protection beyond Django admin login.
**Impact**: If admin credentials are weak or leaked, full database access.
**Fix**: Restrict admin to specific IPs or disable in production, or add `@staff_member_required`.
**Suggested patch**: Add IP whitelist via middleware or settings `ALLOWED_ADMIN_IPS`.

---

### [HIGH] CORS Allows All Origins in Debug Mode

**File**: `backend/config/settings.py:92`
**Evidence**: `CORS_ALLOW_ALL_ORIGINS = True` when `DEBUG=True`.
**Impact**: Any website can make authenticated requests to the API when debug is on.
**Fix**: Never allow all origins. Use explicit whitelist only.
**Suggested patch**: Remove `CORS_ALLOW_ALL_ORIGINS` entirely; rely on `CORS_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGIN_REGEXES`.

---

### [MEDIUM] No Input Length Validation on LLM Prompts

**File**: `backend/api/views.py` — `GenerateView.post`, `UpdateCVView.post`
**Evidence**: `_sanitize_input` truncates to 10000 chars, but no validation in serializer.
**Risk**: Extremely long inputs waste LLM tokens and slow responses.
**Fix**: Add `max_length` to serializer fields and validate before LLM call.
**Suggested patch**: Add `max_length=5000` to `job_description` and `edit_instruction` serializers.

---

### [MEDIUM] No Ownership Check on Document List Query

**File**: `backend/api/views.py:456`
**Evidence**: `Document.objects.filter(owner=self.request.user)` — this is correct for listing, but `DocumentSerializer` exposes `owner` field as writable.
**Risk**: If a PUT/PATCH endpoint is added, attacker could reassign document ownership.
**Fix**: Make `owner` read-only in serializer.
**Suggested patch**: Add `'owner'` to `read_only_fields` in `DocumentSerializer`.

---

### [MEDIUM] Weak Prompt Injection Patterns

**File**: `backend/api/views.py:50-59`
**Evidence**: Only 8 regex patterns for prompt injection detection.
**Risk**: Sophisticated attacks bypass patterns (e.g., Unicode homoglyphs, encoded text).
**Fix**: Add more patterns, normalize Unicode before checking, and consider LLM-based classifier for critical paths.
**Suggested patch**: Add patterns for `new instructions`, `system message`, `override`, etc.

---

### [MEDIUM] Missing Security Headers

**File**: `backend/config/settings.py`
**Evidence**: No `SECURE_CONTENT_TYPE_NOSNIFF`, `SECURE_BROWSER_XSS_FILTER`, `X_CONTENT_TYPE_OPTIONS`, or Content-Security-Policy.
**Impact**: Clickjacking, MIME sniffing attacks, XSS.
**Fix**: Add Django security settings.
**Suggested patch**:
```python
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_CONTENT_TYPE_OPTIONS = 'nosniff'
```

---

### [MEDIUM] No CSRF Protection on SSE Endpoints

**File**: `backend/api/views.py` — `GenerateView`, `DebateView`
**Evidence**: Both use `StreamingHttpResponse` but rely on DRF's session auth + CSRF. SSE GET-style POST via fetch with `credentials: 'include'` is correct, but if CSRF cookie is missing, POST silently succeeds.
**Risk**: Cross-site request forgery on CV generation.
**Fix**: Explicitly check CSRF on streaming views or add manual validation.

---

### [LOW] Verbose Error Messages in Production

**File**: `backend/api/views.py:74-79`
**Evidence**: `_safe_error_response` returns generic message, but `logger.error` includes full traceback.
**Impact**: Log poisoning, information leakage in logs.
**Fix**: Use structured logging with request ID, avoid logging user-controlled input directly.
**Suggested patch**: Sanitize exception messages before logging.

---

### [LOW] Session Cookie Age Too Short for Production

**File**: `backend/config/settings.py:118`
**Evidence**: `SESSION_COOKIE_AGE = 8 hours` (28800 seconds).
**Impact**: Users get logged out frequently, encouraging weak password habits.
**Fix**: Make configurable via env var (already is), document recommended value.

---

### [LOW] No Content-Security-Policy on Frontend

**File**: `frontend/` — no CSP headers configured.
**Impact**: XSS attacks can load external scripts.
**Fix**: Add CSP meta tag or configure via nginx/proxy.

---

## Priority Order for Fixes

1. **SECRET_KEY hardcoded default** (Critical) — immediate fix
2. **Rate limiting on auth + LLM endpoints** (High) — financial and security risk
3. **Admin endpoint hardening** (High) — attack surface reduction
4. **CORS strictness** (High) — cross-origin abuse prevention
5. **Input validation + security headers** (Medium) — defense in depth
6. **Logging and CSP** (Low) — hardening

---

*This report covers findings from manual code review. No automated SAST/DAST was run.*
