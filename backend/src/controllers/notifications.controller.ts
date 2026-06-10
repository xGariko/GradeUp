import { Request, Response } from 'express';
import { db } from '@db/client';
import { AppError } from '@middleware/error-handler';
import type { NotificationItem } from '@shared/types/dashboard';

export async function listMine(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const result = await db.query<NotificationItem>(
        `SELECT id,
                title,
                body,
                created_at AS "createdAt",
                is_read    AS "read",
                severity
           FROM notification
          WHERE id_user = $1
          ORDER BY created_at DESC`,
        [req.user.sub],
    );

    res.json(result.rows);
}

export async function markRead(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Id non valido');

    const result = await db.query(
        'UPDATE notification SET is_read = true WHERE id = $1 AND id_user = $2',
        [id, req.user.sub],
    );
    if (result.rowCount === 0) throw new AppError(404, 'Notifica non trovata');

    res.json({ ok: true });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError(401, 'Unauthorized');

    const result = await db.query(
        'UPDATE notification SET is_read = true WHERE id_user = $1 AND is_read = false',
        [req.user.sub],
    );

    res.json({ ok: true, updated: result.rowCount ?? 0 });
}
