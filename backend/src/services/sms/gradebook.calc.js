/**
 * Pure gradebook calculation helpers (no DB).
 * Rounding: half-up to `decimalPlaces`. Missing marks are excluded unless treatMissingAsZero.
 */

function toNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Half-up rounding that avoids floating binary noise for typical percent scales. */
function roundHalfUp(value, decimalPlaces = 2) {
  const places = Math.max(0, Math.min(6, Number(decimalPlaces) || 0));
  const factor = 10 ** places;
  const shifted = Number(`${value}e${places}`);
  const rounded = Math.round(shifted + Number.EPSILON);
  return rounded / factor;
}

/**
 * Resolve letter + remark from ordered boundaries.
 * Matches when minPercent <= percent <= maxPercent (inclusive).
 * Falls back to highest minPercent <= percent when edges leave gaps.
 */
function resolveGradeLetter(percent, boundaries = []) {
  if (percent == null || !Number.isFinite(Number(percent))) {
    return { letter: null, remark: null };
  }
  const p = Number(percent);
  const ordered = [...boundaries].sort((a, b) => Number(b.minPercent) - Number(a.minPercent));

  for (const boundary of ordered) {
    const min = Number(boundary.minPercent);
    const max = Number(boundary.maxPercent);
    if (p >= min && p <= max) {
      return { letter: boundary.letter, remark: boundary.remark ?? null };
    }
  }

  for (const boundary of ordered) {
    if (p >= Number(boundary.minPercent)) {
      return { letter: boundary.letter, remark: boundary.remark ?? null };
    }
  }

  return { letter: null, remark: null };
}

/**
 * Weighted subject total for one student across assessments.
 *
 * @param {Array<{
 *   assessmentId: number,
 *   maxScore: number,
 *   weight: number,
 *   score: number|null|undefined
 * }>} assessments
 * @param {{ treatMissingAsZero?: boolean, decimalPlaces?: number }} [policy]
 */
function computeWeightedTotal(assessments, policy = {}) {
  const treatMissingAsZero = policy.treatMissingAsZero === true;
  const decimalPlaces = policy.decimalPlaces ?? 2;

  let weightedSum = 0;
  let weightTotal = 0;
  let scoredCount = 0;
  let missingCount = 0;

  for (const item of assessments) {
    const maxScore = toNumber(item.maxScore);
    const weight = toNumber(item.weight);
    if (maxScore == null || maxScore <= 0 || weight == null || weight < 0) {
      continue;
    }

    let score = toNumber(item.score);
    if (score == null) {
      missingCount += 1;
      if (!treatMissingAsZero) continue;
      score = 0;
    } else {
      scoredCount += 1;
    }

    const ratio = Math.min(Math.max(score, 0), maxScore) / maxScore;
    weightedSum += ratio * weight;
    weightTotal += weight;
  }

  if (weightTotal <= 0) {
    return {
      percent: null,
      weightedSum: 0,
      weightTotal: 0,
      scoredCount,
      missingCount,
      complete: scoredCount > 0 && missingCount === 0,
    };
  }

  const percent = roundHalfUp((weightedSum / weightTotal) * 100, decimalPlaces);
  return {
    percent,
    weightedSum: roundHalfUp(weightedSum, decimalPlaces + 2),
    weightTotal: roundHalfUp(weightTotal, decimalPlaces + 2),
    scoredCount,
    missingCount,
    complete: missingCount === 0,
  };
}

/**
 * Validate category/assessment weights against grading policy.
 * RELATIVE: all weights must be > 0.
 * PERCENT: weights must sum to 100 (±0.01).
 */
function validateWeights(weights, weightMode = 'RELATIVE') {
  const values = weights.map((w) => toNumber(w)).filter((w) => w != null);
  if (!values.length) {
    return { valid: false, message: 'At least one weight is required', sum: 0 };
  }
  if (values.some((w) => w < 0)) {
    return { valid: false, message: 'Weights cannot be negative', sum: values.reduce((a, b) => a + b, 0) };
  }
  if (values.some((w) => w === 0) && weightMode === 'RELATIVE') {
    return { valid: false, message: 'Relative weights must be greater than zero', sum: values.reduce((a, b) => a + b, 0) };
  }

  const sum = roundHalfUp(
    values.reduce((a, b) => a + b, 0),
    4
  );

  if (weightMode === 'PERCENT') {
    if (Math.abs(sum - 100) > 0.01) {
      return {
        valid: false,
        message: `PERCENT weight mode requires weights to sum to 100 (got ${sum})`,
        sum,
      };
    }
  }

  return { valid: true, message: null, sum };
}

function validateScoreAgainstMax(score, maxScore) {
  const s = toNumber(score);
  const max = toNumber(maxScore);
  if (s == null) return { valid: false, message: 'score is required' };
  if (s < 0) return { valid: false, message: 'score cannot be negative' };
  if (max != null && s > max) {
    return { valid: false, message: `score cannot exceed max score (${max})` };
  }
  return { valid: true, message: null };
}

module.exports = {
  toNumber,
  roundHalfUp,
  resolveGradeLetter,
  computeWeightedTotal,
  validateWeights,
  validateScoreAgainstMax,
};
