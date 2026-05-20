# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Investor-grade documentation suite: `ARCHITECTURE.md`, `SYSTEM_DESIGN.md`,
  `API_REFERENCE.md`, `PERFORMANCE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`.
- Mermaid diagrams for system topology, auth flow, image-pipeline state machine,
  ERD, and deployment.
- SVG repository banner (`docs/assets/banner.svg`) + README hero.
- `.github/` suite: issue templates, PR template, CI workflow.
- `docs/screenshots/` capture guide with README image slots.

### Notes
- No functional/business-logic changes in this release — presentation, docs, and
  developer-experience only.

---

## [0.3.0] — Medicine image system

### Added
- Original image pipeline: `sharp` optimization → WebP, 64-bit perceptual hash,
  magic-byte validation, content-addressed storage, SVG-XSS hardening.
- Deterministic SVG placeholder generator (brand, generic, strength, dosage-form
  silhouette, Rx badge, CC0 PubChem molecule watermark).
- Admin medicine-image studio: upload, approve/reject, confidence scoring,
  duplicate detection.
- CC-licensed image sourcing from Wikimedia Commons with per-image attribution
  and an `/image-credits` page.
- Approval workflow columns (`approvalStatus`, `copyrightStatus`, OCR fields).

## [0.2.0] — Compliance & content

### Added
- Compliance pages: FAQ, Contact, Return Policy, Privacy Policy (DPDP Act-aware),
  Terms of Service, Image Credits.
- PHI-safe prescription storage in Postgres `BYTEA`.
- Hardened upload validation (accepts `.jpeg`/WebP correctly; trusts magic bytes).

## [0.1.0] — Initial platform

### Added
- Storefront: landing, catalog, search, product detail, cart, checkout, order
  tracking, prescription upload wizard.
- Dispensary CRM: customers, prescriptions, medicine timeline, orders, reminders.
- Defense-in-depth auth: edge middleware + per-route role guards + scope guards.
- Immutable, HIPAA-style audit log.
- 516-SKU catalog, Prisma + PostgreSQL, Vercel + Render deployment.

[Unreleased]: https://github.com/Vitthal38/ambica-medical/commits/main
