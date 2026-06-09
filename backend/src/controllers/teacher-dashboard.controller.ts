import { Request, Response } from 'express';
import { AppError } from '@middleware/error-handler';
import type {
    TeacherCurrentCourse,
    TeacherUpcomingExam,
    TeacherExamToGrade,
} from '@shared/types/dashboard';

export async function currentCourses(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const items: TeacherCurrentCourse[] = [
        { courseId: 21, title: 'Programmazione I',          enrolledCount: 142, semester: 1, cfu: 9 },
        { courseId: 22, title: 'Linguaggi Formali',         enrolledCount:  78, semester: 1, cfu: 6 },
        { courseId: 23, title: 'Laboratorio di Algoritmi',  enrolledCount:  54, semester: 2, cfu: 6 },
    ];
    res.json(items);
}

export async function upcomingExams(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const items: TeacherUpcomingExam[] = [
        { examId: 101, courseTitle: 'Programmazione I',  examDate: '2026-06-15T09:00:00.000Z', enrolledStudents: 64 },
        { examId: 102, courseTitle: 'Linguaggi Formali', examDate: '2026-06-22T14:00:00.000Z', enrolledStudents: 31 },
    ];
    res.json(items);
}

export async function examsToGrade(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const items: TeacherExamToGrade[] = [
        { examId: 99, courseTitle: 'Programmazione I', examDate: '2026-05-18T09:00:00.000Z', pendingCount: 23 },
    ];
    res.json(items);
}
