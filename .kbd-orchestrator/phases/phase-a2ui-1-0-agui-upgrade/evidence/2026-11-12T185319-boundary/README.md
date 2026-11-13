# Boundary run 3 (repair attempt 2) — stopped at step 7 (FAIL)

Steps 1–6 exited 0, including `verify:a2ui-bridge` with the visual gate (caption contrast fixed; the recorded
`aria-prohibited-attr` exception on official `a2ui-basic-*` hosts applied).
Step 7 `verify:package-contracts`: the ESM, CommonJS, NodeNext and Node16 consumers and the zod 4.6.7 assertion
passed; the UPG-15 control consumer (`upstream-web-core-control-consumer`) then failed at `pnpm install` with the
same corepack fallback as run 1 (pnpm 12.16.1, missing bin/pnpm.cjs): that consumer was not pinned by repair 1.

Repair (attempt 3): the control consumer pins the repository's packageManager; the skills scratch control, which
runs pnpm in a temp copy of packages/a2ui-react, gets a pinned package.json at its scratch root (corepack walks up
past a manifest without packageManager). Steps 8–14 of this folder: NOT_EXERCISED.
