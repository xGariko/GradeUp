import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeacherCoursesService, TeacherCourse } from '$core/services/teacher-courses.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

@Component({
    selector: 'app-teacher-courses',
    imports: [RouterLink, EmptyState, ErrorState],
    templateUrl: './courses.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherCoursesPage {
    private readonly service = inject(TeacherCoursesService);

    private readonly currentYear = ((): number => {
        const now = new Date();
        return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    })();

    protected readonly courses = signal<AsyncState<TeacherCourse[]>>(initial());

    protected readonly year     = signal(String(this.currentYear));
    protected readonly semester = signal('');
    protected readonly status   = signal('');

    protected readonly years = computed(() =>
        [...new Set((this.courses().data ?? []).map(c => c.academicYear).filter((y): y is number => y != null))]
            .sort((a, b) => b - a),
    );

    protected readonly filtered = computed(() => {
        const list   = this.courses().data ?? [];
        const year   = this.year();
        const sem    = this.semester();
        const status = this.status();
        return list.filter(c =>
            (!year || c.academicYear === Number(year)) &&
            (!sem  || c.semester === Number(sem)) &&
            (status === '' || (status === 'concluded' ? c.concluded : !c.concluded)),
        );
    });

    protected readonly filtersActive = computed(() =>
        this.year() !== '' || this.semester() !== '' || this.status() !== '',
    );

    constructor() {
        this.loadCourses();
    }

    protected loadCourses(): void {
        this.courses.set(initial());
        this.service.list().subscribe({
            next: data => this.courses.set({ loading: false, data, error: null }),
            error: () => this.courses.set({ loading: false, data: null, error: 'Impossibile caricare i corsi.' }),
        });
    }

    protected onYear(event: Event): void {
        this.year.set((event.target as HTMLSelectElement).value);
    }
    protected onSemester(event: Event): void {
        this.semester.set((event.target as HTMLSelectElement).value);
    }
    protected onStatus(event: Event): void {
        this.status.set((event.target as HTMLSelectElement).value);
    }

    protected clearFilters(): void {
        this.year.set('');
        this.semester.set('');
        this.status.set('');
    }

    protected yearSelected(y: number): boolean {
        return this.year() === String(y);
    }

    protected nearCapacity(course: TeacherCourse): boolean {
        return course.capacity != null && course.capacity > 0 && course.enrolled / course.capacity >= 0.9;
    }
}
