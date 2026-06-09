import { z } from 'zod';

export const FileSchema = z.object({
    id:            z.number().int().positive(),
    bucket_name:   z.string().max(255),
    object_key:    z.string().max(255),
    original_name: z.string().max(255).nullable(),
    mime_type:     z.string().max(100).nullable(),
    size:          z.number().nonnegative().nullable(),
    checksum:      z.string().max(64).nullable(),
});

export type File = z.infer<typeof FileSchema>;
