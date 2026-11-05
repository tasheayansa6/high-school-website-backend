/**
 * Soft-delete helpers for models that use `deletedAt`.
 *
 * Models with soft delete:
 * - Admin, Page, BlogCategory, BlogPost, Event, MediaAsset, NewsletterSubscriber,
 *   AdmissionInquiry
 *
 * Approach: explicit `where` helpers used by services.
 * This does NOT install a global Prisma extension or middleware, so existing
 * queries are never changed unexpectedly.
 *
 * Limitation: every list/get query on soft-deletable models must call
 * `notDeleted()` (or merge it into `where`). Forgotten filters can return
 * deleted rows. Prefer using these helpers in services rather than ad-hoc
 * `deletedAt: null` literals.
 */

/**
 * Merge a Prisma `where` clause so only non-deleted rows match.
 * @param {object} [where]
 * @returns {object}
 */
function notDeleted(where = {}) {
  return {
    ...where,
    deletedAt: null,
  };
}

/**
 * Build a where clause that can include soft-deleted rows.
 * Use only in authorized admin/recovery flows.
 * @param {object} [where]
 * @param {{ includeDeleted?: boolean }} [options]
 * @returns {object}
 */
function withSoftDeleteFilter(where = {}, options = {}) {
  const { includeDeleted = false } = options;

  if (includeDeleted) {
    return { ...where };
  }

  return notDeleted(where);
}

module.exports = {
  notDeleted,
  withSoftDeleteFilter,
};
