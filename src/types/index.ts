export type UserRole = "SUPER_ADMIN" | "ADMIN";

export type ItemType = "software" | "system" | "docker" | "service";

export type CheckMethod = "manual" | "api" | "scraping";

export type ItemStatus = "up_to_date" | "outdated" | "critical";

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
