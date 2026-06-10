import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { TeacherCoursesService, CourseArchive, CoursewareItem } from '$core/services/teacher-courses.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

interface UploadItem {
    tempId:   number;
    name:     string;
    size:     number;
    progress: number;
    status:   UploadStatus;
    error:    string | null;
    file:     File;
}

const MAX_SIZE = 100 * 1024 * 1024;
const MAX_PARALLEL = 3;

const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain',
    'video/mp4',
]);

interface FileKind {
    icon:     string;
    label:    string;
    category: string;
}

function kindOf(mime: string): FileKind {
    if (mime === 'application/pdf')   return { icon: 'file-earmark-pdf',         label: 'PDF',        category: 'pdf' };
    if (mime.startsWith('image/'))    return { icon: 'file-earmark-image',       label: 'Immagine',   category: 'image' };
    if (mime.startsWith('video/'))    return { icon: 'file-earmark-play',        label: 'Video',      category: 'video' };
    if (mime === 'application/zip')   return { icon: 'file-earmark-zip',         label: 'Archivio',   category: 'archive' };
    if (mime.includes('spreadsheet') || mime.includes('ms-excel'))
                                      return { icon: 'file-earmark-spreadsheet', label: 'Foglio',     category: 'document' };
    if (mime.includes('presentation') || mime.includes('powerpoint'))
                                      return { icon: 'file-earmark-slides',      label: 'Slide',      category: 'document' };
    if (mime.includes('word') || mime === 'text/plain')
                                      return { icon: 'file-earmark-text',        label: 'Documento',  category: 'document' };
    return { icon: 'file-earmark', label: 'File', category: 'other' };
}

