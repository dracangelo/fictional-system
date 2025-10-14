export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiError;
  validationErrors?: ValidationError[];
}