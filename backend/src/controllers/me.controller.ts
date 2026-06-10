import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '@db/client';
import { AppError } from '@middleware/error-handler';
import { UpdateProfileDtoSchema, ChangePasswordDtoSchema } from '@shared/types/me';

interface DbUser {
    id: number;
    name: string;
    surname: string;
    birthdate: Date;
    taxcode: string;
    mobile: string | null;
    email: string;
    propic: number | null;
    is_active: boolean;
}

export async function getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const result = await db.query<DbUser>(
        `SELECT id, name, surname, birthdate, taxcode, mobile, email, propic, is_active
         FROM app_user WHERE id = $1`,
        [req.user.sub],
    );
    const user = result.rows[0];
    if (!user) throw new AppError(404, 'Utente non trovato');

    res.json({ user, role: req.user.role });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const dto = UpdateProfileDtoSchema.parse(req.body);

    const result = await db.query<DbUser>(
        `UPDATE app_user
            SET name = $1, surname = $2, mobile = $3
          WHERE id = $4
          RETURNING id, name, surname, birthdate, taxcode, mobile, email, propic, is_active`,
        [dto.name, dto.surname, dto.mobile ?? null, req.user.sub],
    );
    const user = result.rows[0];
    if (!user) throw new AppError(404, 'Utente non trovato');

    res.json({ user, role: req.user.role });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const dto = ChangePasswordDtoSchema.parse(req.body);

    const result = await db.query<{ password: string }>(
        'SELECT password FROM app_user WHERE id = $1',
        [req.user.sub],
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'Utente non trovato');

    const valid = await bcrypt.compare(dto.currentPassword, row.password);
    if (!valid) throw new AppError(400, 'Password attuale errata');

    if (dto.currentPassword === dto.newPassword) {
        throw new AppError(400, 'La nuova password deve essere diversa');
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await db.query('UPDATE app_user SET password = $1 WHERE id = $2', [hash, req.user.sub]);

    res.json({ ok: true });
}

async function studentIdOf(userId: number): Promise<number> {
    const result = await db.query<{ id: number }>(
        'SELECT id FROM student WHERE id_user = $1',
        [userId],
    );
    const studentId = result.rows[0]?.id;
    if (!studentId) throw new AppError(404, 'Profilo studente non trovato');
    return studentId;
}

export async function createMatriculation(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const idDegree = Number((req.body ?? {}).id_degree);
    if (!Number.isInteger(idDegree) || idDegree <= 0) {
        throw new AppError(400, 'Corso di laurea non valido');
    }

    const studentResult = await db.query<{ id: number }>(
        'SELECT id FROM student WHERE id_user = $1',
        [req.user.sub],
    );
    const studentId = studentResult.rows[0]?.id;
    if (!studentId) throw new AppError(404, 'Profilo studente non trovato');

    const degreeResult = await db.query(
        'SELECT id FROM degree WHERE id = $1',
        [idDegree],
    );
    if ((degreeResult.rowCount ?? 0) === 0) throw new AppError(404, 'Corso di laurea non trovato');

    const existing = await db.query(
        `SELECT 1 FROM matriculation WHERE id_student = $1 AND status IN ('active', 'pending') LIMIT 1`,
        [studentId],
    );
    if ((existing.rowCount ?? 0) > 0) throw new AppError(409, 'Risulti gia immatricolato');

    const codeResult = await db.query<{ code: number }>(
        `SELECT COALESCE(MAX(matriculation_code), 202500000) + 1 AS code FROM matriculation`,
    );
    const code = codeResult.rows[0].code;

    const inserted = await db.query(
        `INSERT INTO matriculation (id_student, id_degree, status, matriculation_code, matriculation_date)
         VALUES ($1, $2, 'active', $3, CURRENT_DATE)
         RETURNING id_student, id_degree, status, matriculation_code, matriculation_date`,
        [studentId, idDegree, code],
    );

    res.status(201).json(inserted.rows[0]);
}

