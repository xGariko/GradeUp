import { z } from 'zod';

export const AppUserSchema = z.object({
    id:        z.number().int().positive(),
    name:      z.string().max(40),
    surname:   z.string().max(40),
    birthdate: z.coerce.date(),
    taxcode:   z.string().length(16),
    mobile:    z.string().max(20).nullable(),
    email:     z.string().email().max(255),
    password:  z.string().max(255),
    propic:    z.number().int().positive().nullable(),
    is_active: z.boolean(),
});

export type AppUser = z.infer<typeof AppUserSchema>;

// Senza password — da usare nelle risposte API
export const AppUserPublicSchema = AppUserSchema.omit({ password: true });
export type AppUserPublic = z.infer<typeof AppUserPublicSchema>;
