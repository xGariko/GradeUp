import { z } from 'zod';
import { StudentStatusSchema } from './enums';

export const StudentSchema = z.object({
    id:      z.number().int().positive(),
    id_user: z.number().int().positive(),
    status:  StudentStatusSchema,
});

export type Student = z.infer<typeof StudentSchema>;
