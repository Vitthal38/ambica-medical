<!-- Thanks for contributing! Keep PRs focused — one concern per PR. -->

## Summary

<!-- What does this change and why? Link any related issue (Fixes #123). -->

## Type of change

- [ ] 🐛 Bug fix
- [ ] ✨ Feature
- [ ] ♻️ Refactor (no behaviour change)
- [ ] 📝 Docs
- [ ] 🔐 Security
- [ ] 🚀 Performance

## Checklist

- [ ] `npx tsc --noEmit` is clean
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No secrets / patient data committed; `.env.example` updated if a new var was added
- [ ] Admin handlers re-check `requireRole()` and (where relevant) scope
- [ ] PHI-access paths append to `AuditLog`
- [ ] Docs updated (`API_REFERENCE` / `ARCHITECTURE` / `SECURITY` / README) if behaviour changed
- [ ] `CHANGELOG.md` "Unreleased" updated
- [ ] Screenshot added to `docs/screenshots/` for user-visible changes

## How was this tested?

<!-- Manual steps, screenshots, or automated tests. -->

## Screenshots / recordings

<!-- Before / after for any UI change. -->
