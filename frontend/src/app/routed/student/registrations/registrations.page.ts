import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { IonAlert, ToastController } from '@ionic/angular/standalone';
import { RegistrationsService, MyRegistration } from '$core/services/registrations.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type YearFilter = number | 'all';
type SemesterFilter = number | 'all';

interface AlertButton {
    text: string;
    role?: 'cancel' | 'destructive';
    handler?: () => void;
}

@Component({
    selector: 'app-registrations',
    imports: [RouterLink, IonAlert, EmptyState, ErrorState],
    templateUrl: './registrations.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationsPage {
    private readonly service = inject(RegistrationsService);
    private readonly router  = inject(Router);
    private readonly toast   = inject(ToastController);

    protected readonly state    = signal<AsyncState<MyRegistration[]>>(initial());
    protected readonly year     = signal<YearFilter>('all');
    protected readonly semester = signal<SemesterFilter>('all');
    protected readonly removing = signal<Set<number>>(new Set());

    protected readonly confirmOpen = signal(false);
    protected readonly submitting  = signal(false);
    private readonly target        = signal<MyRegistration | null>(null);

    protected readonly data = computed(() => this.state().data);

    protected readonly years = computed(() => {
        const d = this.data();
        if (!d) return [];
        const set = new Set<number>();
        for (const r of d) if (r.academicYear != null) set.add(r.academicYear);
        return [...set].sort((a, b) => b - a);
    });
    protected readonly currentYear = computed<number | null>(() => this.years()[0] ?? null);

    protected readonly filtered = computed(() => {
        const d = this.data();
        if (!d) return [];
        const y = this.year();
        const s = this.semester();
        return d.filter(r =>
            (y === 'all' || r.academicYear === y) &&
            (s === 'all' || r.semester === s),
        );
    });

    protected readonly isEmpty         = computed(() => { const d = this.data(); return !!d && d.length === 0; });
    protected readonly isFilteredEmpty = computed(() => { const d = this.data(); return !!d && d.length > 0 && this.filtered().length === 0; });

    protected readonly confirmMessage = computed(() => {
        const t = this.target();
        return t
            ? `Verrai disiscritto da "${t.subjectTitle}". Le eventuali prenotazioni agli appelli di questo corso saranno ritirate.`
            : '';
    });

    protected readonly alertButtons: AlertButton[] = [
        { text: 'Annulla', role: 'cancel', handler: () => this.confirmOpen.set(false) },
        { text: 'Disiscriviti', role: 'destructive', handler: () => { this.confirmOpen.set(false); this.unregister(); } },
    ];

    constructor() {
        this.load();
    }

    protected load(): void {
        this.state.set(initial());
        this.service.list().subscribe({
            next: data => {
                this.state.set({ loading: false, data, error: null });
                const latest = data.reduce(
                    (max, r) => (r.academicYear != null && r.academicYear > max ? r.academicYear : max),
                    -Infinity,
                );
                this.year.set(latest === -Infinity ? 'all' : latest);
                this.semester.set('all');
                this.removing.set(new Set());
            },
            error: () => this.state.set({ loading: false, data: null, error: 'Impossibile caricare le iscrizioni.' }),
        });
    }

    protected onYear(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.year.set(value === 'all' ? 'all' : Number(value));
    }

    protected onSemester(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.semester.set(value === 'all' ? 'all' : Number(value));
    }

    protected clearFilters(): void {
        this.year.set(this.currentYear() ?? 'all');
        this.semester.set('all');
    }

    protected isReadonly(reg: MyRegistration): boolean {
        const current = this.currentYear();
        return reg.academicYear != null && current != null && reg.academicYear < current;
    }

    protected isRemoving(reg: MyRegistration): boolean {
        return this.removing().has(reg.courseId);
    }

    protected askUnregister(reg: MyRegistration): void {
        this.target.set(reg);
        this.confirmOpen.set(true);
    }

    protected unregister(): void {
        const reg = this.target();
        if (!reg || this.submitting()) return;
        this.submitting.set(true);
        this.service.unregister(reg.courseId).subscribe({
            next: () => {
                this.submitting.set(false);
                this.removing.update(set => new Set(set).add(reg.courseId));
                void this.notify('Iscrizione annullata.');
                setTimeout(() => this.finalizeRemoval(reg.courseId), 250);
            },
            error: (err: unknown) => {
                this.submitting.set(false);
                void this.notify(this.errorMessage(err, 'Operazione non riuscita. Riprova.'));
            },
        });
    }

    protected goCatalog(): void {
        this.router.navigateByUrl('/student/courses');
    }

    private finalizeRemoval(courseId: number): void {
        this.state.update(s => (s.data ? { ...s, data: s.data.filter(r => r.courseId !== courseId) } : s));
        this.removing.update(set => {
            const next = new Set(set);
            next.delete(courseId);
            return next;
        });
    }

    private errorMessage(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse && err.error && typeof err.error.error === 'string') {
            return err.error.error;
        }
        return fallback;
    }

    private async notify(message: string): Promise<void> {
        const toast = await this.toast.create({ message, duration: 2500, position: 'top' });
        await toast.present();
    }
}
