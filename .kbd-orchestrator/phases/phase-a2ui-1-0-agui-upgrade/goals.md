# Goals

- Upgrade @a2ui/react and @a2ui/web_core from 0.12.0 to the A2UI 1.0 release across packages/a2ui-react and every example that uses it, adopting the 1.0 protocol and schema changes
- Bring AG-UI dependencies (@ag-ui/core and related packages) to their current releases and replace the legacy pre-1.0 peer ranges (>=0.0.30, >=0.0.59 <0.1.0 || ^1.0.0)
- Include the other related protocol updates (AG-UI events, A2A and similar) identified during assessment
- Confirm exact target versions and breaking changes against official release notes during /kbd-assess, before planning
- Verify through the full local integration path, and sync changesets, docs and the skills export manifest (pnpm run refresh:exports / verify:skills)
