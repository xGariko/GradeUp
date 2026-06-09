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
