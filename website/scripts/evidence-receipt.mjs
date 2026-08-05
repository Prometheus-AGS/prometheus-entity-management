const receiptFields = new Set(['status', 'result', 'verdict']);
const certifiedOutcomes = new Set([
  'pass',
  'pass-change-certified-archive-ready-publication-blocked',
]);
const requiredVisualReviews = new Set([
  'no-visible-secrets',
  'no-internal-paths',
  'not-blank',
  'not-icon',
]);

export function assertReceiptCertification(assetId, receiptData, assertion) {
  if (!assertion || typeof assertion !== 'object') {
    throw new Error(`${assetId}: receiptAssertion is required`);
  }
  const {field, equals} = assertion;
  if (!receiptFields.has(field)) {
    throw new Error(`${assetId}: unsupported receipt assertion field ${String(field)}`);
  }
  if (!certifiedOutcomes.has(equals)) {
    throw new Error(`${assetId}: unsupported certified receipt outcome ${String(equals)}`);
  }
  const actual = receiptData?.[field];
  if (actual !== equals) {
    throw new Error(`${assetId}: receipt ${field} must equal ${equals}; received ${String(actual)}`);
  }
}

export function assertEvidenceBinding(asset, sourceSha256, receiptSha256) {
  for (const [label, actual] of [['source', sourceSha256], ['receipt', receiptSha256]]) {
    const expected = asset[`${label}Sha256`];
    if (!/^[0-9a-f]{64}$/.test(expected ?? '')) {
      throw new Error(`${asset.assetId}: pinned ${label}Sha256 is required`);
    }
    if (actual !== expected) {
      throw new Error(`${asset.assetId}: ${label}Sha256 does not match the reviewed allowlist`);
    }
  }
  const reviews = new Set(Array.isArray(asset.visualReview) ? asset.visualReview : []);
  if (reviews.size !== requiredVisualReviews.size ||
      [...requiredVisualReviews].some((review) => !reviews.has(review))) {
    throw new Error(`${asset.assetId}: complete hash-bound visualReview is required`);
  }
}

export function assertEvidenceImage(assetId, metadata, statistics) {
  if (!metadata.width || !metadata.height) throw new Error(`${assetId}: dimensions unavailable`);
  if (metadata.width < 320 || metadata.height < 200) throw new Error(`${assetId}: image is too small for evidence`);
  if (!Number.isFinite(statistics.entropy) || statistics.entropy < 0.5) {
    throw new Error(`${assetId}: image appears blank or icon-like`);
  }
}
