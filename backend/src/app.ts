import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from '@config/env';
import { errorHandler } from '@middleware/error-handler';
import usersRouter from '@routes/users.routes';
import authRouter from '@routes/auth.routes';
import meRouter from '@routes/me.routes';
import notificationsRouter from '@routes/notifications.routes';
import degreesRouter from '@routes/degrees.routes';
import coursesRouter from '@routes/courses.routes';

const app: Application = express();

app.use(helmet());
app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'production') {
    app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
}

app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',          authRouter);
app.use('/api/users',         usersRouter);
app.use('/api/me',            meRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/degrees',       degreesRouter);
app.use('/api/courses',       coursesRouter);

app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
    console.log(`🚀 API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;