@Component({
    selector: 'app-teacher-archive',
    imports: [DatePipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './archive.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherArchivePage {
    private readonly service = inject(TeacherCoursesService);
    private readonly route   = inject(ActivatedRoute);

    protected readonly courseId = Number(this.route.snapshot.paramMap.get('id'));

    protected readonly archive  = signal<AsyncState<CourseArchive>>(initial());
    protected readonly notFound = signal(false);

    protected readonly uploads  = signal<UploadItem[]>([]);
    protected readonly dragging = signal(false);

    protected readonly q          = signal('');
    protected readonly category   = signal('');
    protected readonly editingId  = signal<number | null>(null);
    protected readonly editTitle  = signal('');
    protected readonly confirmId  = signal<number | null>(null);

    private uploadSeq = 0;

    protected readonly items = computed(() => this.archive().data?.items ?? []);

    protected readonly totalSize = computed(() =>
        this.items().reduce((sum, it) => sum + Number(it.size), 0),
    );

    protected readonly filtered = computed(() => {
        const list = this.items();
        const q = this.q().trim().toLowerCase();
        const cat = this.category();
        return list.filter(it =>
            (!cat || kindOf(it.mimeType).category === cat) &&
            (!q || it.title.toLowerCase().includes(q) || it.originalName.toLowerCase().includes(q)),
        );
    });

    constructor() {
        this.load();
    }

    protected load(): void {
        if (!Number.isInteger(this.courseId) || this.courseId <= 0) {
            this.notFound.set(true);
            this.archive.set({ loading: false, data: null, error: null });
            return;
        }
        this.archive.set(initial());
        this.notFound.set(false);
        this.service.materials(this.courseId).subscribe({
            next: data => this.archive.set({ loading: false, data, error: null }),
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.notFound.set(true);
                    this.archive.set({ loading: false, data: null, error: null });
                } else {
                    this.archive.set({ loading: false, data: null, error: 'Impossibile caricare il materiale.' });
                }
            },
        });
    }

    // --- selezione e drag-drop ---

    protected onPick(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) this.enqueue(input.files);
        input.value = '';
    }

    protected onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(true);
    }
    protected onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(false);
    }
    protected onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragging.set(false);
        if (event.dataTransfer?.files) this.enqueue(event.dataTransfer.files);
    }

    private enqueue(files: FileList): void {
        const next: UploadItem[] = [];
        for (const file of Array.from(files)) {
            const base: UploadItem = {
                tempId: ++this.uploadSeq,
                name: file.name,
                size: file.size,
                progress: 0,
                status: 'queued',
                error: null,
                file,
            };
            if (file.size > MAX_SIZE) {
                next.push({ ...base, status: 'error', error: 'File troppo grande (max 100 MB)' });
            } else if (!ALLOWED_MIME.has(file.type)) {
                next.push({ ...base, status: 'error', error: 'Tipo di file non ammesso' });
            } else {
                next.push(base);
            }
        }
        this.uploads.update(list => [...list, ...next]);
        this.pump();
    }

    private pump(): void {
        const list = this.uploads();
        let slots = MAX_PARALLEL - list.filter(u => u.status === 'uploading').length;
        for (const item of list) {
            if (slots <= 0) break;
            if (item.status === 'queued') {
                this.startUpload(item);
                slots--;
            }
        }
    }

    private startUpload(item: UploadItem): void {
        this.patchUpload(item.tempId, { status: 'uploading', progress: 0, error: null });
        this.service.uploadMaterial(this.courseId, item.file).subscribe({
            next: event => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    this.patchUpload(item.tempId, { progress: Math.round((100 * event.loaded) / event.total) });
                } else if (event.type === HttpEventType.Response) {
                    this.removeUpload(item.tempId);
                    this.load();
                    this.pump();
                }
            },
            error: (err: unknown) => {
                this.patchUpload(item.tempId, { status: 'error', error: this.errorMessage(err) });
                this.pump();
            },
        });
    }

    protected retry(item: UploadItem): void {
        this.patchUpload(item.tempId, { status: 'queued', progress: 0, error: null });
        this.pump();
    }

    protected dismissUpload(tempId: number): void {
        this.removeUpload(tempId);
    }

    private patchUpload(tempId: number, patch: Partial<UploadItem>): void {
        this.uploads.update(list => list.map(u => (u.tempId === tempId ? { ...u, ...patch } : u)));
    }
    private removeUpload(tempId: number): void {
        this.uploads.update(list => list.filter(u => u.tempId !== tempId));
    }

    // --- rinomina inline ---

    protected startRename(item: CoursewareItem): void {
        this.editingId.set(item.id);
        this.editTitle.set(item.title);
    }
    protected onEditInput(event: Event): void {
        this.editTitle.set((event.target as HTMLInputElement).value);
    }
    protected cancelRename(): void {
        this.editingId.set(null);
        this.editTitle.set('');
    }
    protected saveRename(item: CoursewareItem): void {
        const title = this.editTitle().trim();
        if (!title || title === item.title) {
            this.cancelRename();
            return;
        }
        this.service.renameMaterial(item.id, title).subscribe({
            next: () => { this.cancelRename(); this.load(); },
            error: () => this.cancelRename(),
        });
    }

    // --- elimina con conferma inline ---

    protected askDelete(id: number): void {
        this.confirmId.set(id);
    }
    protected cancelDelete(): void {
        this.confirmId.set(null);
    }
    protected confirmDelete(item: CoursewareItem): void {
        this.service.removeMaterial(item.id).subscribe({
            next: () => { this.confirmId.set(null); this.load(); },
            error: () => this.confirmId.set(null),
        });
    }

    // --- download ---

    protected download(item: CoursewareItem): void {
        this.service.downloadUrl(item.id).subscribe({
            next: ({ url }) => window.open(url, '_blank'),
        });
    }

    // --- filtri ---

    protected onSearch(event: Event): void {
        this.q.set((event.target as HTMLInputElement).value);
    }
    protected onCategory(event: Event): void {
        this.category.set((event.target as HTMLSelectElement).value);
    }

    // --- helpers di presentazione ---

    protected kind(mime: string): FileKind {
        return kindOf(mime);
    }

    protected humanSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    private errorMessage(err: unknown): string {
        if (err instanceof HttpErrorResponse) {
            if (err.error && typeof err.error.error === 'string') return err.error.error;
            if (err.status === 0) return 'Errore di rete';
        }
        return 'Caricamento non riuscito';
    }
}
