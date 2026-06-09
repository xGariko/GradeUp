import { z } from 'zod';

export const CourseSchema = z.object({
    id:            z.number().int().positive(),
    id_subject:    z.number().int().positive(),
    id_degree:     z.number().int().positive(),
    id_teacher:    z.number().int().positive(),
    cfu:           z.number().int().min(1).max(30),
    start_date:    z.coerce.date().nullable(),
    end_date:      z.coerce.date().nullable(),
    max_students:  z.number().int().positive().nullable(),
    semester:      z.number().int().min(1).max(2).nullable(),
    academic_year: z.number().int().min(2000).max(2100).nullable(),
});

export type Course = z.infer<typeof CourseSchema>;
