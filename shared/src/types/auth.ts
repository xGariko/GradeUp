import { z } from 'zod';
import { AppUserPublicSchema } from './user';

export const RegisterStudentDtoSchema = z.object({
    name:      z.string().min(1).max(40),
    surname:   z.string().min(1).max(40),
    birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD richiesto'),
    taxcode:   z.string().length(16),
    mobile:    z.string().max(20).nullable().optional(),
    email:     z.string().email().max(255),
    password:  z.string().min(8).max(255),
});
export type RegisterStudentDto = z.infer<typeof RegisterStudentDtoSchema>;

export const LoginDtoSchema = z.object({
    email:    z.string().email(),
    password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const UserRoleSchema = z.enum(['student', 'teacher']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AuthResponseSchema = z.object({
    token: z.string(),
    user:  AppUserPublicSchema,
    role:  UserRoleSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
