import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { AppError } from '@middleware/error-handler';
import type { UserRole } from '@shared/types/auth';

export interface JwtPayload {
    sub: number;
    role: UserRole;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        next(new AppError(401, 'Unauthorized'));
        return;
    }
    try {
        const payload = jwt.verify(auth.slice(7), env.JWT_SECRET) as unknown as JwtPayload;
        req.user = payload;
        next();
    } catch {
        next(new AppError(401, 'Token non valido'));
    }
}

export function requireRole(role: 'student' | 'teacher') {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError(401, 'Unauthorized'));
            return;
        }
        if (req.user.role !== role) {
            next(new AppError(403, 'Forbidden'));
            return;
        }
        next();
    };
}
