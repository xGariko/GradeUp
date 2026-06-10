import dotenv from 'dotenv';

dotenv.config();

interface Env {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
}

function getEnv(key: string, required = true): string {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value ?? '';
}

export const env: Env = {
    NODE_ENV: (process.env.NODE_ENV as Env['NODE_ENV']) ?? 'development',
    PORT: parseInt(getEnv('PORT', false) || '3000', 10),
    DATABASE_URL: getEnv('DATABASE_URL'),
    JWT_SECRET: getEnv('JWT_SECRET'),
    SUPABASE_URL: getEnv('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
};