/**
 * Pure gradebook calculation unit tests (no DB).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  roundHalfUp,
  resolveGradeLetter,
  computeWeightedTotal,
  validateWeights,
  validateScoreAgainstMax,
} = require('../src/services/sms/gradebook.calc');

describe('gradebook.calc', () => {
  it('rounds half-up consistently', () => {
    assert.equal(roundHalfUp(79.995, 2), 80);
    assert.equal(roundHalfUp(79.994, 2), 79.99);
    assert.equal(roundHalfUp(1.235, 2), 1.24);
  });

  it('resolves letter grades from boundaries', () => {
    const boundaries = [
      { letter: 'A', minPercent: 90, maxPercent: 100, remark: 'Excellent' },
      { letter: 'B', minPercent: 80, maxPercent: 89.99, remark: 'Good' },
      { letter: 'F', minPercent: 0, maxPercent: 59.99, remark: 'Fail' },
    ];
    assert.equal(resolveGradeLetter(95, boundaries).letter, 'A');
    assert.equal(resolveGradeLetter(80, boundaries).letter, 'B');
    assert.equal(resolveGradeLetter(50, boundaries).letter, 'F');
    assert.equal(resolveGradeLetter(null, boundaries).letter, null);
  });

  it('computes weighted totals and skips missing marks by default', () => {
    const result = computeWeightedTotal(
      [
        { assessmentId: 1, maxScore: 100, weight: 1, score: 80 },
        { assessmentId: 2, maxScore: 50, weight: 1, score: null },
      ],
      { treatMissingAsZero: false, decimalPlaces: 2 }
    );
    assert.equal(result.percent, 80);
    assert.equal(result.missingCount, 1);
    assert.equal(result.scoredCount, 1);
    assert.equal(result.complete, false);
  });

  it('treats missing as zero when policy requires it', () => {
    const result = computeWeightedTotal(
      [
        { assessmentId: 1, maxScore: 100, weight: 1, score: 100 },
        { assessmentId: 2, maxScore: 100, weight: 1, score: null },
      ],
      { treatMissingAsZero: true, decimalPlaces: 2 }
    );
    assert.equal(result.percent, 50);
    assert.equal(result.missingCount, 1);
  });

  it('validates relative and percent weight modes', () => {
    assert.equal(validateWeights([1, 2, 3], 'RELATIVE').valid, true);
    assert.equal(validateWeights([40, 60], 'PERCENT').valid, true);
    assert.equal(validateWeights([40, 50], 'PERCENT').valid, false);
    assert.equal(validateWeights([-1], 'RELATIVE').valid, false);
  });

  it('validates scores against max', () => {
    assert.equal(validateScoreAgainstMax(50, 100).valid, true);
    assert.equal(validateScoreAgainstMax(-1, 100).valid, false);
    assert.equal(validateScoreAgainstMax(101, 100).valid, false);
  });
});
