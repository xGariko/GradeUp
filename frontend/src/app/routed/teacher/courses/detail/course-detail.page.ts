import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TeacherCoursesService, TeacherCourseDetail, TeacherCourseStudent } from '$core/services/teacher-courses.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

const STUDENT_STATUS: Record<string, { label: string; badge: string }> = {
    active:    { label: 'Attivo',   badge: 'text-bg-success' },
    suspended: { label: 'Sospeso',  badge: 'text-bg-danger' },
    inactive:  { label: 'Inattivo', badge: 'text-bg-secondary' },
    graduated: { label: 'Laureato', badge: 'text-bg-primary' },
    pending:   { label: 'In attesa', badge: 'text-bg-warning' },
};

@Component({
    selector: 'app-teacher-course-detail',
    imports: [DatePipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './course-detail.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherCourseDetailPage {
    private readonly service = inject(TeacherCoursesService);
    private readonly route   = inject(ActivatedRoute);
    private readonly router  = inject(Router);

    private readonly id = Number(this.route.snapshot.paramMap.get('id'));

    protected readonly detail   = signal<AsyncState<TeacherCourseDetail>>(initial());
    protected readonly notFound = signal(false);
    protected readonly q        = signal('');

    protected readonly course   = computed(() => this.detail().data?.course ?? null);

    protected readonly filteredStudents = computed(() => {
        const students = this.detail().data?.students ?? [];
        const q = this.q().trim().toLowerCase();
        if (!q) return students;
        return students.filter(s =>
            s.surname.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            (s.matriculationCode != null && String(s.matriculationCode).includes(q)),
        );
    });

    protected readonly nearCapacity = computed(() => {
        const c = this.course();
        return !!c && c.capacity != null && c.capacity > 0 && c.enrolled / c.capacity >= 0.9;
    });

    protected readonly mailtoSegreteria = computed(() => {
        const c = this.course();
        const subject = c ? `Richiesta modifica corso: ${c.subjectTitle}` : 'Richiesta modifica corso';
        return `mailto:segreteria@gradeup.dev?subject=${encodeURIComponent(subject)}`;
    });

    constructor() {
        this.loadDetail();
    }

    protected loadDetail(): void {
        if (!Number.isInteger(this.id) || this.id <= 0) {
            this.notFound.set(true);
            this.detail.set({ loading: false, data: null, error: null });
            return;
        }
        this.detail.set(initial());
        this.notFound.set(false);
        this.service.detail(this.id).subscribe({
            next: data => this.detail.set({ loading: false, data, error: null }),
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.notFound.set(true);
                    this.detail.set({ loading: false, data: null, error: null });
                } else {
                    this.detail.set({ loading: false, data: null, error: 'Impossibile caricare il corso.' });
                }
            },
        });
    }

    protected onSearch(event: Event): void {
        this.q.set((event.target as HTMLInputElement).value);
    }

    protected goCourses(): void {
        this.router.navigateByUrl('/teacher/courses');
    }

    protected statusLabel(status: string): string {
        return STUDENT_STATUS[status]?.label ?? status;
    }

    protected statusBadge(status: string): string {
        return STUDENT_STATUS[status]?.badge ?? 'text-bg-light';
    }

    protected trackStudent(student: TeacherCourseStudent): number {
        return student.studentId;
    }
}
