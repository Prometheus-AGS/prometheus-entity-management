# SQLx MySQL 0.8.6 RSA 0.10 backport

Base source is the published `sqlx-mysql@0.8.6` crate. Its archive SHA-256 is
`aa003f0038df784eb8fecbbac13affe3da23b45194bd57dba231c8f48199c526`.

Select stable RSA 0.10 for
[RUSTSEC-2023-0071](https://rustsec.org/advisories/RUSTSEC-2023-0071.html).
The MySQL public-key authentication fallback keeps PKCS#8 PEM decoding,
OAEP with SHA-1 for both digests, an empty label, and cryptographic random
padding. The [stable RSA 0.10 API](https://docs.rs/rsa/0.10.0/rsa/struct.PublicKey.html#method.oaep_encrypt)
takes its randomness from the OS. Its digest API uses SHA-1 0.11. The
existing password-scramble functions keep their SHA-1 0.10 and SHA-256
implementations and signatures.

The two Tauri examples select SQLite. Cargo still records the optional
SQLx MySQL package in their lockfiles, so the package source also needs a
compatible RSA selection for recursive source scanning.
