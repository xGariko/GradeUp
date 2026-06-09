import { Request, Response } from 'express';
import { db } from '@db/client';

export async function list(_req: Request, res: Response): Promise<void> {
    const result = await db.query(
        `SELECT id, type, department, title, description, duration
           FROM degree
          ORDER BY title`,
    );
    res.json(result.rows);
}
