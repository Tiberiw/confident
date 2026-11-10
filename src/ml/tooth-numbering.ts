import { UNNUMBERED_TOOTH } from "@/lib/teeth-mapping";

/** One tooth box found by the segmentation model. */
export interface DetectedTooth {
  /** Horizontal centre of the box, in image pixels. */
  xCenter: number;
  /** The model's own tooth class (index into TOOTH_LABELS). */
  modelClass: number;
  score: number;
}

/*
 * Tooth class indexes follow TOOTH_LABELS:
 *   0–7   = 1.8 … 1.1   (upper jaw, image left)
 *   8–15  = 2.1 … 2.8   (upper jaw, image right)
 *   16–23 = 3.8 … 3.1   (lower jaw, image right)
 *   24–31 = 4.1 … 4.8   (lower jaw, image left)
 * "Number" below is the second FDI digit: 1 = central incisor … 8 = third molar.
 */
const isUpper = (cls: number) => cls <= 15;
const isImageLeft = (cls: number) => cls <= 7 || cls >= 24;

function toothNumber(cls: number): number {
  if (cls <= 7) return 8 - cls;
  if (cls <= 15) return cls - 7;
  if (cls <= 23) return 24 - cls;
  return cls - 23;
}

function toothClass(upper: boolean, imageLeft: boolean, number: number): number {
  if (upper) return imageLeft ? 8 - number : 7 + number;
  return imageLeft ? 23 + number : 24 - number;
}

/**
 * Where the patient's midline is, in image pixels: the gap between two neighbouring teeth that
 * best separates the teeth the model put on the image-left side from those it put on the right.
 * Ties go to the gap nearest the image centre. Only the middle half of the image is considered.
 */
function findMidline(sorted: DetectedTooth[], imageWidth: number): number {
  let best = imageWidth / 2;
  let bestCost = Infinity;
  let bestDistance = Infinity;
  for (let k = 1; k < sorted.length; k++) {
    const x = (sorted[k - 1].xCenter + sorted[k].xCenter) / 2;
    if (x < imageWidth * 0.25 || x > imageWidth * 0.75) continue;
    let cost = 0;
    sorted.forEach((t, i) => {
      if ((i < k) !== isImageLeft(t.modelClass)) cost++;
    });
    const distance = Math.abs(x - imageWidth / 2);
    if (cost < bestCost || (cost === bestCost && distance < bestDistance)) {
      best = x;
      bestCost = cost;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Gives teeth ordered from the midline outwards strictly increasing numbers 1–8, as close as
 * possible to the model's guesses. Gaps are allowed, so a missing tooth doesn't shift the rest.
 * Expects at most 8 teeth.
 */
function numberFromMidline(guesses: number[]): number[] {
  const n = guesses.length;
  if (n === 0) return [];
  // Main cost: distance from the model's guess. Tie-break: prefer lower numbers (no needless gaps).
  const cost = (i: number, num: number) => 100 * Math.abs(num - guesses[i]) + num;
  // dp[i][num]: lowest cost for teeth 0..i when tooth i gets `num`.
  const dp = Array.from({ length: n }, () => new Array<number>(9).fill(Infinity));
  const from = Array.from({ length: n }, () => new Array<number>(9).fill(0));
  for (let num = 1; num <= 8 - (n - 1); num++) dp[0][num] = cost(0, num);
  for (let i = 1; i < n; i++) {
    for (let num = i + 1; num <= 8 - (n - 1 - i); num++) {
      for (let prev = i; prev < num; prev++) {
        const total = dp[i - 1][prev] + cost(i, num);
        if (total < dp[i][num]) {
          dp[i][num] = total;
          from[i][num] = prev;
        }
      }
    }
  }
  const result = new Array<number>(n);
  let num = 1;
  for (let k = 2; k <= 8; k++) if (dp[n - 1][k] < dp[n - 1][num]) num = k;
  for (let i = n - 1; i >= 0; i--) {
    result[i] = num;
    num = from[i][num];
  }
  return result;
}

/**
 * Numbers the teeth the model found. The model finds teeth well but often confuses neighbours,
 * so its numbers are only a hint: each jaw is split at the patient's midline and each side is
 * numbered from the midline outwards. A side never gets more than 8 numbers; the weakest extra
 * boxes get UNNUMBERED_TOOTH so the clinician can relabel or delete them.
 *
 * Returns one tooth class per input tooth, in the same order.
 */
export function numberTeeth(teeth: DetectedTooth[], imageWidth: number): number[] {
  const result = new Array<number>(teeth.length).fill(UNNUMBERED_TOOTH);
  const indexed = teeth.map((t, i) => ({ ...t, i }));

  for (const upper of [true, false]) {
    const jaw = indexed.filter((t) => isUpper(t.modelClass) === upper).sort((a, b) => a.xCenter - b.xCenter);
    const midline = findMidline(jaw, imageWidth);

    for (const imageLeft of [true, false]) {
      const side = jaw
        .filter((t) => (t.xCenter < midline) === imageLeft)
        .sort((a, b) => Math.abs(a.xCenter - midline) - Math.abs(b.xCenter - midline));
      const kept = side.length <= 8 ? side : [...side].sort((a, b) => b.score - a.score).slice(0, 8);
      const ordered = side.filter((t) => kept.includes(t));
      const numbers = numberFromMidline(ordered.map((t) => toothNumber(t.modelClass)));
      ordered.forEach((t, k) => (result[t.i] = toothClass(upper, imageLeft, numbers[k])));
    }
  }
  return result;
}
