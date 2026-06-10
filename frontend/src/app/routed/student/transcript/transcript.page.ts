import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranscriptService, Transcript, TranscriptItem } from '$core/services/transcript.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type SortKey = 'date' | 'grade';
type SortDir = 'asc' | 'desc';
type YearFilter = number | 'all';
type SubjectFilter = string | 'all';

@Component({
    selector: 'app-transcript',
    imports: [DatePipe, DecimalPipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './transcript.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranscriptPage {
    private readonly service = inject(TranscriptService);
    private readonly router  = inject(Router);

    protected readonly state         = signal<AsyncState<Transcript>>(initial());
    protected readonly yearFilter    = signal<YearFilter>('all');
    protected readonly subjectFilter = signal<SubjectFilter>('all');
    protected readonly sortKey       = signal<SortKey>('date');
    protected readonly sortDir       = signal<SortDir>('desc');

    protected readonly data            = computed(() => this.state().data);
    protected readonly notMatriculated = computed(() => { const d = this.data(); return !!d && d.matriculationStatus == null; });
    protected readonly isGraduated     = computed(() => this.data()?.matriculationStatus === 'graduated');
    protected readonly isEmpty         = computed(() => { const d = this.data(); return !!d && d.items.length === 0; });
    protected readonly cfuPercent      = computed(() => {
        const d = this.data();
        return d && d.cfuTotal > 0 ? Math.round((d.cfuAcquired / d.cfuTotal) * 100) : 0;
    });

    protected readonly years = computed(() =>
        [...new Set((this.data()?.items ?? []).map(it => it.academicYear).filter((y): y is number => y != null))]
            .sort((a, b) => b - a),
    );
    protected readonly subjects = computed(() =>
        [...new Set((this.data()?.items ?? []).map(it => it.subjectTitle))].sort((a, b) => a.localeCompare(b)),
    );

    protected readonly filtered = computed<TranscriptItem[]>(() => {
        const d = this.data();
        if (!d) return [];
        const y = this.yearFilter();
        const sub = this.subjectFilter();
        const rows = d.items.filter(it =>
            (y === 'all' || it.academicYear === y) &&
            (sub === 'all' || it.subjectTitle === sub),
        );
        const key = this.sortKey();
        const factor = this.sortDir() === 'asc' ? 1 : -1;
        return [...rows].sort((a, b) => {
            if (key === 'grade') return ((a.grade ?? 0) - (b.grade ?? 0)) * factor;
            return (a.examDate ?? '').localeCompare(b.examDate ?? '') * factor;
        });
    });

    protected readonly filteredEmpty = computed(() => {
        const d = this.data();
        return !!d && d.items.length > 0 && this.filtered().length === 0;
    });

    constructor() {
        this.load();
    }

    protected load(): void {
        this.state.set(initial());
        this.service.get().subscribe({
            next: data => this.state.set({ loading: false, data, error: null }),
            error: () => this.state.set({ loading: false, data: null, error: 'Impossibile caricare il libretto.' }),
        });
    }

    protected onYear(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.yearFilter.set(value === 'all' ? 'all' : Number(value));
    }

    protected onSubject(event: Event): void {
        this.subjectFilter.set((event.target as HTMLSelectElement).value);
    }

    protected clearFilters(): void {
        this.yearFilter.set('all');
        this.subjectFilter.set('all');
    }

    protected setSort(key: SortKey): void {
        if (this.sortKey() === key) {
            this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            this.sortKey.set(key);
            this.sortDir.set('desc');
        }
    }

    protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
        if (this.sortKey() !== key) return 'none';
        return this.sortDir() === 'asc' ? 'ascending' : 'descending';
    }

    protected goExams(): void {
        this.router.navigateByUrl('/student/exams');
    }

    protected goMatriculation(): void {
        this.router.navigateByUrl('/student/matriculation');
    }
}
