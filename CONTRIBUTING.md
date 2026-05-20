# Contributing to Ambica Medical

Thanks for your interest. This is a healthcare-operations platform, so the bar
for correctness and security is high — but the on-ramp is friendly. This guide
gets you productive fast.

---

## Code of conduct

Be respectful, assume good faith, keep it professional. Patient-data safety and
honest engineering come before speed.

---

## Local setup

```bash
git clone https://github.com/Vitthal38/ambica-medical.git
cd ambica-medical
npm install
cp .env.example .env          # then fill DATABASE_URL + AUTH_SECRET
createdb ambica
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

See the [README](./README.md#-getting-started) for the full walkthrough.

---

## Branching & commits

- Branch off `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`.
- Write **imperative, scoped commit messages** that explain the *why*:

  ```
  fix(prescriptions): store bytes in Postgres, not ephemeral disk

  Vercel's FS is ephemeral; uploads vanished between invocations.
  Bytes now live in Prescription.fileBytes (BYTEA) — works on
  serverless, keeps PHI in our own DB.
  ```

- Keep PRs focused. One concern per PR is easier to review and revert.

---

## Before you open a PR

Run the same checks CI runs:

```bash
npx tsc --noEmit     # type-check (must be clean)
npm run lint         # ESLint (must pass)
npm run build        # production build must succeed
```

Then complete the checklist in the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).

---

## Coding standards

| Area | Rule |
|---|---|
| **Language** | TypeScript, strict. No `any` without a comment justifying it. |
| **Validation** | One Zod schema per shape, shared by the form and the handler. Never trust client input. |
| **Data access** | Go through `src/lib/services/*`. Route handlers don't call Prisma directly. |
| **Transactions** | Multi-row writes use `prisma.$transaction`. No half-saved states. |
| **Auth** | Every admin handler re-checks `requireRole()`. Never rely on the middleware alone. |
| **PHI** | Patient data access must append to `AuditLog`. Never log raw PHI. |
| **Secrets** | Env only. Never commit a real credential. Update `.env.example` (shape only) when adding a var. |
| **Uploads** | Validate by magic bytes, not the browser-declared MIME. |
| **Styling** | Tailwind utilities + the shared primitives. No new CSS-in-JS or component libraries. |
| **Files** | Prefer editing existing modules over adding new ones. No bloat. |

---

## Tests & verification

This project leans on **type safety + a clean production build** as its primary
gate today. If you add logic with branching behaviour (e.g. the confidence
scorer, the file validator), add focused unit tests alongside it. Don't ship
untested security-relevant code paths.

---

## Documentation

If your change affects:

- **an endpoint** → update [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md)
- **the architecture** → update [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **security posture** → update [`SECURITY.md`](./SECURITY.md)
- **a user-visible feature** → update the [README](./README.md) and add a screenshot to [`docs/screenshots/`](./docs/screenshots/)

Add a line to [`CHANGELOG.md`](./CHANGELOG.md) under "Unreleased".

---

## Reporting security issues

**Do not open a public issue for vulnerabilities.** Follow the disclosure process
in [SECURITY.md](./SECURITY.md).

---

## Licensing

By contributing you agree your contributions are licensed under the project's
[MIT License](./LICENSE).
