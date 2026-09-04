import type { PaginationParams, PaginationMeta } from "../types/pagination.js";

/**
 * Parses and strictly validates query parameters for pagination.
 */
export const parsePaginationParams = (
  rawPage?: unknown,
  rawLimit?: unknown,
  defaultLimit = 10,
  maxLimit = 50
): { params?: PaginationParams; error?: string } => {
  let page = 1;
  let limit = defaultLimit;

  // 1. Validate 'page' if provided
  if (rawPage !== undefined) {
    const parsedPage = Number(rawPage);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return {
        error: "Page must be a positive integer greater than or equal to 1.",
      };
    }
    page = parsedPage;
  }

  // 2. Validate 'limit' if provided
  if (rawLimit !== undefined) {
    const parsedLimit = Number(rawLimit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > maxLimit) {
      return {
        error: `Limit must be an integer between 1 and ${maxLimit}.`,
      };
    }
    limit = parsedLimit;
  }

  // 3. Calculate skip: (page - 1) * limit
  const skip = (page - 1) * limit;

  return {
    params: {
      page,
      limit,
      skip,
    },
  };
};

/**
 * Computes pagination metadata from total count and page settings.
 */
export const createPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && total > 0,
  };
};
