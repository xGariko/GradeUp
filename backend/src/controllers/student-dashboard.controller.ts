import { Request, Response } from 'express';
import { db } from '@db/client';
import { AppError } from '@middleware/error-handler';
import type {
    StudentCareerSummary,
    StudentUpcomingExam,
    StudentCurrentCourse,
    StudentCfuProgress,
} from '@shared/types/dashboard';

const DEGREE_TYPE_LABELS: Record<string, string> = {
    bachelor: 'Laurea Triennale',
    master:   'Laurea Magistrale',
    phd:      'Dottorato',
    diploma:  'Diploma',
};

async function studentIdOf(userId: number): Promise<number> {
    const result = await db.query<{ id: number }>(
        'SELECT id FROM student WHERE id_user = $1',
        [userId],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new AppError(404, 'Profilo studente non trovato');
    return id;
}

function academicYearFrom(date: Date | string | null): string | null {
    if (!date) return null;
    const year = new Date(date).getFullYear();
    return `${year}/${year + 1}`;
}

export async function careerSummary(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query<{
        status: string;
        matriculation_code: number | null;
        matriculation_date: Date | string | null;
        degree_title: string;
        degree_type: string;
    }>(
        `SELECT m.status, m.matriculation_code, m.matriculation_date,
                d.title AS degree_title, d.type AS degree_type
           FROM matriculation m
           JOIN degree d ON d.id = m.id_degree
          WHERE m.id_student = $1
          ORDER BY (m.status = 'active') DESC, m.matriculation_date DESC NULLS LAST
          LIMIT 1`,
        [studentId],
    );

    const row = result.rows[0];
    const summary: StudentCareerSummary = row
        ? {
            status:            row.status as StudentCareerSummary['status'],
            matriculationCode: row.matriculation_code != null ? String(row.matriculation_code) : null,
            academicYear:      academicYearFrom(row.matriculation_date),
            degreeTitle:       row.degree_title,
            degreeType:        DEGREE_TYPE_LABELS[row.degree_type] ?? row.degree_type,
        }
        : {
            status:            'not_matriculated',
            matriculationCode: null,
            academicYear:      null,
            degreeTitle:       null,
            degreeType:        null,
        };

    res.json(summary);
}

export async function upcomingExams(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query<StudentUpcomingExam>(
        `SELECT e.id                          AS "enrollmentId",
                sub.title                     AS "courseTitle",
                ex.exam_date                  AS "examDate",
                ex.location                   AS "location",
                tu.name || ' ' || tu.surname  AS "teacherName"
           FROM enrollment e
           JOIN exam ex      ON ex.id = e.id_exam
           JOIN course c     ON c.id = ex.id_course
           JOIN subject sub  ON sub.id = c.id_subject
           JOIN teacher t    ON t.id = ex.id_teacher
           JOIN app_user tu  ON tu.id = t.id_user
          WHERE e.id_student = $1 AND e.status = 'scheduled'
          ORDER BY ex.exam_date ASC`,
        [studentId],
    );

    res.json(result.rows);
}

export async function currentRegistrations(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query<StudentCurrentCourse>(
        `SELECT c.id                          AS "registrationId",
                c.id                          AS "courseId",
                sub.title                     AS "title",
                c.cfu                         AS "cfu",
                COALESCE(c.semester, 0)       AS "semester",
                tu.name || ' ' || tu.surname  AS "teacherName"
           FROM registration r
           JOIN course c     ON c.id = r.id_course
           JOIN subject sub  ON sub.id = c.id_subject
           JOIN teacher t    ON t.id = c.id_teacher
           JOIN app_user tu  ON tu.id = t.id_user
          WHERE r.id_student = $1
          ORDER BY sub.title`,
        [studentId],
    );

    res.json(result.rows);
}

export async function listRegistrations(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query<{
        courseId:         number;
        subjectTitle:     string;
        teacherName:      string;
        degreeTitle:      string;
        academicYear:     number | null;
        semester:         number | null;
        cfu:              number;
        registrationDate: string | null;
        futureExams:      number;
    }>(
        `SELECT c.id                          AS "courseId",
                sub.title                     AS "subjectTitle",
                tu.name || ' ' || tu.surname  AS "teacherName",
                d.title                       AS "degreeTitle",
                c.academic_year               AS "academicYear",
                c.semester                    AS "semester",
                c.cfu                         AS "cfu",
                to_char(r.registration_date, 'YYYY-MM-DD') AS "registrationDate",
                (SELECT COUNT(*)::int FROM exam ex
                  WHERE ex.id_course = c.id AND ex.exam_date > now()) AS "futureExams"
           FROM registration r
           JOIN course c    ON c.id = r.id_course
           JOIN subject sub ON sub.id = c.id_subject
           JOIN degree d    ON d.id = c.id_degree
           JOIN teacher t   ON t.id = c.id_teacher
           JOIN app_user tu ON tu.id = t.id_user
          WHERE r.id_student = $1
          ORDER BY c.academic_year DESC NULLS LAST, sub.title ASC`,
        [studentId],
    );

    res.json(result.rows);
}

export async function availableExams(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const matr = await db.query<{ status: string }>(
        `SELECT status FROM matriculation
          WHERE id_student = $1 AND status <> 'withdrawn'
          ORDER BY (status = 'active') DESC, matriculation_date DESC NULLS LAST
          LIMIT 1`,
        [studentId],
    );
    const matriculationStatus = matr.rows[0]?.status ?? null;

    const registered = await db.query<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM registration WHERE id_student = $1',
        [studentId],
    );
    const registeredCount = registered.rows[0].count;

    const exams = await db.query<{
        id:           number;
        courseId:     number;
        subjectTitle: string;
        teacherName:  string;
        examDate:     string;
        location:     string | null;
        myStatus:     string | null;
        grade:        number | null;
        enrollmentId: number | null;
    }>(
        `SELECT ex.id                          AS "id",
                c.id                           AS "courseId",
                sub.title                      AS "subjectTitle",
                tu.name || ' ' || tu.surname   AS "teacherName",
                ex.exam_date                   AS "examDate",
                ex.location                    AS "location",
                (SELECT en.status FROM enrollment en
                  WHERE en.id_exam = ex.id AND en.id_student = $1 AND en.status <> 'withdrawn'
                  ORDER BY (en.status = 'scheduled') DESC, en.id DESC LIMIT 1) AS "myStatus",
                (SELECT en.grade FROM enrollment en
                  WHERE en.id_exam = ex.id AND en.id_student = $1 AND en.status = 'passed'
                  LIMIT 1) AS "grade",
                (SELECT en.id FROM enrollment en
                  WHERE en.id_exam = ex.id AND en.id_student = $1 AND en.status = 'scheduled'
                  LIMIT 1) AS "enrollmentId"
           FROM exam ex
           JOIN course c    ON c.id = ex.id_course
           JOIN subject sub ON sub.id = c.id_subject
           JOIN teacher t   ON t.id = ex.id_teacher
           JOIN app_user tu ON tu.id = t.id_user
          WHERE ex.exam_date > now()
            AND ex.exam_date <= now() + interval '90 days'
            AND EXISTS (SELECT 1 FROM registration r
                         WHERE r.id_course = ex.id_course AND r.id_student = $1)
          ORDER BY ex.exam_date ASC`,
        [studentId],
    );

    res.json({ matriculationStatus, registeredCount, exams: exams.rows });
}

