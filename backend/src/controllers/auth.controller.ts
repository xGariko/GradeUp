import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@db/client';
import { env } from '@config/env';
import { AppError } from '@middleware/error-handler';
import { RegisterStudentDtoSchema, LoginDtoSchema } from '@shared/types/auth';

interface DbUser {
    id: number;
    name: string;
    surname: string;
    birthdate: Date;
    taxcode: string;
    mobile: string | null;
    email: string;
    password: string;
    propic: number | null;
    is_active: boolean;
}

type DbUserPublic = Omit<DbUser, 'password'>;

export async function register(req: Request, res: Response): Promise<void> {
    const dto = RegisterStudentDtoSchema.parse(req.body);

    const existing = await db.query<{ id: number }>(
        'SELECT id FROM app_user WHERE email = $1',
        [dto.email],
    );
    if ((existing.rowCount ?? 0) > 0) {
        throw new AppError(409, 'Email già registrata');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const userResult = await db.query<DbUserPublic>(
        `INSERT INTO app_user (name, surname, birthdate, taxcode, mobile, email, password, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id, name, surname, birthdate, taxcode, mobile, email, propic, is_active`,
        [dto.name, dto.surname, dto.birthdate, dto.taxcode, dto.mobile ?? null, dto.email, hash],
    );
    const user = userResult.rows[0];

    await db.query(
        `INSERT INTO student (id_user, status) VALUES ($1, 'active')`,
        [user.id],
    );

    const token = jwt.sign({ sub: user.id, role: 'student' }, env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user, role: 'student' });
}

export async function login(req: Request, res: Response): Promise<void> {
    const dto = LoginDtoSchema.parse(req.body);

    const userResult = await db.query<DbUser>(
        `SELECT id, name, surname, birthdate, taxcode, mobile, email, password, propic, is_active
         FROM app_user WHERE email = $1 AND is_active = true`,
        [dto.email],
    );
    const user = userResult.rows[0];
    if (!user) throw new AppError(401, 'Credenziali non valide');

    const { password: storedHash, ...userPublic } = user;
    const valid = await bcrypt.compare(dto.password, storedHash);
    if (!valid) throw new AppError(401, 'Credenziali non valide');

    const studentResult = await db.query<{ id: number }>(
        'SELECT id FROM student WHERE id_user = $1',
        [user.id],
    );
    const teacherResult = await db.query<{ id: number }>(
        'SELECT id FROM teacher WHERE id_user = $1',
        [user.id],
    );

    let role: 'student' | 'teacher';
    if ((studentResult.rowCount ?? 0) > 0) {
        role = 'student';
    } else if ((teacherResult.rowCount ?? 0) > 0) {
        role = 'teacher';
    } else {
        throw new AppError(403, 'Nessun ruolo assegnato');
    }

    const token = jwt.sign({ sub: user.id, role }, env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: userPublic, role });
}

// Recupero password: l'invio email non e' wired (gap infrastrutturale).
// Risposta neutra per non rivelare l'esistenza di un account.
export async function forgotPassword(_req: Request, res: Response): Promise<void> {
    res.json({ ok: true });
}

export async function resetPassword(_req: Request, _res: Response): Promise<void> {
    throw new AppError(400, 'Token non valido o scaduto');
}
