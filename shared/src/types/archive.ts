import { z } from 'zod';

export const ArchiveSchema = z.object({
    id:           z.number().int().positive(),
    id_course:    z.number().int().positive(),
    last_updated: z.coerce.date().nullable(),
    description:  z.string().nullable(),
});

export type Archive = z.infer<typeof ArchiveSchema>;