export async function listEnrollments(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query<{
        id:           number;
        examId:       number;
        courseId:     number;
        subjectTitle: string;
        teacherName:  string;
        examDate:     string | null;
        location:     string | null;
        status:       string;
        grade:        number | null;
        academicYear: number | null;
        future:       boolean;
    }>(
        `SELECT e.id                          AS "id",
                ex.id                          AS "examId",
                c.id                           AS "courseId",
                sub.title                      AS "subjectTitle",
                tu.name || ' ' || tu.surname   AS "teacherName",
                ex.exam_date                   AS "examDate",
                ex.location                    AS "location",
                e.status                       AS "status",
                e.grade                        AS "grade",
                c.academic_year                AS "academicYear",
                (ex.exam_date > now())         AS "future"
           FROM enrollment e
           JOIN exam ex     ON ex.id = e.id_exam
           JOIN course c    ON c.id = ex.id_course
           JOIN subject sub ON sub.id = c.id_subject
           JOIN teacher t   ON t.id = ex.id_teacher
           JOIN app_user tu ON tu.id = t.id_user
          WHERE e.id_student = $1
          ORDER BY ex.exam_date DESC NULLS LAST`,
        [studentId],
    );

    res.json(result.rows);
}

export async function cfuProgress(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query<{ acquired: number; total: number; average: string | null }>(
        `SELECT
           COALESCE((
             SELECT SUM(c.cfu) FROM enrollment e
               JOIN exam ex  ON ex.id = e.id_exam
               JOIN course c ON c.id = ex.id_course
              WHERE e.id_student = $1 AND e.status = 'passed'
           ), 0)::int AS acquired,
           COALESCE(NULLIF((
             SELECT SUM(sp_cfu.cfu) FROM (
               SELECT (SELECT c.cfu FROM course c
                         WHERE c.id_subject = sp.id_subject AND c.id_degree = sp.id_degree
                         ORDER BY c.academic_year DESC NULLS LAST, c.id DESC LIMIT 1) AS cfu
                 FROM study_plan sp
                WHERE sp.id_degree = (
                  SELECT m.id_degree FROM matriculation m
                   WHERE m.id_student = $1 AND m.status <> 'withdrawn'
                   ORDER BY (m.status = 'active') DESC, m.matriculation_date DESC NULLS LAST
                   LIMIT 1
                )
             ) sp_cfu
           ), 0), 180)::int AS total,
           (
             SELECT AVG(e.grade) FROM enrollment e
              WHERE e.id_student = $1 AND e.status = 'passed' AND e.grade IS NOT NULL
           ) AS average`,
        [studentId],
    );

    const row = result.rows[0];
    const progress: StudentCfuProgress = {
        acquired: row.acquired,
        total:    row.total,
        average:  row.average != null ? Math.round(Number(row.average) * 10) / 10 : null,
    };

    res.json(progress);
}

