# Intentionally Vulnerable Security Lab

> **DANGER:** This repository is deliberately insecure. It is a scanner fixture,
> not an example application. Never deploy it publicly or use real credentials/data.

An Express + SQLite application containing known-positive findings for authorized
SAST, DAST, secret-scanning, dependency-scanning, and code-review experiments.

## Expected findings

| # | Vulnerability | CWE | Main endpoint/pattern |
|---|---|---|---|
| 1 | SQL injection | CWE-89 | `GET /api/sqli` |
| 2 | Authentication bypass | CWE-287 | `POST /api/login` |
| 3 | Reflected/stored XSS | CWE-79 | `/api/xss/*` |
| 4 | IDOR / BOLA | CWE-639 | `GET /api/users/:id` |
| 5 | Mass assignment / privilege escalation | CWE-915 | `POST /api/users/:id` |
| 6 | Path traversal / arbitrary file read | CWE-22 | `GET /api/file` |
| 7 | OS command injection | CWE-78 | `GET /api/command` |
| 8 | SSRF | CWE-918 | `GET /api/fetch` |
| 9 | Open redirect | CWE-601 | `GET /redirect` |
| 10 | Code injection (`eval`) | CWE-95 | `POST /api/calculate` |
| 11 | Prototype pollution | CWE-1321 | `POST /api/settings` |
| 12 | Weak password hashing (MD5) | CWE-328 | `GET /api/weak-hash` |
| 13 | Predictable security token | CWE-330 | `GET /api/reset-token` |
| 14 | Regular-expression DoS | CWE-1333 | `GET /api/search` |
| 15 | CSRF / state change over GET | CWE-352 | `GET /api/transfer` |
| 16 | Unrestricted file upload/write | CWE-434 | `POST /api/upload` |
| 17 | Log injection | CWE-117 | `GET /api/log` |
| 18 | Sensitive environment exposure | CWE-200 | `GET /api/debug/config` |
| 19 | Stack-trace disclosure | CWE-209 | `GET /api/error` |
| 20 | Plaintext/hard-coded passwords | CWE-256 / CWE-798 | initialization/constants |
| 21 | Weak session and cookie settings | CWE-345 / CWE-614 | `POST /api/login` |
| 22 | Permissive CORS / missing headers | CWE-942 | global middleware |

## Run locally

Use a disposable VM or container when exercising the dangerous endpoints. The
server binds to loopback (`127.0.0.1`) by default.

```bash
npm install
npm start
```

Open `http://127.0.0.1:3000`.

Do not set `LAB_HOST=0.0.0.0` unless the surrounding network is isolated. The
command-injection, SSRF, file-read, file-write, and `eval` routes can affect the
machine running the lab. All committed credentials and keys are fake lab values.
