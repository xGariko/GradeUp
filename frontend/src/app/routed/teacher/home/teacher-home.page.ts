import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '$core/auth/auth.service';
import { TeacherDashboardService } from '$core/services/teacher-dashboard.service';
import { NotificationService } from '$core/services/notification.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';
import type {
    TeacherCurrentCourse, TeacherUpcomingExam, TeacherExamToGrade, NotificationItem,
} from '$shared/types/dashboard';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

@Component({
    selector: 'app-teacher-home',
    imports: [DatePipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './teacher-home.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherHomePage {
    private readonly auth   = inject(AuthService);
    private readonly dash   = inject(TeacherDashboardService);
    private readonly notif  = inject(NotificationService);
    private readonly router = inject(Router);

    protected readonly courses = signal<AsyncState<TeacherCurrentCourse[]>>(initial());
    protected readonly exams   = signal<AsyncState<TeacherUpcomingExam[]>>(initial());
    protected readonly grading = signal<AsyncState<TeacherExamToGrade[]>>(initial());
    protected readonly notifs  = signal<AsyncState<NotificationItem[]>>(initial());

    protected readonly surname = computed(() => this.auth.user()?.surname ?? '');

    protected readonly gradingCount = computed(() => {
        const list = this.grading().data;
        return list ? list.reduce((sum, e) => sum + e.pendingCount, 0) : 0;
    });
    protected readonly gradingProminent = computed(() => this.gradingCount() > 0);

    constructor() {
        this.loadAll();
    }

    protected loadAll(): void {
        this.loadCourses();
        this.loadExams();
        this.loadGrading();
        this.loadNotifs();
    }

    protected loadCourses(): void {
        this.courses.set(initial());
        this.dash.currentCourses().subscribe({
            next: data => this.courses.set({ loading: false, data, error: null }),
            error: () => this.courses.set({ loading: false, data: null, error: 'Impossibile caricare i corsi.' }),
        });
    }
    protected loadExams(): void {
        this.exams.set(initial());
        this.dash.upcomingExams().subscribe({
            next: data => this.exams.set({ loading: false, data, error: null }),
            error: () => this.exams.set({ loading: false, data: null, error: 'Impossibile caricare gli appelli.' }),
        });
    }
    protected loadGrading(): void {
        this.grading.set(initial());
        this.dash.examsToGrade().subscribe({
            next: data => this.grading.set({ loading: false, data, error: null }),
            error: () => this.grading.set({ loading: false, data: null, error: 'Impossibile caricare gli esami da verbalizzare.' }),
        });
    }
    protected loadNotifs(): void {
        this.notifs.set(initial());
        this.notif.listMine().subscribe({
            next: data => this.notifs.set({ loading: false, data, error: null }),
            error: () => this.notifs.set({ loading: false, data: null, error: 'Impossibile caricare le notifiche.' }),
        });
    }

    protected nav(url: string): void {
        this.router.navigateByUrl(url);
    }

    protected semesterLabel(semester: number): string {
        return semester === 1 || semester === 2 ? `${semester}° semestre` : 'Semestre n/d';
    }

    protected severityIcon(s: NotificationItem['severity']): string {
        switch (s) {
            case 'success': return 'check-circle';
            case 'warning': return 'exclamation-triangle';
            case 'danger':  return 'exclamation-octagon';
            default:        return 'info-circle';
        }
    }

    protected severityClass(s: NotificationItem['severity']): string {
        return `text-${s}-emphasis`;
    }
}
