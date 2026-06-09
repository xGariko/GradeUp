import { z } from 'zod';
import { MatriculationStatusSchema } from './enums';

export const MatriculationSchema = z.object({
    id_student:         z.number().int().positive(),
    id_degree:          z.number().int().positive(),
    status:             MatriculationStatusSchema,
    matriculation_code: z.number().int().nullable(),
    matriculation_date: z.coerce.date().nullable(),
});

export type Matriculation = z.infer<typeof MatriculationSchema>;
