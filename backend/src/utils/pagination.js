/**
 * Reads `page` / `limit` from a query string and returns safe values plus the
 * mongo skip offset. Keeps list endpoints responsive as labs and sessions grow.
 */
function getPagination(query, { defaultLimit = 25, maxLimit = 200 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const requested = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(requested, 1), maxLimit);

  return { page, limit, skip: (page - 1) * limit };
}

/** Shapes a paginated list response the same way for every collection. */
function paginatedResponse(items, total, { page, limit }) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    }
  };
}

module.exports = { getPagination, paginatedResponse };
