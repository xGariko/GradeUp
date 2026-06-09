import { Pool } from 'pg';
import { env } from '@config/env';

const usesSupabase = env.DATABASE_URL.includes('.supabase.');
const ssl = usesSupabase || env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;

export const db = new Pool({
    connectionString: env.DATABASE_URL,
    ssl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

db.on('error', (err) => {
    console.error('Unexpected DB error', err);
    process.exit(1);
});
