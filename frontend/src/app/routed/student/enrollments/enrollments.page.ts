import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { IonAlert } from '@ionic/angular/standalone';
import { EnrollmentsService, MyEnrollment } from '$core/services/enrollments.service';
import { ToastService } from '$core/toast/toast.service';
import { ExamsService } from '$core/services/exams.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type Tab = 'upcoming' | 'history';
type SubjectFilter = string | 'all';

interface AlertButton {
    text: string;
    role?: 'cancel' | 'destructive';
    handler?: () => void;
}

function byDateAsc(a: MyEnrollment, b: MyEnrollment): number {
    return (a.examDate ?? '').localeCompare(b.examDate ?? '');
}

@Component({
    selector: 'app-enrollments',
    imports: [DatePipe, RouterLink, IonAlert, EmptyState, ErrorState],
    providers: [DatePipe],
    templateUrl: './enrollments.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentsPage {
    private readonly service  = inject(EnrollmentsService);
    private readonly exams    = inject(ExamsService);
    private readonly router   = inject(Router);
    private readonly toast    = inject(ToastService);
    private readonly datePipe = inject(DatePipe);

    protected readonly state         = signal<AsyncState<MyEnrollment[]>>(initial());
    protected readonly tab           = signal<Tab>('upcoming');
    protected readonly subjectFilter = signal<SubjectFilter>('all');

    protected readonly confirmOpen = signal(false);
    protected readonly cancelling  = signal(false);
    private readonly target        = signal<MyEnrollment | null>(null);

    protected readonly data    = computed(() => this.state().data);
    protected readonly isEmpty = computed(() => { const d = this.data(); return !!d && d.length === 0; });

    protected readonly upcoming = computed(() =>
        (this.data() ?? []).filter(e => e.status === 'scheduled' && e.future).sort(byDateAsc),
    );
    protected readonly history = computed(() =>
        (this.data() ?? []).filter(e => !(e.status === 'scheduled' && e.future)).sort((a, b) => byDateAsc(b, a)),
    );

    protected readonly current = computed(() => (this.tab() === 'upcoming' ? this.upcoming() : this.history()));

    protected readonly subjects = computed(() =>
        [...new Set(this.current().map(e => e.subjectTitle))].sort((a, b) => a.localeCompare(b)),
    );

    protected readonly filtered = computed(() => {
        const s = this.subjectFilter();
        return s === 'all' ? this.current() : this.current().filter(e => e.subjectTitle === s);
    });

    protected readonly tabEmpty      = computed(() => !this.isEmpty() && this.current().length === 0);
    protected readonly filteredEmpty = computed(() => this.current().length > 0 && this.filtered().length === 0);

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
            error: () => this.state.set({ loading: false, data: null, error: 'Impossibile caricare le prenotazioni.' }),
        });
    }

    protected setTab(tab: Tab): void {
        this.tab.set(tab);
        this.subjectFilter.set('all');
    }

    protected onSubject(event: Event): void {
        this.subjectFilter.set((event.target as HTMLSelectElement).value);
    }

    protected clearSubject(): void {
        this.subjectFilter.set('all');
    }

    protected canCancel(e: MyEnrollment): boolean {
        return e.status === 'scheduled' && e.future;
    }

    protected askCancel(e: MyEnrollment): void {
        this.target.set(e);
        this.confirmOpen.set(true);
    }

    protected cancel(): void {
        const e = this.target();
        if (!e || this.cancelling()) return;
        this.cancelling.set(true);
        this.exams.withdraw(e.id).subscribe({
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

    protected goExams(): void {
        this.router.navigateByUrl('/student/exams');
    }

    private errorMessage(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse && err.error && typeof err.error.error === 'string') {
            return err.error.error;
        }
        return fallback;
    }
}
