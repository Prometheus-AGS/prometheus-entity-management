---
title: SDL and code generation
sidebar_position: 5
---

# Version the entity contract

The SDL describes entity identity, fields, relationships, validation metadata,
and generated binding surfaces. Code generation turns that versioned schema
into strongly typed models, provider families, transport seams, and relation
metadata. Generated files are inspectable artifacts and drift checks fail when
the source schema and public declarations disagree.

Schema generation does not own runtime data. It defines the contract consumed
by stores and adapters; the normalized graph remains the application state
authority.
