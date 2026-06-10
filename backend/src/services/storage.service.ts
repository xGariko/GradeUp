import { createClient } from '@supabase/supabase-js';
import { env } from '@config/env';
import { AppError } from '@middleware/error-handler';

export const COURSEWARE_BUCKET = 'courseware';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

export async function uploadObject(objectKey: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await supabase.storage
        .from(COURSEWARE_BUCKET)
        .upload(objectKey, body, { contentType, upsert: false });
    if (error) throw new AppError(502, `Upload su storage non riuscito: ${error.message}`);
}

export async function removeObject(objectKey: string): Promise<void> {
    const { error } = await supabase.storage.from(COURSEWARE_BUCKET).remove([objectKey]);
    if (error) throw new AppError(502, `Rimozione da storage non riuscita: ${error.message}`);
}

export async function signedUrl(objectKey: string, expiresInSeconds = 60): Promise<string> {
    const { data, error } = await supabase.storage
        .from(COURSEWARE_BUCKET)
        .createSignedUrl(objectKey, expiresInSeconds);
    if (error || !data) throw new AppError(502, `Generazione link non riuscita: ${error?.message ?? 'sconosciuto'}`);
    return data.signedUrl;
}
