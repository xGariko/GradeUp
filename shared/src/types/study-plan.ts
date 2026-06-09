import { z } from 'zod';

export const StudyPlanSchema = z.object({
    id:           z.number().int().positive(),
    id_degree:    z.number().int().positive(),
    id_subject:   z.number().int().positive(),
    year:         z.number().int().min(2000).max(2100),
    is_mandatory: z.boolean(),
});

export type StudyPlan = z.infer<typeof StudyPlanSchema>;
