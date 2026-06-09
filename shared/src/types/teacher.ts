import { z } from 'zod';
import { ContractTypeSchema, TeacherStatusSchema } from './enums';

export const TeacherSchema = z.object({
    id:            z.number().int().positive(),
    id_user:       z.number().int().positive(),
    status:        TeacherStatusSchema,
    contract_type: ContractTypeSchema,
});

export type Teacher = z.infer<typeof TeacherSchema>;
