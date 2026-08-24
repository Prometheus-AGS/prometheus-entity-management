# Visual evidence certification — Flutter source lineage

Date: 2026-08-02  
Scope: deterministic headless lineage diagram

## Result

**PASS for provenance visualization; NOT APPLICABLE for Flutter UI or accessibility certification.**

The source SVG at `release/evidence/flutter-source-provenance-lineage.svg` has SHA-256 `af434e9163f49dea8afa219dd685c5d859b43ca05c1a38f7b75a72692880d03a`. Its reviewed 1200×680 PNG raster has SHA-256 `d70e598046617f70aa3556b37bf83f916c40cc33804e3c53cb64aa7f9d031e06`.

Original-resolution inspection confirms:

- no clipped title, subtitle, card, connector, annotation, or footer text;
- no overlapping cards or ambiguous arrow destinations;
- clear distinction between committed source, disposable allowlist filtering, provenance-only import, canonical Dart owner, and reference-only architecture material;
- explicit visual labels that the provenance import is non-buildable/non-publishable and the canonical package remains future adaptation work; and
- an explicit footer refusing Flutter rendering or accessibility claims.

The verifier binds the SVG hash, and BDD proves that visual substitution fails closed. The PNG is a human-review raster, not the canonical artifact.

This evidence does not render a Flutter widget, exercise keyboard/focus semantics, measure contrast or target size, run an accessibility tree, or prove Android/iOS behavior. Those mandatory visual and accessibility gates remain with `v3-flutter-riverpod-a2ui-example`.
