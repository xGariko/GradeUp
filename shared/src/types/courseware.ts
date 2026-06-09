import { z } from 'zod';

export const CoursewareSchema = z.object({
    id:          z.number().int().positive(),
    id_archive:  z.number().int().positive(),
    id_file:     z.number().int().positive(),
    uploaded_by: z.number().int().positive(),
    uploaded_at: z.coerce.date().nullable(),
    title:       z.string().max(100).nullable(),
    description: z.string().nullable(),
});

export type Courseware = z.infer<typeof CoursewareSchema>;
