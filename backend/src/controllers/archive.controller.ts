import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '@db/client';
import { AppError } from '@middleware/error-handler';
import { uploadObject, removeObject, signedUrl } from '@services/storage.service';

const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'video/mp4',
]);

async function teacherIdOf(userId: number): Promise<number> {
    const result = await db.query<{ id: number }>('SELECT id FROM teacher WHERE id_user = $1', [userId]);
    const id = result.rows[0]?.id;
    if (!id) throw new AppError(404, 'Profilo docente non trovato');
    return id;
}

function courseIdOf(req: Request): number {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(404, 'Corso non trovato');
    return id;
}

async function assertCourseOwner(courseId: number, teacherId: number): Promise<void> {
    const result = await db.query('SELECT 1 FROM course WHERE id = $1 AND id_teacher = $2', [courseId, teacherId]);
    if ((result.rowCount ?? 0) === 0) throw new AppError(404, 'Corso non trovato');
}

// courseware appartiene a un corso del docente: ritorna object_key e file id per le operazioni puntuali
async function ownedCourseware(coursewareId: number, teacherId: number): Promise<{ fileId: number; objectKey: string }> {
    const result = await db.query<{ fileId: number; objectKey: string }>(
        `SELECT f.id AS "fileId", f.object_key AS "objectKey"
           FROM courseware cw
           JOIN archive a ON a.id = cw.id_archive
           JOIN course c  ON c.id = a.id_course
           JOIN file f    ON f.id = cw.id_file
          WHERE cw.id = $1 AND c.id_teacher = $2`,
        [coursewareId, teacherId],
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'Materiale non trovato');
    return row;
}

export async function list(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const courseId = courseIdOf(req);

    const course = await db.query<{ title: string }>(
        `SELECT sub.title
           FROM course c JOIN subject sub ON sub.id = c.id_subject
          WHERE c.id = $1 AND c.id_teacher = $2`,
        [courseId, teacherId],
    );
    if (!course.rows[0]) throw new AppError(404, 'Corso non trovato');

    const result = await db.query(
        `SELECT cw.id,
                cw.title,
                cw.description,
                cw.uploaded_at             AS "uploadedAt",
                u.name || ' ' || u.surname AS "uploadedBy",
                f.original_name            AS "originalName",
                f.mime_type                AS "mimeType",
                f.size::text               AS "size"
           FROM archive a
           JOIN courseware cw ON cw.id_archive = a.id
           JOIN file f        ON f.id = cw.id_file
           JOIN app_user u    ON u.id = cw.uploaded_by
          WHERE a.id_course = $1
          ORDER BY cw.uploaded_at DESC NULLS LAST, cw.id DESC`,
        [courseId],
    );

    res.json({ courseTitle: course.rows[0].title, items: result.rows });
}

export async function upload(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const courseId = courseIdOf(req);
    await assertCourseOwner(courseId, teacherId);

    const file = req.file;
    if (!file) throw new AppError(400, 'Nessun file ricevuto');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new AppError(415, 'Tipo di file non ammesso');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `course-${courseId}/${randomUUID()}-${safeName}`;
    const title = file.originalname.replace(/\.[^.]+$/, '') || file.originalname;

    await uploadObject(objectKey, file.buffer, file.mimetype);

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const existingArchive = await client.query<{ id: number }>(
            'SELECT id FROM archive WHERE id_course = $1 LIMIT 1',
            [courseId],
        );
        let archiveId = existingArchive.rows[0]?.id;
        if (!archiveId) {
            const created = await client.query<{ id: number }>(
                'INSERT INTO archive (id_course, last_updated) VALUES ($1, now()) RETURNING id',
                [courseId],
            );
            archiveId = created.rows[0].id;
        } else {
            await client.query('UPDATE archive SET last_updated = now() WHERE id = $1', [archiveId]);
        }

        const fileResult = await client.query<{ id: number }>(
            `INSERT INTO file (bucket_name, object_key, original_name, mime_type, size)
             VALUES ('courseware', $1, $2, $3, $4) RETURNING id`,
            [objectKey, file.originalname, file.mimetype, file.size],
        );
        const fileId = fileResult.rows[0].id;

        const coursewareResult = await client.query<{ id: number }>(
            `INSERT INTO courseware (id_archive, id_file, uploaded_by, uploaded_at, title)
             VALUES ($1, $2, $3, now(), $4) RETURNING id`,
            [archiveId, fileId, req.user.sub, title],
        );

        await client.query('COMMIT');
        res.status(201).json({ id: coursewareResult.rows[0].id });
    } catch (err) {
        await client.query('ROLLBACK');
        await removeObject(objectKey);
        throw err;
    } finally {
        client.release();
    }
}

export async function rename(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const coursewareId = Number(req.params.id);
    if (!Number.isInteger(coursewareId) || coursewareId <= 0) throw new AppError(404, 'Materiale non trovato');

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title || title.length > 200) throw new AppError(400, 'Titolo non valido (1-200 caratteri)');

    await ownedCourseware(coursewareId, teacherId);
    await db.query('UPDATE courseware SET title = $1 WHERE id = $2', [title, coursewareId]);

    res.json({ ok: true });
}

export async function remove(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const coursewareId = Number(req.params.id);
    if (!Number.isInteger(coursewareId) || coursewareId <= 0) throw new AppError(404, 'Materiale non trovato');

    const { fileId, objectKey } = await ownedCourseware(coursewareId, teacherId);

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM courseware WHERE id = $1', [coursewareId]);
        await client.query('DELETE FROM file WHERE id = $1', [fileId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    await removeObject(objectKey);
    res.json({ ok: true });
}

export async function download(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const teacherId = await teacherIdOf(req.user.sub);
    const coursewareId = Number(req.params.id);
    if (!Number.isInteger(coursewareId) || coursewareId <= 0) throw new AppError(404, 'Materiale non trovato');

    const { objectKey } = await ownedCourseware(coursewareId, teacherId);
    const url = await signedUrl(objectKey, 120);

    res.json({ url });
}
