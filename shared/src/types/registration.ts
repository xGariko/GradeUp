import { z } from 'zod';

export const RegistrationSchema = z.object({
    id_course:         z.number().int().positive(),
    id_student:        z.number().int().positive(),
    registration_date: z.coerce.date().nullable(),
});

export type Registration = z.infer<typeof RegistrationSchema>;
