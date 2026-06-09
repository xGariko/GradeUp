import { z } from 'zod';
import { ExamStatusSchema } from './enums';

export const EnrollmentSchema = z.object({
    id:              z.number().int().positive(),
    id_exam:         z.number().int().positive(),
    id_student:      z.number().int().positive(),
    status:          ExamStatusSchema,
    grade:           z.number().int().min(18).max(30).nullable(),
    enrollment_date: z.coerce.date(),
    withdrawal_date: z.coerce.date().nullable(),
});

export type Enrollment = z.infer<typeof EnrollmentSchema>;
