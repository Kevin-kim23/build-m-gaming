// Editions keep replacement music separate from previous licensed originals.
export function sourceCandidates(item, records) {
  const base = item.sourceId ?? item.id;
  const ids = new Set([base, ...Array.from({length: 4}, (_, i) => `${base}-v${i + 1}`)]);
  return records.filter(record => ids.has(record.id));
}

export function matchesProcessedSource(item, existing, processingVersion, candidates) {
  return existing?.processingVersion === processingVersion &&
    (existing.edition ?? null) === (item.edition ?? null) &&
    candidates.some(record => record.sha256 === existing.sourceHash && record.generationId === existing.generationId);
}
