import { z } from 'zod';

// User registration schema with strong password requirements
export const userRegistrationSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
    ),
  phoneno: z
    .string()
    .regex(/^[+]?[\d\s\-()]{10,}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
});

// User login schema
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

// Type exports for use in API routes
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type Login = z.infer<typeof loginSchema>;

/**
 * Validate user registration data
 * Returns validated data or throws error with details
 */
export function validateUserRegistration(data: unknown) {
  try {
    return userRegistrationSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ValidationError('Validation failed', messages);
    }
    throw error;
  }
}

/**
 * Validate login data
 * Returns validated data or throws error with details
 */
export function validateLogin(data: unknown) {
  try {
    return loginSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw new ValidationError('Validation failed', messages);
    }
    throw error;
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
