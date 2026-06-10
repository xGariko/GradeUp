import { Request, Response } from 'express';
import { db } from '@db/client';
import { AppError } from '@middleware/error-handler';
import type {
    TeacherCurrentCourse,
    TeacherUpcomingExam,
    TeacherExamToGrade,
} from '@shared/types/dashboard';

async function teacherIdOf(userId: number): Promise<number> {
    const result = await db.query<{ id: number }>(
        'SELECT id FROM teacher WHERE id_user = $1',
        [userId],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new AppError(404, 'Profilo docente non trovato');
    return id;
}

export async function teacherProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const result = await db.query<{ status: string; contractType: string }>(
        `SELECT status, contract_type AS "contractType" FROM teacher WHERE id_user = $1`,
        [req.user.sub],
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'Profilo docente non trovato');

    res.json(row);
}

export async function currentCourses(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);

    const result = await db.query<TeacherCurrentCourse>(
        `SELECT c.id                    AS "courseId",
                sub.title               AS "title",
                COALESCE(c.semester, 0) AS "semester",
                c.cfu                   AS "cfu",
                (SELECT COUNT(*)::int FROM registration r
                  WHERE r.id_course = c.id) AS "enrolledCount"
           FROM course c
           JOIN subject sub ON sub.id = c.id_subject
          WHERE c.id_teacher = $1
            AND c.academic_year = (SELECT MAX(academic_year) FROM course WHERE id_teacher = $1)
          ORDER BY c.semester ASC NULLS LAST, sub.title ASC`,
        [teacherId],
    );

    res.json(result.rows);
}

export async function upcomingExams(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);

    const result = await db.query<TeacherUpcomingExam>(
        `SELECT ex.id        AS "examId",
                sub.title    AS "courseTitle",
                ex.exam_date AS "examDate",
                (SELECT COUNT(*)::int FROM enrollment en
                  WHERE en.id_exam = ex.id AND en.status = 'scheduled') AS "enrolledStudents"
           FROM exam ex
           JOIN course c    ON c.id = ex.id_course
           JOIN subject sub ON sub.id = c.id_subject
          WHERE ex.id_teacher = $1 AND ex.exam_date > now()
          ORDER BY ex.exam_date ASC`,
        [teacherId],
    );

    res.json(result.rows);
}

export async function examsToGrade(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);

    const result = await db.query<TeacherExamToGrade>(
        `SELECT ex.id            AS "examId",
                sub.title        AS "courseTitle",
                ex.exam_date     AS "examDate",
                COUNT(en.id)::int AS "pendingCount"
           FROM exam ex
           JOIN course c     ON c.id = ex.id_course
           JOIN subject sub  ON sub.id = c.id_subject
           JOIN enrollment en ON en.id_exam = ex.id AND en.status = 'scheduled'
          WHERE ex.id_teacher = $1 AND ex.exam_date <= now()
          GROUP BY ex.id, sub.title, ex.exam_date
          ORDER BY ex.exam_date ASC`,
        [teacherId],
    );

    res.json(result.rows);
}

export async function listCourses(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);

    const result = await db.query(
        `SELECT c.id,
                sub.title                           AS "subjectTitle",
                d.title                             AS "degreeTitle",
                c.cfu,
                c.semester,
                c.academic_year                     AS "academicYear",
                c.max_students                      AS "capacity",
                (SELECT COUNT(*)::int FROM registration r WHERE r.id_course = c.id) AS "enrolled",
                to_char(c.start_date, 'YYYY-MM-DD')  AS "startDate",
                to_char(c.end_date, 'YYYY-MM-DD')    AS "endDate",
                (c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE) AS "concluded"
           FROM course c
           JOIN subject sub ON sub.id = c.id_subject
           JOIN degree d    ON d.id = c.id_degree
          WHERE c.id_teacher = $1
          ORDER BY c.academic_year DESC NULLS LAST, c.semester ASC NULLS LAST, sub.title ASC`,
        [teacherId],
    );

    res.json(result.rows);
}

export async function courseDetail(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);

    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId) || courseId <= 0) throw new AppError(404, 'Corso non trovato');

    const courseResult = await db.query<{ degreeId: number }>(
        `SELECT c.id,
                sub.title                           AS "subjectTitle",
                sub.description                     AS "subjectDescription",
                d.title                             AS "degreeTitle",
                c.id_degree                         AS "degreeId",
                c.academic_year                     AS "academicYear",
                c.semester,
                c.cfu,
                c.max_students                      AS "capacity",
                to_char(c.start_date, 'YYYY-MM-DD')  AS "startDate",
                to_char(c.end_date, 'YYYY-MM-DD')    AS "endDate",
                (c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE) AS "concluded",
                (SELECT COUNT(*)::int FROM registration r WHERE r.id_course = c.id) AS "enrolled"
           FROM course c
           JOIN subject sub ON sub.id = c.id_subject
           JOIN degree d    ON d.id = c.id_degree
          WHERE c.id = $1 AND c.id_teacher = $2`,
        [courseId, teacherId],
    );
    const course = courseResult.rows[0];
    if (!course) throw new AppError(404, 'Corso non trovato');

    const students = await db.query(
        `SELECT s.id                                AS "studentId",
                u.name                              AS "name",
                u.surname                           AS "surname",
                m.matriculation_code                AS "matriculationCode",
                to_char(r.registration_date, 'YYYY-MM-DD') AS "registrationDate",
                s.status                            AS "studentStatus"
           FROM registration r
           JOIN student s  ON s.id = r.id_student
           JOIN app_user u ON u.id = s.id_user
           LEFT JOIN matriculation m ON m.id_student = s.id AND m.id_degree = $2
          WHERE r.id_course = $1
          ORDER BY u.surname ASC, u.name ASC`,
        [courseId, course.degreeId],
    );

    res.json({ course, students: students.rows });
}

// Calendario appelli: tutti gli appelli del docente, con stato derivato in SQL
export async function listExams(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);

    const result = await db.query(
        `SELECT ex.id,
                ex.id_course                         AS "courseId",
                sub.title                            AS "courseTitle",
                d.title                              AS "degreeTitle",
                c.academic_year                      AS "academicYear",
                ex.exam_date                         AS "examDate",
                ex.location                          AS "location",
                (ex.exam_date > now())               AS "future",
                (SELECT COUNT(*)::int FROM enrollment en WHERE en.id_exam = ex.id) AS "enrolled",
                (SELECT COUNT(*)::int FROM enrollment en WHERE en.id_exam = ex.id AND en.status = 'scheduled') AS "scheduledCount",
                CASE
                    WHEN ex.exam_date > now() THEN 'in_programma'
                    WHEN EXISTS (SELECT 1 FROM enrollment en WHERE en.id_exam = ex.id AND en.status = 'scheduled') THEN 'da_verbalizzare'
                    ELSE 'verbalizzato'
                END                                  AS "status"
           FROM exam ex
           JOIN course c    ON c.id = ex.id_course
           JOIN subject sub ON sub.id = c.id_subject
           JOIN degree d    ON d.id = c.id_degree
          WHERE ex.id_teacher = $1
          ORDER BY ex.exam_date DESC`,
        [teacherId],
    );

    res.json(result.rows);
}
