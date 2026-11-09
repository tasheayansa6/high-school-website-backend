/**
 * Helpers for NULL-safe / soft-delete-safe uniqueness in the School Management System.
 *
 * MySQL treats NULLs as distinct in unique indexes, and soft-deleted rows still
 * occupy unique keys. These helpers produce companion string keys that make the
 * unique constraints behave as intended.
 */

const YEAR_SCOPE = 'YEAR';

/**
 * Teaching assignment term scope: whole-year assignments use "YEAR".
 * @param {number|null|undefined} academicTermId
 * @returns {string}
 */
function buildTermScopeKey(academicTermId) {
  return academicTermId == null ? YEAR_SCOPE : String(academicTermId);
}

/**
 * Live enrollment scope key (unique per student + class offering).
 */
function buildActiveScopeKey(studentId, classOfferingId) {
  return `${studentId}:${classOfferingId}`;
}

/**
 * Key written on soft-delete so the live key can be reused by a new enrollment.
 */
function buildDeletedEnrollmentScopeKey(studentId, classOfferingId, enrollmentId) {
  return `${studentId}:${classOfferingId}:deleted:${enrollmentId}`;
}

/**
 * Key written on teaching-assignment soft-delete so the same assignment can be recreated.
 */
function buildDeletedTermScopeKey(termScopeKey, assignmentId) {
  return `${termScopeKey}:deleted:${assignmentId}`;
}

module.exports = {
  YEAR_SCOPE,
  buildTermScopeKey,
  buildActiveScopeKey,
  buildDeletedEnrollmentScopeKey,
  buildDeletedTermScopeKey,
};
