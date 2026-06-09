import { z } from 'zod';

export const ExamSchema = z.object({
    id:         z.number().int().positive(),
    id_course:  z.number().int().positive(),
    id_teacher: z.number().int().positive(),
    location:   z.string().max(255).nullable(),
    exam_date:  z.coerce.date().nullable(),
});

export type Exam = z.infer<typeof ExamSchema>;
