# Isolated adversarial review — phase-a2ui-1-0-agui-upgrade (11.5)

- Judge: gpt-6.1-sol through the liter-llm gateway (:4000), fresh context per round, packets only. Producer:
  claude-opus-5-5 (different vendor). The configured judge k3.1-pro timed out (HTTP 500 / upstream 524) on all
  four packets, so the judge was overridden with PROMETHEUS_KBD_JUDGE_MODEL. `cross_model_check` reads
  `unverified-producer-unknown` because the dispatcher has no canonical identity tuple for the producer; the
  judge and producer are nonetheless different vendors.
- Packets: four areas (a2ui-react library; a2a/core/react + changeset; examples incl. Flutter; acceptance scripts).
  Excluded and recorded in each packet: CHANGELOGs, the digest-pinned upstream conformance suite, the
  @a2ui/web_core vendor patch files, dist output, regenerated website API/search artifacts.
- Final verdicts: library PASS (round 14), a2a PASS (round 4), examples PASS (round 5), acceptance: remaining
  critical and warning rejected with evidence (Vite 8.2 PreviewServer.close; Playwright 1.62 fill on range).
- Anti-theater screen (check-findings-sycophancy, strict): PASS, score 0.0, on all three final PASS reports.
- Triage, round by round, with every accepted fix and every rejection's evidence: resolution-round-1.md …
  resolution-round-13.md. Accepted and fixed: 50 findings (criticals and warnings). Rejected: 3 criticals (A2A
  extension activation, headless Lit import, Vite PreviewServer.close) and 1 warning (Playwright range fill),
  each with source evidence.
