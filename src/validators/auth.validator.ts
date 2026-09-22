import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(Role),
});

export type RegisterInput = z.infer<typeof registerSchema>;
