import nextConfig from 'eslint-config-next/core-web-vitals';

export default [
  ...nextConfig,
  {
    linterOptions: {
      // Some source files carry eslint-disable comments for rules not active
      // in this config (added before ESLint was wired up). Don't fail on them.
      reportUnusedDisableDirectives: false,
    },
    rules: {
      // ── Pre-existing patterns throughout the codebase ──────────────────────
      // These were never enforced; disabling them here preserves the status quo.
      // Each is tracked as tech-debt to fix in a follow-up.
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react/no-unstable-nested-components': 'off',
      // React Compiler rules — fire on React Hook Form's `watch()` and on
      // Math.random() calls in existing render paths. Not enforced previously.
      'react-hooks/incompatible-library': 'off',
      'react-hooks/purity': 'off',
      // The codebase uses explicit `any` in several intentional places
      // (Prisma where-clause builder, JSON parsing).
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
