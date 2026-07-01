// Single source of plain-language UI copy. The same concept must read identically
// on every tab. The on-site lead is non-technical and not a native English speaker,
// so prefer short, concrete, sheet-language words — never data-model / developer terms
// ("recomputed", "manual %", "mismatch", "loud", "unrecorded", "≠").
//
// COPY / UX ONLY — nothing here changes a calculation or classification.

/** "4 problems" / "1 problem" — a real number with a plain noun (never the letter "n"). */
export function nParts(n: number, noun: string, plural = `${noun}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? noun : plural}`;
}

export const LABELS = {
  // The two progress numbers, led plainly (the internal recomputed-vs-manual split
  // is not surfaced as words).
  pctReceived: "% received",
  pctInstalled: "% installed",

  // Sheet-disagreement note — quiet, plain, shown ONLY on a real difference. No "≠".
  sheetDiffers: (sheetPct: number) => `sheet says ${sheetPct}% — doesn't match`,
  sheetDiffersTitle: "The sheet's own number for this is different",

  // Problem parts (was "loud"): describe the actual items.
  problemsPhrase: "parts missing, not found, or damaged",
  problemsTitle: "Parts missing, not found, or damaged",

  // Blank status — plain replacement for the old "unrecorded gap" wording.
  noStatusShort: "no status",
  noStatusPhrase: "parts with no status entered in the sheet",
  noStatusTitle: "Parts with no status entered in the sheet",

  // Partial arrival — always shown with its plain gloss.
  partialLabel: "Partial — rest in China",
  partialGloss: "some here, rest still in China",
};
