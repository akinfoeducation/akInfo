export type PagedApiResponse<T> = ApiResponse<T>;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PageMeta;
  errors?: FieldError[];
  errorCode?: string;
  requestId: string;
  timestamp: string;
}

export interface PageMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FieldError {
  field: string;
  message: string;
}
