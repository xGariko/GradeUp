import { z } from 'zod';

// ============================================================
// Student dashboard
// ============================================================

export const StudentCareerSummarySchema = z.object({
    status: z.enum(['not_matriculated', 'pending', 'active', 'suspended', 'inactive', 'graduated']),
    matriculationCode: z.string().nullable(),
    academicYear:      z.string().nullable(),
    degreeTitle:       z.string().nullable(),
    degreeType:        z.string().nullable(),
});
export type StudentCareerSummary = z.infer<typeof StudentCareerSummarySchema>;

export const StudentUpcomingExamSchema = z.object({
    enrollmentId: z.number().int().positive(),
    courseTitle:  z.string(),
    examDate:     z.string(),
    location:     z.string().nullable(),
    teacherName:  z.string(),
});
export type StudentUpcomingExam = z.infer<typeof StudentUpcomingExamSchema>;

export const StudentCurrentCourseSchema = z.object({
    registrationId: z.number().int().positive(),
    courseId:       z.number().int().positive(),
    title:          z.string(),
    cfu:            z.number().int(),
    semester:       z.number().int(),
    teacherName:    z.string(),
});
export type StudentCurrentCourse = z.infer<typeof StudentCurrentCourseSchema>;

export const StudentCfuProgressSchema = z.object({
    acquired: z.number().int().nonnegative(),
    total:    z.number().int().positive(),
    average:  z.number().nullable(),
});
export type StudentCfuProgress = z.infer<typeof StudentCfuProgressSchema>;

// ============================================================
// Teacher dashboard
// ============================================================

export const TeacherCurrentCourseSchema = z.object({
    courseId:      z.number().int().positive(),
    title:         z.string(),
    enrolledCount: z.number().int().nonnegative(),
    semester:      z.number().int(),
    cfu:           z.number().int(),
});
export type TeacherCurrentCourse = z.infer<typeof TeacherCurrentCourseSchema>;

export const TeacherUpcomingExamSchema = z.object({
    examId:          z.number().int().positive(),
    courseTitle:     z.string(),
    examDate:        z.string(),
    enrolledStudents: z.number().int().nonnegative(),
});
export type TeacherUpcomingExam = z.infer<typeof TeacherUpcomingExamSchema>;

export const TeacherExamToGradeSchema = z.object({
    examId:        z.number().int().positive(),
    courseTitle:   z.string(),
    examDate:      z.string(),
    pendingCount:  z.number().int().nonnegative(),
});
export type TeacherExamToGrade = z.infer<typeof TeacherExamToGradeSchema>;

// ============================================================
// Notifications (cross-role)
// ============================================================

export const NotificationItemSchema = z.object({
    id:        z.number().int().positive(),
    title:     z.string(),
    body:      z.string(),
    createdAt: z.string(),
    read:      z.boolean(),
    severity:  z.enum(['info', 'success', 'warning', 'danger']),
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;
