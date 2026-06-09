import { z } from 'zod';
import { DegreeTypeSchema } from './enums';

export const DegreeSchema = z.object({
    id:          z.number().int().positive(),
    type:        DegreeTypeSchema,
    department:  z.string().max(100),
    title:       z.string().max(100),
    description: z.string().nullable(),
    duration:    z.number().int().positive(),
});

export type Degree = z.infer<typeof DegreeSchema>;
