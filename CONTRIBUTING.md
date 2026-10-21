# Contributing

Thanks for taking a look. veiled.js is still small, so keeping changes focused makes review a lot easier.

## Setup

You need Bun 1.3.14 or newer.

```bash
bun install
```

## Checks

Before opening a PR:

```bash
bun run test
bun run typecheck
```

Unit tests don't touch the network. If you need to test a real send:

```bash
WEBHOOK_URL="https://..." bun run test:integration
```

Use a throwaway webhook and don't commit the URL. `.env` is already ignored by git.

## Adding an API object

The code is split on purpose:

- Outgoing payloads go in `src/types/payload/` and get a builder in `src/builders/`.
- Incoming responses go in `src/types/response/` and get a class in `src/structures/`.
- The class should expose a `static from(raw)` method and keep the original payload in `.raw`.
- Keep response DTO field names exactly as the API returns them, including odd casing. Normalize inside the structure.
- Don't import builders into structures or structures into builders.

If the API sends a field you haven't modeled yet, add it to the DTO and expose it from the structure. Don't make up fields for empty arrays you haven't seen a sample of.

## Validation

Validation lives in `src/util/validate.ts` and runs from the builders' `toJSON()`.

- Use `RangeError` for length/count limits.
- Use `TypeError` for invalid values like URLs, colors, or missing required fields.
- Add tests for the boundary: the maximum value should pass, and maximum + 1 should fail.

## Tests

Add a test with every behavior change. If you add a builder method, cover the output payload. If you add a response field, add it to a fixture and assert the parsed value.

Keep network calls out of `test/test.ts`. The integration test is for real sends only.

## Style

Match the existing code. Four spaces, double quotes, semicolons, and explicit return types on public methods. Type-only imports need `import type` because of `verbatimModuleSyntax`.

Please don't bump the package version in a PR. Releases are handled separately.
