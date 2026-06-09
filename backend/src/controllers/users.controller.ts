import { Request, Response } from 'express';
import { AppError } from '@middleware/error-handler';

export async function list(_req: Request, res: Response): Promise<void> {
    res.json({ users: [] });
}

export async function getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id) throw new AppError(400, 'Invalid ID');
    res.json({ id });
}

export async function create(req: Request, res: Response): Promise<void> {
    res.status(201).json({ created: req.body });
}