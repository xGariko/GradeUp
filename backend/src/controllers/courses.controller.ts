import { Request, Response } from 'express';
import { db } from '@db/client';
import { AppError } from '@middleware/error-handler';
import { signedUrl } from '@services/storage.service';

async function studentIdOf(userId: number): Promise<number> {
    const result = await db.query<{ id: number }>(
        'SELECT id FROM student WHERE id_user = $1',
        [userId],
    );
    const studentId = result.rows[0]?.id;
    if (!studentId) throw new AppError(404, 'Profilo studente non trovato');
    return studentId;
}

function courseIdParam(req: Request): number {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Corso non valido');
    return id;
}

export async function catalog(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query(
        `SELECT c.id,
                sub.title                          AS "subjectTitle",
                tu.name || ' ' || tu.surname       AS "teacherName",
                d.title                            AS "degreeTitle",
                c.cfu,
                c.semester,
                c.academic_year                    AS "academicYear",
                c.max_students                     AS "capacity",
                (SELECT COUNT(*)::int FROM registration r WHERE r.id_course = c.id) AS "enrolled",
                to_char(c.start_date, 'YYYY-MM-DD') AS "startDate",
                to_char(c.end_date, 'YYYY-MM-DD')   AS "endDate",
                EXISTS (
                    SELECT 1 FROM study_plan sp
                     WHERE sp.id_subject = c.id_subject
                       AND sp.id_degree IN (SELECT id_degree FROM matriculation WHERE id_student = $1)
                )                                  AS "inMyPlan",
                EXISTS (
                    SELECT 1 FROM registration r
                     WHERE r.id_course = c.id AND r.id_student = $1
                )                                  AS "alreadyRegistered"
           FROM course c
           JOIN subject sub ON sub.id = c.id_subject
           JOIN degree d    ON d.id = c.id_degree
           JOIN teacher t   ON t.id = c.id_teacher
           JOIN app_user tu ON tu.id = t.id_user
          ORDER BY sub.title`,
        [studentId],
    );

    res.json(result.rows);
}

export async function detail(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const id = courseIdParam(req);
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query(
        `SELECT c.id,
                sub.title                          AS "subjectTitle",
                sub.description                    AS "subjectDescription",
                tu.name || ' ' || tu.surname       AS "teacherName",
                d.title                            AS "degreeTitle",
                c.id_degree                        AS "degreeId",
                c.cfu,
                c.semester,
                c.academic_year                    AS "academicYear",
                c.max_students                     AS "capacity",
                (SELECT COUNT(*)::int FROM registration r WHERE r.id_course = c.id) AS "enrolled",
                to_char(c.start_date, 'YYYY-MM-DD') AS "startDate",
                to_char(c.end_date, 'YYYY-MM-DD')   AS "endDate",
                EXISTS (
                    SELECT 1 FROM study_plan sp
                     WHERE sp.id_subject = c.id_subject
                       AND sp.id_degree IN (SELECT id_degree FROM matriculation WHERE id_student = $2)
                )                                  AS "inMyPlan",
                EXISTS (
                    SELECT 1 FROM registration r
                     WHERE r.id_course = c.id AND r.id_student = $2
                )                                  AS "alreadyRegistered",
                (SELECT m.status FROM matriculation m
                  WHERE m.id_student = $2 AND m.id_degree = c.id_degree
                  LIMIT 1)                         AS "matriculationStatus"
           FROM course c
           JOIN subject sub ON sub.id = c.id_subject
           JOIN degree d    ON d.id = c.id_degree
           JOIN teacher t   ON t.id = c.id_teacher
           JOIN app_user tu ON tu.id = t.id_user
          WHERE c.id = $1`,
        [id, studentId],
    );

    const course = result.rows[0];
    if (!course) throw new AppError(404, 'Corso non trovato');

    res.json(course);
}

export async function examsForCourse(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const id = courseIdParam(req);
    const studentId = await studentIdOf(req.user.sub);

    const result = await db.query(
        `SELECT e.id,
                e.exam_date                        AS "examDate",
                e.location,
                tu.name || ' ' || tu.surname       AS "teacherName",
                (SELECT en.status FROM enrollment en
                  WHERE en.id_exam = e.id AND en.id_student = $2
                  LIMIT 1)                         AS "myStatus"
           FROM exam e
           JOIN teacher t   ON t.id = e.id_teacher
           JOIN app_user tu ON tu.id = t.id_user
          WHERE e.id_course = $1 AND e.exam_date > now()
          ORDER BY e.exam_date ASC`,
        [id, studentId],
    );

    res.json(result.rows);
}

export async function materials(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const id = courseIdParam(req);
    const studentId = await studentIdOf(req.user.sub);

    const registered = await db.query(
        'SELECT 1 FROM registration WHERE id_course = $1 AND id_student = $2',
        [id, studentId],
    );
    if ((registered.rowCount ?? 0) === 0) {
        throw new AppError(403, 'Materiale riservato agli iscritti al corso');
    }

    const result = await db.query(
        `SELECT cw.id,
                cw.title,
                to_char(cw.uploaded_at, 'YYYY-MM-DD') AS "uploadedAt",
                f.original_name                       AS "fileName",
                f.mime_type                           AS "mimeType",
                f.size::text                          AS "size"
           FROM archive a
           JOIN courseware cw ON cw.id_archive = a.id
           JOIN file f        ON f.id = cw.id_file
          WHERE a.id_course = $1
          ORDER BY cw.uploaded_at DESC`,
        [id],
    );

    res.json(result.rows);
}

export async function materialDownload(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const id = courseIdParam(req);
    const coursewareId = Number(req.params.coursewareId);
    if (!Number.isInteger(coursewareId) || coursewareId <= 0) throw new AppError(404, 'Materiale non trovato');
    const studentId = await studentIdOf(req.user.sub);

    const registered = await db.query(
        'SELECT 1 FROM registration WHERE id_course = $1 AND id_student = $2',
        [id, studentId],
    );
    if ((registered.rowCount ?? 0) === 0) {
        throw new AppError(403, 'Materiale riservato agli iscritti al corso');
    }

    const result = await db.query<{ objectKey: string }>(
        `SELECT f.object_key AS "objectKey"
           FROM courseware cw
           JOIN archive a ON a.id = cw.id_archive
           JOIN file f    ON f.id = cw.id_file
          WHERE cw.id = $1 AND a.id_course = $2`,
        [coursewareId, id],
    );
    const objectKey = result.rows[0]?.objectKey;
    if (!objectKey) throw new AppError(404, 'Materiale non trovato');

    const url = await signedUrl(objectKey, 120);
    res.json({ url });
}
