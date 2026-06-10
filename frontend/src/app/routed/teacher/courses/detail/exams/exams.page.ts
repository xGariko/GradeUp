import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TeacherCoursesService, CourseExams, CourseExam, ExamStatus } from '$core/services/teacher-courses.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

const STATUS_META: Record<ExamStatus, { label: string; badge: string; tab: string }> = {
    in_programma:    { label: 'In programma',   badge: 'text-bg-primary',   tab: 'In programma' },
    da_verbalizzare: { label: 'Da verbalizzare', badge: 'text-bg-warning',   tab: 'Da verbalizzare' },
    verbalizzato:    { label: 'Verbalizzato',    badge: 'text-bg-secondary', tab: 'Verbalizzati' },
};

const TABS: ExamStatus[] = ['in_programma', 'da_verbalizzare', 'verbalizzato'];

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

@Component({
    selector: 'app-teacher-course-exams',
    imports: [DatePipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './exams.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherCourseExamsPage {
    private readonly service = inject(TeacherCoursesService);
    private readonly route   = inject(ActivatedRoute);
    private readonly router  = inject(Router);

    protected readonly courseId = Number(this.route.snapshot.paramMap.get('id'));
    protected readonly tabs = TABS;

    protected readonly exams    = signal<AsyncState<CourseExams>>(initial());
    protected readonly notFound = signal(false);
    protected readonly tab      = signal<ExamStatus>('in_programma');

    protected readonly showForm   = signal(false);
    protected readonly editId     = signal<number | null>(null);
    protected readonly formDate   = signal('');
    protected readonly formLoc    = signal('');
    protected readonly formError  = signal<string | null>(null);
    protected readonly submitting = signal(false);

    protected readonly confirmId   = signal<number | null>(null);
    protected readonly cancelling  = signal(false);
    protected readonly cancelError = signal<string | null>(null);

    protected readonly items = computed(() => this.exams().data?.items ?? []);

    protected readonly counts = computed(() => {
        const list = this.items();
        return {
            in_programma:    list.filter(e => e.status === 'in_programma').length,
            da_verbalizzare: list.filter(e => e.status === 'da_verbalizzare').length,
            verbalizzato:    list.filter(e => e.status === 'verbalizzato').length,
        } as Record<ExamStatus, number>;
    });

    protected readonly visible = computed(() => this.items().filter(e => e.status === this.tab()));

    constructor() {
        this.load();
    }

    protected load(): void {
        if (!Number.isInteger(this.courseId) || this.courseId <= 0) {
            this.notFound.set(true);
            this.exams.set({ loading: false, data: null, error: null });
            return;
        }
        this.exams.set(initial());
        this.notFound.set(false);
        this.service.courseExams(this.courseId).subscribe({
            next: data => this.exams.set({ loading: false, data, error: null }),
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.notFound.set(true);
                    this.exams.set({ loading: false, data: null, error: null });
                } else {
                    this.exams.set({ loading: false, data: null, error: 'Impossibile caricare gli appelli.' });
                }
            },
        });
    }

    protected statusLabel(s: ExamStatus): string {
        return STATUS_META[s].label;
    }
    protected statusBadge(s: ExamStatus): string {
        return STATUS_META[s].badge;
    }
    protected tabLabel(s: ExamStatus): string {
        return STATUS_META[s].tab;
    }
    protected setTab(s: ExamStatus): void {
        this.tab.set(s);
    }

    // --- form ---

    protected openCreate(): void {
        this.editId.set(null);
        this.formDate.set('');
        this.formLoc.set('');
        this.formError.set(null);
        this.showForm.set(true);
    }

    protected openEdit(exam: CourseExam): void {
        this.editId.set(exam.id);
        this.formDate.set(this.toLocalInput(exam.examDate));
        this.formLoc.set(exam.location ?? '');
        this.formError.set(null);
        this.showForm.set(true);
    }

    protected closeForm(): void {
        this.showForm.set(false);
        this.editId.set(null);
    }

    protected onDate(event: Event): void {
        this.formDate.set((event.target as HTMLInputElement).value);
    }
    protected onLoc(event: Event): void {
        this.formLoc.set((event.target as HTMLInputElement).value);
    }

    protected submit(): void {
        const date = this.formDate();
        const location = this.formLoc().trim();
        if (!date) { this.formError.set('Data e ora obbligatorie.'); return; }
        if (location.length < 2) { this.formError.set('Sede obbligatoria (min 2 caratteri).'); return; }

        const when = new Date(date);
        if (Number.isNaN(when.getTime())) { this.formError.set('Data non valida.'); return; }
        if (this.editId() === null && when.getTime() <= Date.now()) {
            this.formError.set('La data deve essere futura.');
            return;
        }

        const payload = { examDate: when.toISOString(), location };
        this.submitting.set(true);
        this.formError.set(null);

        const onDone = (): void => {
            this.submitting.set(false);
            this.closeForm();
            this.load();
        };
        const onFail = (err: unknown): void => {
            this.submitting.set(false);
            this.formError.set(this.errorMessage(err, 'Salvataggio non riuscito.'));
        };

        const id = this.editId();
        if (id === null) {
            this.service.createExam(this.courseId, payload).subscribe({ next: onDone, error: onFail });
        } else {
            this.service.updateExam(id, payload).subscribe({ next: onDone, error: onFail });
        }
    }

    // --- annulla ---

    protected askCancel(id: number): void {
        this.cancelError.set(null);
        this.confirmId.set(id);
    }
    protected dismissCancel(): void {
        this.confirmId.set(null);
        this.cancelError.set(null);
    }
    protected confirmCancel(exam: CourseExam): void {
        this.cancelling.set(true);
        this.cancelError.set(null);
        this.service.cancelExam(exam.id).subscribe({
            next: () => {
                this.cancelling.set(false);
                this.confirmId.set(null);
                this.load();
            },
            error: (err: unknown) => {
                this.cancelling.set(false);
                this.cancelError.set(this.errorMessage(err, 'Annullamento non riuscito.'));
            },
        });
    }

    protected goGrade(exam: CourseExam): void {
        this.router.navigateByUrl(`/teacher/exams/${exam.id}/grade`);
    }

    protected goCourses(): void {
        this.router.navigateByUrl('/teacher/courses');
    }

    // --- helpers ---

    private toLocalInput(iso: string): string {
        const d = new Date(iso);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    private errorMessage(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse && err.error && typeof err.error.error === 'string') {
            return err.error.error;
        }
        return fallback;
    }
}
