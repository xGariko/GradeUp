import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { IonAlert } from '@ionic/angular/standalone';
import { ExamsService, AvailableExams, AvailableExam } from '$core/services/exams.service';
import { ToastService } from '$core/toast/toast.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type CourseFilter = number | 'all';

interface CourseOption {
    courseId: number;
    title:    string;
}

interface AlertButton {
    text: string;
    role?: 'cancel' | 'destructive';
    handler?: () => void;
}

@Component({
    selector: 'app-exams',
    imports: [DatePipe, RouterLink, IonAlert, EmptyState, ErrorState],
    providers: [DatePipe],
    templateUrl: './exams.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamsPage {
    private readonly service  = inject(ExamsService);
    private readonly router   = inject(Router);
    private readonly toast    = inject(ToastService);
    private readonly datePipe = inject(DatePipe);

    protected readonly state        = signal<AsyncState<AvailableExams>>(initial());
    protected readonly courseFilter = signal<CourseFilter>('all');
    protected readonly onlyBookable = signal(false);

    protected readonly bookingId   = signal<number | null>(null);
    protected readonly confirmOpen = signal(false);
    protected readonly cancelling  = signal(false);
    private readonly target        = signal<AvailableExam | null>(null);

    protected readonly data                = computed(() => this.state().data);
    protected readonly matriculationStatus = computed(() => this.data()?.matriculationStatus ?? null);
    protected readonly notMatriculated     = computed(() => { const d = this.data(); return !!d && d.matriculationStatus == null; });
    protected readonly isPending           = computed(() => this.matriculationStatus() === 'pending');
    protected readonly registeredCount     = computed(() => this.data()?.registeredCount ?? 0);
    protected readonly exams               = computed(() => this.data()?.exams ?? []);

    protected readonly courses = computed<CourseOption[]>(() => {
        const map = new Map<number, string>();
        for (const ex of this.exams()) if (!map.has(ex.courseId)) map.set(ex.courseId, ex.subjectTitle);
        return [...map.entries()].map(([courseId, title]) => ({ courseId, title })).sort((a, b) => a.title.localeCompare(b.title));
    });

    protected readonly filtered = computed(() => {
        const c = this.courseFilter();
        const only = this.onlyBookable();
        return this.exams().filter(ex =>
            (c === 'all' || ex.courseId === c) &&
            (!only || ex.myStatus == null),
        );
    });

    protected readonly noExams        = computed(() => { const d = this.data(); return !!d && d.matriculationStatus != null && d.exams.length === 0; });
    protected readonly filteredEmpty  = computed(() => this.exams().length > 0 && this.filtered().length === 0);

    protected readonly confirmMessage = computed(() => {
        const t = this.target();
        if (!t) return '';
        const when = this.datePipe.transform(t.examDate, 'dd/MM/yyyy HH:mm');
        return `Annullerai la prenotazione per "${t.subjectTitle}" del ${when}.`;
    });

    protected readonly alertButtons: AlertButton[] = [
        { text: 'Mantieni', role: 'cancel', handler: () => this.confirmOpen.set(false) },
        { text: 'Annulla prenotazione', role: 'destructive', handler: () => { this.confirmOpen.set(false); this.cancel(); } },
    ];

    constructor() {
        this.load();
    }

    protected load(): void {
        this.state.set(initial());
        this.service.list().subscribe({
            next: data => this.state.set({ loading: false, data, error: null }),
            error: () => this.state.set({ loading: false, data: null, error: 'Impossibile caricare gli appelli.' }),
        });
    }

    protected onCourse(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.courseFilter.set(value === 'all' ? 'all' : Number(value));
    }

    protected onOnlyBookable(event: Event): void {
        this.onlyBookable.set((event.target as HTMLInputElement).checked);
    }

    protected clearFilters(): void {
        this.courseFilter.set('all');
        this.onlyBookable.set(false);
    }

    protected book(exam: AvailableExam): void {
        if (this.bookingId() !== null || this.isPending()) return;
        this.bookingId.set(exam.id);
        this.service.book(exam.id).subscribe({
            next: () => {
                this.bookingId.set(null);
                const when = this.datePipe.transform(exam.examDate, 'dd/MM/yyyy');
                this.toast.show(`Prenotato per il ${when}.`);
                this.load();
            },
            error: (err: unknown) => {
                this.bookingId.set(null);
                this.toast.show(this.errorMessage(err, 'Prenotazione non riuscita. Riprova.'));
                this.load();
            },
        });
    }

    protected askCancel(exam: AvailableExam): void {
        this.target.set(exam);
        this.confirmOpen.set(true);
    }

    protected cancel(): void {
        const exam = this.target();
        if (!exam || exam.enrollmentId == null || this.cancelling()) return;
        this.cancelling.set(true);
        this.service.withdraw(exam.enrollmentId).subscribe({
            next: () => {
                this.cancelling.set(false);
                this.toast.show('Prenotazione annullata.');
                this.load();
            },
            error: (err: unknown) => {
                this.cancelling.set(false);
                this.toast.show(this.errorMessage(err, 'Operazione non riuscita. Riprova.'));
                this.load();
            },
        });
    }

    protected goCatalog(): void {
        this.router.navigateByUrl('/student/courses');
    }

    protected goMatriculation(): void {
        this.router.navigateByUrl('/student/matriculation');
    }

    private errorMessage(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse && err.error && typeof err.error.error === 'string') {
            return err.error.error;
        }
        return fallback;
    }
}
