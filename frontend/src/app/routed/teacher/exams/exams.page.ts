import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeacherCoursesService, TeacherExamListItem, ExamStatus } from '$core/services/teacher-courses.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

const STATUS_META: Record<ExamStatus, { label: string; badge: string }> = {
    in_programma:    { label: 'In programma',    badge: 'text-bg-primary' },
    da_verbalizzare: { label: 'Da verbalizzare', badge: 'text-bg-warning' },
    verbalizzato:    { label: 'Verbalizzato',    badge: 'text-bg-secondary' },
};

@Component({
    selector: 'app-teacher-exams',
    imports: [DatePipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './exams.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherExamsPage {
    private readonly service = inject(TeacherCoursesService);

    protected readonly exams = signal<AsyncState<TeacherExamListItem[]>>(initial());

    protected readonly course = signal('');
    protected readonly year   = signal('');
    protected readonly status = signal('');

    protected readonly courseOptions = computed(() => {
        const list = this.exams().data ?? [];
        const seen = new Map<number, string>();
        for (const e of list) {
            if (!seen.has(e.courseId)) {
                const ay = e.academicYear != null ? ` (${e.academicYear}/${e.academicYear + 1})` : '';
                seen.set(e.courseId, `${e.courseTitle}${ay}`);
            }
        }
        return [...seen.entries()]
            .map(([courseId, label]) => ({ courseId, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    protected readonly years = computed(() =>
        [...new Set((this.exams().data ?? []).map(e => e.academicYear).filter((y): y is number => y != null))]
            .sort((a, b) => b - a),
    );

    protected readonly filtered = computed(() => {
        const list   = this.exams().data ?? [];
        const course = this.course();
        const year   = this.year();
        const status = this.status();
        return list.filter(e =>
            (!course || e.courseId === Number(course)) &&
            (!year   || e.academicYear === Number(year)) &&
            (!status || e.status === status),
        );
    });

    constructor() {
        this.load();
    }

    protected load(): void {
        this.exams.set(initial());
        this.service.allExams().subscribe({
            next: data => this.exams.set({ loading: false, data, error: null }),
            error: () => this.exams.set({ loading: false, data: null, error: 'Impossibile caricare gli appelli.' }),
        });
    }

    protected onCourse(event: Event): void {
        this.course.set((event.target as HTMLSelectElement).value);
    }
    protected onYear(event: Event): void {
        this.year.set((event.target as HTMLSelectElement).value);
    }
    protected onStatus(event: Event): void {
        this.status.set((event.target as HTMLSelectElement).value);
    }
    protected clearFilters(): void {
        this.course.set('');
        this.year.set('');
        this.status.set('');
    }

    protected courseSelected(id: number): boolean {
        return this.course() === String(id);
    }
    protected yearSelected(y: number): boolean {
        return this.year() === String(y);
    }

    protected statusLabel(s: ExamStatus): string {
        return STATUS_META[s].label;
    }
    protected statusBadge(s: ExamStatus): string {
        return STATUS_META[s].badge;
    }
}