export async function studyPlan(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const matrResult = await db.query<{ id_degree: number; status: string; degree_title: string }>(
        `SELECT m.id_degree, m.status, d.title AS degree_title
           FROM matriculation m
           JOIN degree d ON d.id = m.id_degree
          WHERE m.id_student = $1 AND m.status <> 'withdrawn'
          ORDER BY (m.status = 'active') DESC, m.matriculation_date DESC NULLS LAST
          LIMIT 1`,
        [studentId],
    );
    const matr = matrResult.rows[0];
    if (!matr) {
        res.json({ degreeTitle: null, matriculationStatus: null, cfuAcquired: 0, cfuTotal: 0, items: [] });
        return;
    }

    const rows = await db.query<{
        subjectId: number;
        subjectTitle: string;
        year: number;
        isMandatory: boolean;
        cfu: number | null;
        courseId: number | null;
        passedGrade: number | null;
        inProgress: boolean;
    }>(
        `SELECT sp.id_subject     AS "subjectId",
                sub.title         AS "subjectTitle",
                sp.year           AS "year",
                sp.is_mandatory   AS "isMandatory",
                (SELECT c.cfu FROM course c
                  WHERE c.id_subject = sp.id_subject AND c.id_degree = sp.id_degree
                  ORDER BY c.academic_year DESC NULLS LAST, c.id DESC LIMIT 1) AS "cfu",
                (SELECT c.id FROM course c
                  WHERE c.id_subject = sp.id_subject AND c.id_degree = sp.id_degree
                  ORDER BY c.academic_year DESC NULLS LAST, c.id DESC LIMIT 1) AS "courseId",
                (SELECT e.grade FROM enrollment e
                   JOIN exam ex ON ex.id = e.id_exam
                   JOIN course c ON c.id = ex.id_course
                  WHERE c.id_subject = sp.id_subject AND c.id_degree = sp.id_degree
                    AND e.id_student = $1 AND e.status = 'passed'
                  ORDER BY e.grade DESC NULLS LAST LIMIT 1) AS "passedGrade",
                EXISTS (SELECT 1 FROM registration r
                          JOIN course c ON c.id = r.id_course
                         WHERE c.id_subject = sp.id_subject AND c.id_degree = sp.id_degree
                           AND r.id_student = $1) AS "inProgress"
           FROM study_plan sp
           JOIN subject sub ON sub.id = sp.id_subject
          WHERE sp.id_degree = $2
          ORDER BY sp.year ASC, sub.title ASC`,
        [studentId, matr.id_degree],
    );

    const items = rows.rows.map(r => ({
        subjectId:    r.subjectId,
        subjectTitle: r.subjectTitle,
        year:         r.year,
        isMandatory:  r.isMandatory,
        cfu:          r.cfu ?? 0,
        status:       r.passedGrade != null ? 'passed' : (r.inProgress ? 'in_progress' : 'todo'),
        grade:        r.passedGrade,
        courseId:     r.courseId,
    }));

    const cfuTotal    = items.reduce((sum, it) => sum + it.cfu, 0);
    const cfuAcquired = items.filter(it => it.status === 'passed').reduce((sum, it) => sum + it.cfu, 0);

    res.json({
        degreeTitle:         matr.degree_title,
        matriculationStatus: matr.status,
        cfuAcquired,
        cfuTotal,
        items,
    });
}

