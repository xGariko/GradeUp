import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        message: string,
        public isOperational = true,
        public details?: Array<{ path: string; message: string }>
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            ...(err.details && { details: err.details }),
        });
        return;
    }

    // Catch-all per ZodError che sfuggono al middleware (es. validazione manuale)
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation failed',
            details: err.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
            })),
        });
        return;
    }

    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
}