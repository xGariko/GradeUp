import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
    TeacherCoursesService,
    ExamGrading,
    GradingRow,
    GradingItem,
    EnrollmentStatus,
} from '$core/services/teacher-courses.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';
import { HasPendingChanges } from '$core/guards/pending-changes.guard';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type FinalStatus = Exclude<EnrollmentStatus, 'scheduled'>;
interface Draft {
    status: EnrollmentStatus;
    grade: number | null;
}

const STATUS_META: Record<EnrollmentStatus, { label: string; badge: string }> = {
    scheduled: { label: 'Da verbalizzare', badge: 'text-bg-warning' },
    passed:    { label: 'Superato',        badge: 'text-bg-success' },
    failed:    { label: 'Non superato',    badge: 'text-bg-danger' },
    absent:    { label: 'Assente',         badge: 'text-bg-secondary' },
    withdrawn: { label: 'Ritirato',        badge: 'text-bg-secondary' },
};

const FINAL_OPTIONS: FinalStatus[] = ['passed', 'failed', 'absent', 'withdrawn'];

@Component({
    selector: 'app-teacher-exam-grade',
    imports: [DatePipe, NgTemplateOutlet, RouterLink, EmptyState, ErrorState],
    templateUrl: './grade.page.html',
    host: { class: 'd-block', '(window:beforeunload)': 'onBeforeUnload($event)' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherExamGradePage implements HasPendingChanges {
    private readonly service = inject(TeacherCoursesService);
    private readonly route   = inject(ActivatedRoute);
    private readonly router  = inject(Router);

    protected readonly examId = Number(this.route.snapshot.paramMap.get('id'));
    protected readonly finalOptions = FINAL_OPTIONS;

    protected readonly state    = signal<AsyncState<ExamGrading>>(initial());
    protected readonly notFound = signal(false);

    protected readonly drafts     = signal<Record<number, Draft>>({});
    protected readonly confirming = signal(false);
    protected readonly submitting = signal(false);
    protected readonly saved      = signal(false);
    protected readonly saveError  = signal<string | null>(null);

    protected readonly exam = computed(() => this.state().data?.exam ?? null);
    protected readonly editableRows = computed(() =>
        (this.state().data?.rows ?? []).filter(r => r.status === 'scheduled'),
    );
    protected readonly gradedRows = computed(() =>
        (this.state().data?.rows ?? []).filter(r => r.status !== 'scheduled'),
    );

    protected readonly dirtyCount = computed(() => this.dirtyItems().length);
    protected readonly hasInvalidGrade = computed(() =>
        this.dirtyItems().some(d => d.status === 'passed' && !this.isValidGrade(d.grade)),
    );
    protected readonly canSave = computed(() =>
        this.dirtyCount() > 0 && !this.hasInvalidGrade() && !this.submitting(),
    );

    constructor() {
        this.load();
    }

    protected load(): void {
        if (!Number.isInteger(this.examId) || this.examId <= 0) {
            this.notFound.set(true);
            this.state.set({ loading: false, data: null, error: null });
            return;
        }
        this.state.set(initial());
        this.notFound.set(false);
        this.saved.set(false);
        this.service.examGrading(this.examId).subscribe({
            next: data => {
                this.state.set({ loading: false, data, error: null });
                this.resetDrafts();
            },
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.notFound.set(true);
                    this.state.set({ loading: false, data: null, error: null });
                } else {
                    this.state.set({ loading: false, data: null, error: 'Impossibile caricare la verbalizzazione.' });
                }
            },
        });
    }

    // --- meta ---

    protected statusLabel(s: EnrollmentStatus): string {
        return STATUS_META[s].label;
    }
    protected statusBadge(s: EnrollmentStatus): string {
        return STATUS_META[s].badge;
    }

    protected draftOf(enrollmentId: number): Draft {
        return this.drafts()[enrollmentId] ?? { status: 'scheduled', grade: null };
    }
    protected statusValue(enrollmentId: number): string {
        const s = this.draftOf(enrollmentId).status;
        return s === 'scheduled' ? '' : s;
    }
    protected isDirtyRow(enrollmentId: number): boolean {
        return this.draftOf(enrollmentId).status !== 'scheduled';
    }
    protected gradeError(enrollmentId: number): string | null {
        const d = this.draftOf(enrollmentId);
        if (d.status !== 'passed') return null;
        return this.isValidGrade(d.grade) ? null : 'Voto tra 18 e 30';
    }

    // --- editing ---

    protected onStatus(row: GradingRow, event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        const status = (value === '' ? 'scheduled' : value) as EnrollmentStatus;
        const current = this.draftOf(row.enrollmentId);
        const grade = status === 'passed' ? (current.grade ?? 18) : null;
        this.patchDraft(row.enrollmentId, { status, grade });
    }

    protected onGrade(row: GradingRow, event: Event): void {
        const raw = (event.target as HTMLInputElement).value;
        const grade = raw === '' ? null : Number(raw);
        this.patchDraft(row.enrollmentId, { ...this.draftOf(row.enrollmentId), grade });
    }

    protected resetEdits(): void {
        if (this.dirtyCount() > 0 && !confirm('Annullare le modifiche non salvate?')) return;
        this.resetDrafts();
        this.confirming.set(false);
        this.saveError.set(null);
    }

    // --- save ---

    protected askSave(): void {
        if (!this.canSave()) return;
        this.saveError.set(null);
        this.confirming.set(true);
    }
    protected dismissSave(): void {
        this.confirming.set(false);
    }

    protected confirmSave(): void {
        const items = this.dirtyItems();
        if (items.length === 0) return;
        this.submitting.set(true);
        this.saveError.set(null);
        this.service.saveGrading(this.examId, items).subscribe({
            next: () => {
                this.saved.set(true);
                this.submitting.set(false);
                this.confirming.set(false);
                const courseId = this.exam()?.courseId;
                this.router.navigateByUrl(courseId ? `/teacher/courses/${courseId}/exams` : '/teacher/courses');
            },
            error: (err: unknown) => {
                this.submitting.set(false);
                this.confirming.set(false);
                this.saveError.set(this.errorMessage(err, 'Verbalizzazione non riuscita.'));
            },
        });
    }

    protected goCourses(): void {
        this.router.navigateByUrl('/teacher/courses');
    }

    // --- guard hooks ---

    hasUnsavedChanges(): boolean {
        return this.dirtyCount() > 0 && !this.saved();
    }

    protected onBeforeUnload(event: BeforeUnloadEvent): void {
        if (this.hasUnsavedChanges()) event.preventDefault();
    }

    // --- helpers ---

    private dirtyItems(): GradingItem[] {
        const drafts = this.drafts();
        return Object.entries(drafts)
            .filter(([, d]) => d.status !== 'scheduled')
            .map(([id, d]) => ({ enrollmentId: Number(id), status: d.status as FinalStatus, grade: d.grade }));
    }

    private patchDraft(enrollmentId: number, draft: Draft): void {
        this.drafts.update(d => ({ ...d, [enrollmentId]: draft }));
    }

    private resetDrafts(): void {
        const drafts: Record<number, Draft> = {};
        for (const row of this.editableRows()) {
            drafts[row.enrollmentId] = { status: 'scheduled', grade: null };
        }
        this.drafts.set(drafts);
    }

    private isValidGrade(grade: number | null): boolean {
        return grade !== null && Number.isInteger(grade) && grade >= 18 && grade <= 30;
    }

    private errorMessage(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse && err.error && typeof err.error.error === 'string') {
            return err.error.error;
        }
        return fallback;
    }
}
