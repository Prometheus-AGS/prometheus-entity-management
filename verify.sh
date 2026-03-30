#!/usr/bin/env bash
# verify.sh — print the full project tree
find /Users/gqadonis/Projects/prometheus/prometheus-entity-management \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/.git/*" \
  | sort
