import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudyPlanService, StudyPlan, StudyPlanItem } from '$core/services/study-plan.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type PlanFilter = 'all' | 'mandatory' | 'optional' | 'todo';

interface YearGroup {
    year:      number;
    ordinal:   number;
    items:     StudyPlanItem[];
    visible:   StudyPlanItem[];
    cfuTotal:  number;
    allPassed: boolean;
}

@Component({
    selector: 'app-study-plan',
    imports: [RouterLink, EmptyState, ErrorState],
    templateUrl: './study-plan.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudyPlanPage {
    private readonly service = inject(StudyPlanService);
    private readonly router  = inject(Router);

    protected readonly state     = signal<AsyncState<StudyPlan>>(initial());
    protected readonly filter    = signal<PlanFilter>('all');
    protected readonly collapsed = signal<Set<number>>(new Set());

    protected readonly data            = computed(() => this.state().data);
    protected readonly notMatriculated = computed(() => { const d = this.data(); return !!d && d.matriculationStatus == null; });
    protected readonly isPending       = computed(() => this.data()?.matriculationStatus === 'pending');
    protected readonly cfuPercent      = computed(() => {
        const d = this.data();
        return d && d.cfuTotal > 0 ? Math.round((d.cfuAcquired / d.cfuTotal) * 100) : 0;
    });

    protected readonly groups = computed<YearGroup[]>(() => {
        const d = this.data();
        if (!d) return [];
        const f = this.filter();
        const byYear = new Map<number, StudyPlanItem[]>();
        for (const it of d.items) {
            const arr = byYear.get(it.year) ?? [];
            arr.push(it);
            byYear.set(it.year, arr);
        }
        const years = [...byYear.keys()].sort((a, b) => a - b);
        return years.map((year, i) => {
            const items = byYear.get(year)!;
            const visible = items.filter(it =>
                f === 'all' ||
                (f === 'mandatory' && it.isMandatory) ||
                (f === 'optional' && !it.isMandatory) ||
                (f === 'todo' && it.status === 'todo'),
            );
            return {
                year,
                ordinal:   i + 1,
                items,
                visible,
                cfuTotal:  items.reduce((sum, it) => sum + it.cfu, 0),
                allPassed: items.every(it => it.status === 'passed'),
            };
        });
    });

    constructor() {
        this.load();
    }

    protected load(): void {
        this.state.set(initial());
        this.service.get().subscribe({
            next: data => {
                this.state.set({ loading: false, data, error: null });
                this.collapsed.set(new Set());
            },
            error: () => this.state.set({ loading: false, data: null, error: 'Impossibile caricare il piano di studi.' }),
        });
    }

    protected setFilter(f: PlanFilter): void {
        this.filter.set(f);
    }

    protected isExpanded(year: number): boolean {
        return !this.collapsed().has(year);
    }

    protected toggleYear(year: number): void {
        this.collapsed.update(set => {
            const next = new Set(set);
            if (next.has(year)) next.delete(year); else next.add(year);
            return next;
        });
    }

    protected ordinalLabel(ordinal: number): string {
        switch (ordinal) {
            case 1:  return 'Primo anno';
            case 2:  return 'Secondo anno';
            case 3:  return 'Terzo anno';
            case 4:  return 'Quarto anno';
            case 5:  return 'Quinto anno';
            default: return `Anno ${ordinal}`;
        }
    }

    protected goMatriculation(): void {
        this.router.navigateByUrl('/student/matriculation');
    }
}
