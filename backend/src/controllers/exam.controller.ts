import { Request, Response } from 'express';
import { db } from '@db/client';
import { AppError } from '@middleware/error-handler';

async function teacherIdOf(userId: number): Promise<number> {
    const result = await db.query<{ id: number }>('SELECT id FROM teacher WHERE id_user = $1', [userId]);
    const id = result.rows[0]?.id;
    if (!id) throw new AppError(404, 'Profilo docente non trovato');
    return id;
}

function intParam(value: string | string[], notFoundMsg: string): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(404, notFoundMsg);
    return id;
}

// esame di un corso del docente: ritorna l'id o 404
async function ownedExamId(examId: number, teacherId: number): Promise<number> {
    const result = await db.query(
        `SELECT ex.id
           FROM exam ex
           JOIN course c ON c.id = ex.id_course
          WHERE ex.id = $1 AND c.id_teacher = $2`,
        [examId, teacherId],
    );
    if ((result.rowCount ?? 0) === 0) throw new AppError(404, 'Appello non trovato');
    return examId;
}

function statusOf(future: boolean, scheduledCount: number): 'in_programma' | 'da_verbalizzare' | 'verbalizzato' {
    if (future) return 'in_programma';
    return scheduledCount > 0 ? 'da_verbalizzare' : 'verbalizzato';
}

function validatedExamInput(body: unknown): { examDate: Date; location: string } {
    const data = body as { examDate?: unknown; location?: unknown };
    const location = typeof data.location === 'string' ? data.location.trim() : '';
    if (location.length < 2) throw new AppError(400, 'Sede obbligatoria (min 2 caratteri)');
    if (typeof data.examDate !== 'string') throw new AppError(400, 'Data obbligatoria');
    const examDate = new Date(data.examDate);
    if (Number.isNaN(examDate.getTime())) throw new AppError(400, 'Data non valida');
    return { examDate, location };
}

export async function listForCourse(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const courseId = intParam(req.params.id, 'Corso non trovato');

    const course = await db.query<{ title: string }>(
        `SELECT sub.title
           FROM course c JOIN subject sub ON sub.id = c.id_subject
          WHERE c.id = $1 AND c.id_teacher = $2`,
        [courseId, teacherId],
    );
    if (!course.rows[0]) throw new AppError(404, 'Corso non trovato');

    const result = await db.query<{
        id: number;
        examDate: string;
        location: string | null;
        future: boolean;
        enrolled: number;
        scheduledCount: number;
    }>(
        `SELECT ex.id,
                ex.exam_date     AS "examDate",
                ex.location      AS "location",
                (ex.exam_date > now()) AS "future",
                (SELECT COUNT(*)::int FROM enrollment en WHERE en.id_exam = ex.id) AS "enrolled",
                (SELECT COUNT(*)::int FROM enrollment en WHERE en.id_exam = ex.id AND en.status = 'scheduled') AS "scheduledCount"
           FROM exam ex
          WHERE ex.id_course = $1
          ORDER BY ex.exam_date DESC`,
        [courseId],
    );

    const items = result.rows.map(r => ({ ...r, status: statusOf(r.future, r.scheduledCount) }));
    res.json({ courseTitle: course.rows[0].title, items });
}

