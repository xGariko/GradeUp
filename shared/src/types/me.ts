import { z } from 'zod';
import { AppUserPublicSchema } from './user';
import { UserRoleSchema } from './auth';

export const MeResponseSchema = z.object({
    user: AppUserPublicSchema,
    role: UserRoleSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const UpdateProfileDtoSchema = z.object({
    name:    z.string().min(1).max(40),
    surname: z.string().min(1).max(40),
    mobile:  z.string().max(20).nullable().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;

export const ChangePasswordDtoSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword:     z.string().min(8).max(255),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;
