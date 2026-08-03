# Flutter source provenance research package

- Query: history-preserving, licensed Flutter consolidation
- Sources: 10 primary/local sources
- Confidence: 0.93
- Contradictions resolved: 4
- Firecrawl-backed worker: cancelled after remaining at stage 0; official-source fallback recorded

## Top findings

1. KnowMe code must be imported from committed Git objects only, never its dirty checkout.
2. The user's requested move must be recorded as an explicit MIT destination authority/attribution decision before copying because KnowMe has no tracked package license.
3. `hybrid-mobile-architecture-src` is MIT reference material, not a runtime library source.
4. The existing `entity_graph_flutter` remains canonical; generic KnowMe concepts are adapted into it.
5. Filtered history rewrites SHAs, so the commit map is mandatory evidence.

Read [report.md](report.md), [citations.json](citations.json), [contradictions.json](contradictions.json), and [graph.json](graph.json).
