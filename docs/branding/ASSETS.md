# Brand assets — provenance and accessible alternatives

Scope: visual identity assets used by the documentation site (`site/`) for the
3.0 release, created under change `v3-docs-foundation-brand` (2026-08-22).

## Asset inventory

| Asset | Location | Provenance | Accessible alternative |
| ----- | -------- | ---------- | ---------------------- |
| Prometheus ember mark (light theme) | `site/static/img/prometheus-mark.svg` | Created in-repo for this change; original artwork using the org brand tokens below. NOT derived from the KnowMe mark used by the sibling skill-pack site (product-specific, not reused). | Navbar logo carries `alt: "Prometheus Entity Management home"`; the SVG embeds `role="img"` + `aria-label`; navbar title text always renders alongside. |
| Prometheus ember mark (dark theme) | `site/static/img/prometheus-mark-dark.svg` | Same artwork, dark-theme palette variant (brighter ember `#FF6A3D`, light core `#F7F7F8`). | Same as above; selected automatically via `srcDark`. |
| Favicon | `site/static/img/favicon.ico` | Rasterized from the same ember mark (16/32/48 px) via the managed Python Pillow runtime. | Browser tab context; page `<title>` always present. |
| Social card | `site/static/img/social-card.png` | Rendered in-repo (1200×630, Pillow) with the ember mark, product wordmark, and release tagline on brand ink. | `og:description` / `twitter:card` metadata carry the same text for non-visual consumers. |

## Brand tokens

Token values are inherited from the Prometheus organization brand as deployed
on the sibling skill-pack site (`prometheus-skill-pack/site/src/css/custom.css`)
and renamed to the `--prometheus-*` namespace in `site/src/css/custom.css`:

| Token | Light | Dark | Use |
| ----- | ----- | ---- | --- |
| Ember (primary) | `#E04E28` | `#FF6A3D` | Primary actions, links, accents |
| Ink | `#0B0F14` | `#0B0F14` | Dark surfaces, footer, dark background |
| Surface | `#F7F7F8` | `#121820` | Page background / panel |
| Text muted | `#4A5060` | `#AEB4C0` | Secondary text (contrast-checked pairs) |
| Border | `#D8DAE0` | `#2B3542` | Card and section borders |

Typography: Space Grotesk / Inter (headings + body), JetBrains Mono (code),
with system-font fallbacks — no webfont download required.

## Accessibility commitments

- Light and dark themes both ship; `respectPrefersColorScheme` is enabled.
- Primary/muted color pairs meet WCAG AA contrast on their paired surfaces
  (`#95321A` darkest-ember on `#F7F7F8` for light-theme eyebrow text;
  `#FF6A3D` on `#0B0F14` for dark-theme accents).
- `:focus-visible` renders a 3px primary outline with 3px offset.
- Landing page sections carry `aria-labelledby`; decorative arrows are
  `aria-hidden`; the metrics card uses a real `<dl>`.

## Rules for future assets

1. Record every new asset in this table with its provenance before committing.
2. Never copy product-specific marks from sibling sites without documenting
   the derivation here.
3. Every image referenced by the site config must have a text alternative
   named in this file.
