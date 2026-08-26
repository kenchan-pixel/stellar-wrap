# Security policy

## Current security model

Stellar Warp Explorer is a client-only static application:

- no backend or database
- no user account
- no payment
- no analytics or tracking
- no API keys or repository secrets
- no upload of travel, device or location data
- limited local storage for user preferences

## Dependency

The stable version loads Three.js `0.185.1` from a version-pinned jsDelivr URL. Dependency changes require review of release notes, licence, integrity／supply-chain implications and mobile behaviour before approval.

## Reporting a vulnerability

Do not publish sensitive vulnerability details in a public issue. Contact the repository owner privately with:

- affected version and file
- reproduction steps
- realistic impact
- proof of concept where safe
- suggested remediation, if known

## Prohibited content

Never commit:

- personal access tokens
- API keys
- private keys
- `.env` files containing secrets
- browser session data
- private user information
- unlicensed textures, audio or models

`npm run check` scans for several common token and private-key formats, but this is only a guardrail and not a complete secret scanner.

## Supported version

Until a later release is approved, only V4.0 Stable is considered the supported baseline. Archived versions are retained for history and are not maintained.
