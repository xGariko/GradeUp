import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '$core/auth/auth.service';
import { StudentDashboardService } from '$core/services/student-dashboard.service';
import { CourseCatalogService, CatalogCourse } from '$core/services/course-catalog.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';
import type { StudentCareerSummary } from '$shared/types/dashboard';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

const PAGE_SIZE = 25;

@Component({
    selector: 'app-student-courses',
    imports: [RouterLink, EmptyState, ErrorState],
    templateUrl: './courses.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesPage {
    private readonly auth    = inject(AuthService);
    private readonly dash    = inject(StudentDashboardService);
    private readonly catalog = inject(CourseCatalogService);
    private readonly router  = inject(Router);
    private readonly route   = inject(ActivatedRoute);

    private readonly currentYear = ((): number => {
        const now = new Date();
        return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    })();

    protected readonly career  = signal<AsyncState<StudentCareerSummary>>(initial());
    protected readonly courses = signal<AsyncState<CatalogCourse[]>>(initial());

    protected readonly q        = signal('');
    protected readonly semester = signal('');
    protected readonly year     = signal('');
    protected readonly mine     = signal(true);
    protected readonly page     = signal(1);

    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    protected readonly years = computed(() =>
        [...new Set((this.courses().data ?? []).map(c => c.academicYear).filter((y): y is number => y != null))]
            .sort((a, b) => b - a),
    );

    protected readonly filtered = computed(() => {
        const list = this.courses().data ?? [];
        const q    = this.q().trim().toLowerCase();
        const sem  = this.semester();
        const year = this.year();
        const mine = this.mine();
        return list.filter(c =>
            (!mine || c.inMyPlan) &&
            (!sem  || c.semester === Number(sem)) &&
            (!year || c.academicYear === Number(year)) &&
            (!q    || c.subjectTitle.toLowerCase().includes(q) || c.teacherName.toLowerCase().includes(q)),
        );
    });

    protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

    protected readonly paged = computed(() => {
        const start = (this.page() - 1) * PAGE_SIZE;
        return this.filtered().slice(start, start + PAGE_SIZE);
    });

    protected readonly notMatriculated = computed(() => this.career().data?.status === 'not_matriculated');

    constructor() {
        this.initFromUrl();
        this.loadCareer();
        this.loadCourses();
    }

    protected loadCareer(): void {
        this.career.set(initial());
        this.dash.careerSummary().subscribe({
            next: data => this.career.set({ loading: false, data, error: null }),
            error: () => this.career.set({ loading: false, data: null, error: 'Impossibile verificare lo stato di carriera.' }),
        });
    }

    protected loadCourses(): void {
        this.courses.set(initial());
        this.catalog.list().subscribe({
            next: data => this.courses.set({ loading: false, data, error: null }),
            error: () => this.courses.set({ loading: false, data: null, error: 'Impossibile caricare il catalogo corsi.' }),
        });
    }

    protected onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (this.searchTimer) clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            this.q.set(value);
            this.page.set(1);
            this.syncUrl();
        }, 300);
    }

    protected onSemester(event: Event): void {
        this.semester.set((event.target as HTMLSelectElement).value);
        this.page.set(1);
        this.syncUrl();
    }

    protected onYear(event: Event): void {
        this.year.set((event.target as HTMLSelectElement).value);
        this.page.set(1);
        this.syncUrl();
    }

    protected onMine(event: Event): void {
        this.mine.set((event.target as HTMLInputElement).checked);
        this.page.set(1);
        this.syncUrl();
    }

    protected clearFilters(): void {
        this.q.set('');
        this.semester.set('');
        this.year.set('');
        this.mine.set(false);
        this.page.set(1);
        this.syncUrl();
    }

    protected goToPage(target: number): void {
        const clamped = Math.min(Math.max(1, target), this.totalPages());
        this.page.set(clamped);
        this.syncUrl();
    }

    protected goMatriculation(): void {
        this.router.navigateByUrl('/student/matriculation');
    }

    protected seatsLeft(course: CatalogCourse): number | null {
        return course.capacity == null ? null : Math.max(0, course.capacity - course.enrolled);
    }

    protected yearSelected(y: number): boolean {
        return this.year() === String(y);
    }

    private initFromUrl(): void {
        const qp = this.route.snapshot.queryParamMap;
        this.q.set(qp.get('q') ?? '');
        this.semester.set(qp.get('sem') ?? '');
        this.year.set(qp.get('year') ?? String(this.currentYear));
        this.mine.set(qp.get('mine') !== 'false');
        this.page.set(Number(qp.get('page')) || 1);
    }

    private syncUrl(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                q:    this.q() || null,
                sem:  this.semester() || null,
                year: this.year() || null,
                mine: this.mine() ? null : 'false',
                page: this.page() > 1 ? this.page() : null,
            },
            replaceUrl: true,
        });
    }
}
