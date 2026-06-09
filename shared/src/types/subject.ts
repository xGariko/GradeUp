import { z } from 'zod';

export const SubjectSchema = z.object({
    id:          z.number().int().positive(),
    title:       z.string().max(100),
    description: z.string().nullable(),
});

export type Subject = z.infer<typeof SubjectSchema>;
