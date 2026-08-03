# Review feedback for iteration 10

Review the packet for real defects. Do not repeat findings contradicted by the
current primary-source platform contract.

## `artifact-metadata: write` is a supported and required permission

The previous judge claimed that `artifact-metadata` was not a valid GitHub
Actions permission. That claim is false under the current GitHub Actions
workflow syntax. GitHub's authoritative workflow syntax lists:

```text
artifact-metadata: read|write|none
```

and explains that `artifact-metadata: write` permits creating artifact storage
records. The official `actions/attest` documentation additionally requires the
following permissions for artifact attestation:

```yaml
permissions:
  id-token: write
  attestations: write
  artifact-metadata: write
```

Primary sources:

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://github.com/actions/attest

The repository's current executable syntax check also passes:

```text
$ pnpm exec actionlint .github/workflows/publish.yml
# exit 0, no findings
```

Removing the permission would weaken the intended attestation workflow. Treat
the prior claim as resolved and inspect the release/recovery implementation for
new evidence-backed defects instead.

## Current deterministic result

- Unit tests: 23/23.
- BDD: 13/13 scenarios, 56/56 steps, 6/6 hooks.
- Packed npm candidate checks: 12/12 packages pass manifest, payload, publint,
  and declaration checks.
- No registry mutation occurred.