export async function transcript(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const headerResult = await db.query<{
        student_name:       string;
        matriculation_code: number | null;
        matriculation_date: Date | string | null;
        status:             string | null;
        degree_title:       string | null;
    }>(
        `SELECT (u.name || ' ' || u.surname) AS student_name,
                m.matriculation_code, m.matriculation_date, m.status,
                d.title AS degree_title
           FROM app_user u
           LEFT JOIN LATERAL (
                SELECT mat.matriculation_code, mat.matriculation_date, mat.status, mat.id_degree
                  FROM matriculation mat
                 WHERE mat.id_student = $1 AND mat.status <> 'withdrawn'
                 ORDER BY (mat.status = 'active') DESC, mat.matriculation_date DESC NULLS LAST
                 LIMIT 1
           ) m ON true
           LEFT JOIN degree d ON d.id = m.id_degree
          WHERE u.id = $2`,
        [studentId, req.user.sub],
    );
    const header = headerResult.rows[0];

    const itemsResult = await db.query<{
        enrollmentId: number;
        courseId:     number;
        examDate:     string | null;
        subjectTitle: string;
        cfu:          number;
        grade:        number | null;
        teacherName:  string;
        academicYear: number | null;
        location:     string | null;
    }>(
        `SELECT e.id                          AS "enrollmentId",
                c.id                           AS "courseId",
                ex.exam_date                   AS "examDate",
                sub.title                      AS "subjectTitle",
                c.cfu                          AS "cfu",
                e.grade                        AS "grade",
                tu.name || ' ' || tu.surname   AS "teacherName",
                c.academic_year                AS "academicYear",
                ex.location                    AS "location"
           FROM enrollment e
           JOIN exam ex     ON ex.id = e.id_exam
           JOIN course c    ON c.id = ex.id_course
           JOIN subject sub ON sub.id = c.id_subject
           JOIN teacher t   ON t.id = ex.id_teacher
           JOIN app_user tu ON tu.id = t.id_user
          WHERE e.id_student = $1 AND e.status = 'passed'
          ORDER BY ex.exam_date DESC NULLS LAST`,
        [studentId],
    );
    const items = itemsResult.rows;

    const totalResult = await db.query<{ total: number }>(
        `SELECT COALESCE(SUM(
            (SELECT c.cfu FROM course c
              WHERE c.id_subject = sp.id_subject AND c.id_degree = sp.id_degree
              ORDER BY c.academic_year DESC NULLS LAST, c.id DESC LIMIT 1)
         ), 0)::int AS total
           FROM study_plan sp
          WHERE sp.id_degree = (
            SELECT id_degree FROM matriculation
             WHERE id_student = $1 AND status <> 'withdrawn'
             ORDER BY (status = 'active') DESC, matriculation_date DESC NULLS LAST
             LIMIT 1
          )`,
        [studentId],
    );

    const cfuAcquired = items.reduce((sum, it) => sum + (it.cfu ?? 0), 0);
    const graded      = items.filter(it => it.grade != null);
    const weightCfu   = graded.reduce((sum, it) => sum + (it.cfu ?? 0), 0);

    const averageArithmetic = graded.length
        ? Math.round((graded.reduce((sum, it) => sum + it.grade!, 0) / graded.length) * 10) / 10
        : null;
    const averageWeighted = weightCfu
        ? Math.round((graded.reduce((sum, it) => sum + it.grade! * (it.cfu ?? 0), 0) / weightCfu) * 100) / 100
        : null;

    res.json({
        studentName:         header?.student_name ?? '',
        matriculationCode:   header?.matriculation_code != null ? String(header.matriculation_code) : null,
        degreeTitle:         header?.degree_title ?? null,
        matriculationStatus: header?.status ?? null,
        academicYear:        academicYearFrom(header?.matriculation_date ?? null),
        cfuAcquired,
        cfuTotal:            totalResult.rows[0].total,
        averageArithmetic,
        averageWeighted,
        items,
    });
}
