---
"@prometheus-ags/a2ui-react": patch
---

Preserve caller ownership of official A2UI message inputs by cloning parsed
messages separately for validation and processor commit, preventing later data
model updates from mutating reusable fixtures or application-owned payloads.
