export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    [key: string]: unknown;
  };
}

export interface ApiPaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  timestamp: string;
  path?: string;
}
