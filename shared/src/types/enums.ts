import { z } from 'zod';

export const ContractTypeSchema = z.enum(['full_time', 'part_time', 'visiting', 'adjunct', 'emeritus']);
export type ContractType = z.infer<typeof ContractTypeSchema>;

export const DegreeTypeSchema = z.enum(['bachelor', 'master', 'phd', 'diploma']);
export type DegreeType = z.infer<typeof DegreeTypeSchema>;

export const ExamStatusSchema = z.enum(['scheduled', 'passed', 'failed', 'absent', 'withdrawn']);
export type ExamStatus = z.infer<typeof ExamStatusSchema>;

export const MatriculationStatusSchema = z.enum(['pending', 'active', 'suspended', 'withdrawn', 'graduated']);
export type MatriculationStatus = z.infer<typeof MatriculationStatusSchema>;

export const StudentStatusSchema = z.enum(['active', 'inactive', 'graduated', 'suspended']);
export type StudentStatus = z.infer<typeof StudentStatusSchema>;

export const TeacherStatusSchema = z.enum(['active', 'inactive', 'on_leave', 'retired']);
export type TeacherStatus = z.infer<typeof TeacherStatusSchema>;