export async function create(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const courseId = intParam(req.params.id, 'Corso non trovato');

    const owner = await db.query(
        'SELECT 1 FROM course WHERE id = $1 AND id_teacher = $2',
        [courseId, teacherId],
    );
    if ((owner.rowCount ?? 0) === 0) throw new AppError(404, 'Corso non trovato');

    const { examDate, location } = validatedExamInput(req.body);
    if (examDate.getTime() <= Date.now()) throw new AppError(400, 'La data deve essere futura');

    const result = await db.query<{ id: number }>(
        `INSERT INTO exam (id_course, id_teacher, location, exam_date)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [courseId, teacherId, location, examDate.toISOString()],
    );

    res.status(201).json({ id: result.rows[0].id });
}

export async function update(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const examId = intParam(req.params.id, 'Appello non trovato');
    await ownedExamId(examId, teacherId);

    const scheduled = await db.query(
        `SELECT 1 FROM enrollment WHERE id_exam = $1 AND status = 'scheduled' LIMIT 1`,
        [examId],
    );
    if ((scheduled.rowCount ?? 0) > 0) {
        throw new AppError(409, 'Appello con studenti prenotati: non modificabile');
    }

    const { examDate, location } = validatedExamInput(req.body);
    await db.query(
        'UPDATE exam SET exam_date = $1, location = $2 WHERE id = $3',
        [examDate.toISOString(), location, examId],
    );

    res.json({ ok: true });
}

export async function cancel(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const examId = intParam(req.params.id, 'Appello non trovato');
    await ownedExamId(examId, teacherId);

    const graded = await db.query(
        `SELECT 1 FROM enrollment WHERE id_exam = $1 AND status IN ('passed', 'failed', 'absent') LIMIT 1`,
        [examId],
    );
    if ((graded.rowCount ?? 0) > 0) {
        throw new AppError(409, 'Appello già verbalizzato: non annullabile');
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM enrollment WHERE id_exam = $1', [examId]);
        await client.query('DELETE FROM exam WHERE id = $1', [examId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    res.json({ ok: true });
}

// --- Verbalizzazione ---

type FinalStatus = 'passed' | 'failed' | 'absent' | 'withdrawn';
const FINAL_STATUSES: readonly FinalStatus[] = ['passed', 'failed', 'absent', 'withdrawn'];

interface GradingItem {
    enrollmentId: number;
    status: FinalStatus;
    grade: number | null;
}

function isFinalStatus(value: unknown): value is FinalStatus {
    return typeof value === 'string' && (FINAL_STATUSES as readonly string[]).includes(value);
}

function validatedGradingItems(body: unknown): GradingItem[] {
    const items = (body as { items?: unknown }).items;
    if (!Array.isArray(items) || items.length === 0) {
        throw new AppError(400, 'Nessuna riga da verbalizzare');
    }

    return items.map((raw): GradingItem => {
        const row = raw as { enrollmentId?: unknown; status?: unknown; grade?: unknown };
        const enrollmentId = Number(row.enrollmentId);
        if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
            throw new AppError(400, 'Riga non valida: iscrizione mancante');
        }
        if (!isFinalStatus(row.status)) {
            throw new AppError(400, 'Stato non valido');
        }
        if (row.status === 'passed') {
            const grade = Number(row.grade);
            if (!Number.isInteger(grade) || grade < 18 || grade > 30) {
                throw new AppError(400, 'Voto obbligatorio e compreso tra 18 e 30 per gli esiti superati');
            }
            return { enrollmentId, status: 'passed', grade };
        }
        return { enrollmentId, status: row.status, grade: null };
    });
}

export async function grading(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const examId = intParam(req.params.id, 'Appello non trovato');

    const header = await db.query<{
        id: number;
        examDate: string;
        location: string | null;
        courseId: number;
        courseTitle: string;
        degreeId: number;
    }>(
        `SELECT ex.id,
                ex.exam_date  AS "examDate",
                ex.location   AS "location",
                c.id          AS "courseId",
                sub.title     AS "courseTitle",
                c.id_degree   AS "degreeId"
           FROM exam ex
           JOIN course c    ON c.id = ex.id_course AND c.id_teacher = $2
           JOIN subject sub ON sub.id = c.id_subject
          WHERE ex.id = $1`,
        [examId, teacherId],
    );
    const exam = header.rows[0];
    if (!exam) throw new AppError(404, 'Appello non trovato');

    const rows = await db.query<{
        enrollmentId: number;
        studentId: number;
        surname: string;
        name: string;
        matriculationCode: number | null;
        status: string;
        grade: number | null;
    }>(
        `SELECT en.id                 AS "enrollmentId",
                s.id                  AS "studentId",
                u.surname             AS "surname",
                u.name                AS "name",
                m.matriculation_code  AS "matriculationCode",
                en.status             AS "status",
                en.grade              AS "grade"
           FROM enrollment en
           JOIN student s   ON s.id = en.id_student
           JOIN app_user u  ON u.id = s.id_user
           LEFT JOIN matriculation m ON m.id_student = s.id AND m.id_degree = $2
          WHERE en.id_exam = $1
          ORDER BY u.surname ASC, u.name ASC`,
        [examId, exam.degreeId],
    );

    const pendingCount = rows.rows.filter(r => r.status === 'scheduled').length;
    const enrolledCount = rows.rows.length;

    res.json({
        exam: {
            id: exam.id,
            courseId: exam.courseId,
            courseTitle: exam.courseTitle,
            examDate: exam.examDate,
            location: exam.location,
            enrolledCount,
            gradedCount: enrolledCount - pendingCount,
            pendingCount,
            allGraded: enrolledCount > 0 && pendingCount === 0,
        },
        rows: rows.rows,
    });
}

export async function saveGrading(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const examId = intParam(req.params.id, 'Appello non trovato');
    await ownedExamId(examId, teacherId);

    const items = validatedGradingItems(req.body);

    const scheduled = await db.query<{ id: number }>(
        `SELECT id FROM enrollment WHERE id_exam = $1 AND status = 'scheduled'`,
        [examId],
    );
    const editable = new Set(scheduled.rows.map(r => r.id));
    for (const item of items) {
        if (!editable.has(item.enrollmentId)) {
            throw new AppError(409, 'Una o più iscrizioni sono già verbalizzate o non appartengono a questo appello');
        }
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        for (const item of items) {
            await client.query(
                `UPDATE enrollment SET status = $1, grade = $2
                  WHERE id = $3 AND id_exam = $4 AND status = 'scheduled'`,
                [item.status, item.grade, item.enrollmentId, examId],
            );
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    res.json({ ok: true, updated: items.length });
}