export async function createRegistration(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const idCourse = Number((req.body ?? {}).id_course);
    if (!Number.isInteger(idCourse) || idCourse <= 0) {
        throw new AppError(400, 'Corso non valido');
    }

    const studentId = await studentIdOf(req.user.sub);

    const courseResult = await db.query<{ id_degree: number; max_students: number | null }>(
        'SELECT id_degree, max_students FROM course WHERE id = $1',
        [idCourse],
    );
    const course = courseResult.rows[0];
    if (!course) throw new AppError(404, 'Corso non trovato');

    const matriculation = await db.query(
        `SELECT 1 FROM matriculation
          WHERE id_student = $1 AND id_degree = $2 AND status = 'active' LIMIT 1`,
        [studentId, course.id_degree],
    );
    if ((matriculation.rowCount ?? 0) === 0) {
        throw new AppError(403, 'Immatricolazione non attiva per questo corso di laurea');
    }

    const existing = await db.query(
        'SELECT 1 FROM registration WHERE id_course = $1 AND id_student = $2',
        [idCourse, studentId],
    );
    if ((existing.rowCount ?? 0) > 0) {
        throw new AppError(409, 'Risulti gia iscritto a questo corso');
    }

    if (course.max_students != null) {
        const count = await db.query<{ enrolled: number }>(
            'SELECT COUNT(*)::int AS enrolled FROM registration WHERE id_course = $1',
            [idCourse],
        );
        if (count.rows[0].enrolled >= course.max_students) {
            throw new AppError(409, 'Posti esauriti');
        }
    }

    await db.query(
        'INSERT INTO registration (id_course, id_student, registration_date) VALUES ($1, $2, CURRENT_DATE)',
        [idCourse, studentId],
    );

    res.status(201).json({ ok: true });
}

export async function deleteRegistration(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const idCourse = Number(req.params.courseId);
    if (!Number.isInteger(idCourse) || idCourse <= 0) {
        throw new AppError(400, 'Corso non valido');
    }

    const studentId = await studentIdOf(req.user.sub);

    // La disiscrizione ritira anche le prenotazioni agli appelli ancora in programma del corso.
    await db.query(
        `DELETE FROM enrollment
          WHERE id_student = $1 AND status = 'scheduled'
            AND id_exam IN (SELECT id FROM exam WHERE id_course = $2)`,
        [studentId, idCourse],
    );

    const deleted = await db.query(
        'DELETE FROM registration WHERE id_course = $1 AND id_student = $2',
        [idCourse, studentId],
    );
    if ((deleted.rowCount ?? 0) === 0) throw new AppError(404, 'Iscrizione non trovata');

    res.json({ ok: true });
}

export async function createEnrollment(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const idExam = Number((req.body ?? {}).id_exam);
    if (!Number.isInteger(idExam) || idExam <= 0) {
        throw new AppError(400, 'Appello non valido');
    }

    const studentId = await studentIdOf(req.user.sub);

    const examResult = await db.query<{ id_course: number; future: boolean }>(
        'SELECT id_course, (exam_date > now()) AS future FROM exam WHERE id = $1',
        [idExam],
    );
    const exam = examResult.rows[0];
    if (!exam) throw new AppError(404, 'Appello non trovato');

    const registered = await db.query(
        'SELECT 1 FROM registration WHERE id_course = $1 AND id_student = $2',
        [exam.id_course, studentId],
    );
    if ((registered.rowCount ?? 0) === 0) {
        throw new AppError(403, 'Devi prima iscriverti al corso');
    }

    if (!exam.future) throw new AppError(409, 'Appello chiuso');

    const already = await db.query(
        `SELECT 1 FROM enrollment WHERE id_exam = $1 AND id_student = $2 AND status = 'scheduled'`,
        [idExam, studentId],
    );
    if ((already.rowCount ?? 0) > 0) {
        throw new AppError(409, 'Sei gia prenotato a questo appello');
    }

    await db.query(
        `INSERT INTO enrollment (id_exam, id_student, status, enrollment_date)
         VALUES ($1, $2, 'scheduled', CURRENT_DATE)`,
        [idExam, studentId],
    );

    res.status(201).json({ ok: true });
}

export async function withdrawEnrollment(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const idEnrollment = Number(req.params.id);
    if (!Number.isInteger(idEnrollment) || idEnrollment <= 0) {
        throw new AppError(400, 'Prenotazione non valida');
    }

    const studentId = await studentIdOf(req.user.sub);

    const updated = await db.query(
        `UPDATE enrollment
            SET status = 'withdrawn', withdrawal_date = CURRENT_DATE
          WHERE id = $1 AND id_student = $2 AND status = 'scheduled'`,
        [idEnrollment, studentId],
    );
    if ((updated.rowCount ?? 0) === 0) throw new AppError(404, 'Prenotazione non trovata');

    res.json({ ok: true });
}
