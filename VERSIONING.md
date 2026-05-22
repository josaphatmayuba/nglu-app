# Versioning Policy

This repository uses one application version for the full NGLU app.

## Chosen Strategy

Use a stable Semantic Version base plus Git commit build metadata:

```text
<major>.<minor>.<patch>+<short_commit>
```

Example:

```text
3.0.0+a422077
```

This is the best fit for this project because:

- every commit is uniquely identifiable by the Git SHA;
- the user can still understand release impact through SemVer;
- AWS dev/prod deployments can be tied to the exact commit;
- agents do not need to bump a fake version for every small commit;
- Jira comments can reference one clear app version and commit.

## Files

- `VERSION`: current base Semantic Version.
- `CHANGELOG.md`: human-readable changes, grouped under `[Unreleased]` until release.
- `scripts/version-info.mjs`: prints the current base version, commit, and full build version.

## Required For Every Future Change

Starting with the next code or configuration modification:

1. Update `CHANGELOG.md` under `[Unreleased]`.
2. Include the Jira key when one exists.
3. Mention the validation performed.
4. Keep the base version in `VERSION` unchanged unless the change is a release bump.
5. In Jira comments, include the commit hash and full build version from:

```bash
node scripts/version-info.mjs
```

## When To Bump `VERSION`

Use Semantic Versioning:

- `PATCH`: bug fix, security hardening, small UI correction, internal maintenance.
- `MINOR`: new feature, new workflow, backward-compatible API addition.
- `MAJOR`: breaking API change, migration that requires coordinated release, incompatible UX/data behavior.

After bumping `VERSION`:

1. Move `[Unreleased]` entries into a dated version section.
2. Create a fresh empty `[Unreleased]` section.
3. Commit `VERSION` and `CHANGELOG.md` with the release commit.
4. Tag the release when a production release is approved:

```bash
git tag v$(cat VERSION)
git push origin v$(cat VERSION)
```

## Jira Handoff Format

Use this in Jira comments after validation:

```text
Version:
- Base: <VERSION>
- Build: <VERSION>+<short_commit>
- Commit: <short_commit> <message>

Changelog:
- CHANGELOG.md updated under [Unreleased]

Validation:
- <commands or browser/API checks>
```

## Important

Do not use package-specific versions (`frontend/package.json`, `backend2/package.json`) as the project release version. They can remain package metadata. The app release version is the root `VERSION` plus Git commit metadata.
