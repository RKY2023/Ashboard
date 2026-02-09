/**
 * User type definition
 */
export interface User {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  phoneno?: string;
  createdAt?: Date;
}

/**
 * Standard API response type
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    msg: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

/**
 * Login request/response types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  msg: string;
  user: Omit<User, 'password'>;
}

/**
 * User registration request type
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneno?: string;
}

export interface RegisterResponse {
  msg: string;
  userId: string;
}

/**
 * Meetup type
 */
export interface Meetup {
  _id?: string;
  title: string;
  image: string;
  address: string;
  description: string;
}

/**
 * Theme state
 */
export type Theme = 'light' | 'dark';

export interface ThemeState {
  theme: Theme;
}

/**
 * Rate limit response
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

/**
 * Header props
 */
export interface HeaderProps {
  isLoggedIn?: boolean;
  userData?: Omit<User, 'password'>;
}

/**
 * Carousel item
 */
export interface CarouselItem {
  title: string;
  description: string;
  image: string;
  id?: string;
}

/**
 * Generic async state
 */
export interface AsyncState<T = any> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Grocery item type
 */
export interface Grocery {
  _id?: string;
  name: string;
  category?: string;
  price?: number;
  quantity?: number;
  unit?: string;
}

/**
 * Recipe type
 */
export interface Recipe {
  _id?: string;
  title: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
}

/**
 * IP Address type
 */
export interface IPAddress {
  _id?: string;
  ipAddress: string;
  hostname?: string;
  location?: string;
  lastSeen?: Date;
  status?: string;
}

/**
 * Paginated API response type
 */
export interface PaginatedApiResponse<T = any> {
  success: boolean;
  data?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  error?: {
    msg: string;
    details?: Array<{ field: string; message: string }>;
  };
}
