import type { NextApiRequest } from 'next';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

export function getPaginationParams(req: NextApiRequest): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, parseInt(req.query.limit as string) || DEFAULT_PAGE_LIMIT)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
