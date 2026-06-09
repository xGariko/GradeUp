import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '$core/auth/auth.service';
import { StudentDashboardService } from '$core/services/student-dashboard.service';
import { NotificationService } from '$core/services/notification.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';
import type {
    StudentCareerSummary, StudentUpcomingExam,
    StudentCurrentCourse, StudentCfuProgress, NotificationItem,
} from '$shared/types/dashboard';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

interface CareerBanner {
    cardClass: string;
    iconClass: string;
    icon: string;
    title: string;
    message: string;
    cta: { label: string; link: string } | null;
    details: StudentCareerSummary | null;
}

@Component({
    selector: 'app-student-home',
    imports: [DatePipe, DecimalPipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './home.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
    private readonly auth   = inject(AuthService);
    private readonly dash   = inject(StudentDashboardService);
    private readonly notif  = inject(NotificationService);
    private readonly router = inject(Router);

    protected readonly career  = signal<AsyncState<StudentCareerSummary>>(initial());
    protected readonly exams   = signal<AsyncState<StudentUpcomingExam[]>>(initial());
    protected readonly courses = signal<AsyncState<StudentCurrentCourse[]>>(initial());
    protected readonly cfu     = signal<AsyncState<StudentCfuProgress>>(initial());
    protected readonly notifs  = signal<AsyncState<NotificationItem[]>>(initial());

    protected readonly firstName = computed(() => this.auth.user()?.name ?? '');

    protected readonly cfuPercent = computed(() => {
        const c = this.cfu().data;
        if (!c || c.total === 0) return 0;
        return Math.round((c.acquired / c.total) * 100);
    });

    protected readonly careerBanner = computed<CareerBanner | null>(() => {
        const c = this.career().data;
        if (!c) return null;
        switch (c.status) {
            case 'not_matriculated':
                return {
                    cardClass: 'bg-success-subtle border-success-subtle',
                    iconClass: 'text-success-emphasis',
                    icon: 'mortarboard',
                    title: `Benvenuto, ${this.firstName()}`,
                    message: 'Sei pronto a partire? Immatricolati per iniziare la tua carriera.',
                    cta: { label: 'Immatricolati ora', link: '/student/matriculation' },
                    details: null,
                };
            case 'pending':
                return {
                    cardClass: 'bg-warning-subtle border-warning-subtle',
                    iconClass: 'text-warning-emphasis',
                    icon: 'hourglass-split',
                    title: 'Immatricolazione in attesa di approvazione',
                    message: 'La segreteria sta verificando la tua richiesta.',
                    cta: null,
                    details: null,
                };
            case 'suspended':
            case 'inactive':
                return {
                    cardClass: 'bg-danger-subtle border-danger-subtle',
                    iconClass: 'text-danger-emphasis',
                    icon: 'exclamation-octagon',
                    title: 'Carriera sospesa',
                    message: 'Contatta la segreteria per regolarizzare la tua posizione.',
                    cta: null,
                    details: null,
                };
            case 'graduated':
                return {
                    cardClass: 'bg-success-subtle border-success-subtle',
                    iconClass: 'text-success-emphasis',
                    icon: 'award',
                    title: 'Congratulazioni',
                    message: 'Hai concluso il tuo percorso di studi.',
                    cta: null,
                    details: c,
                };
            default:
                return {
                    cardClass: '',
                    iconClass: 'text-body-secondary',
                    icon: 'mortarboard',
                    title: 'La tua carriera',
                    message: '',
                    cta: null,
                    details: c,
                };
        }
    });

    constructor() {
        this.loadAll();
    }

    protected loadAll(): void {
        this.loadCareer();
        this.loadExams();
        this.loadCourses();
        this.loadCfu();
        this.loadNotifs();
    }

    protected loadCareer(): void {
        this.career.set(initial());
        this.dash.careerSummary().subscribe({
            next: data => this.career.set({ loading: false, data, error: null }),
            error: () => this.career.set({ loading: false, data: null, error: 'Impossibile caricare lo stato carriera.' }),
        });
    }
    protected loadExams(): void {
        this.exams.set(initial());
        this.dash.upcomingExams().subscribe({
            next: data => this.exams.set({ loading: false, data, error: null }),
            error: () => this.exams.set({ loading: false, data: null, error: 'Impossibile caricare gli appelli.' }),
        });
    }
    protected loadCourses(): void {
        this.courses.set(initial());
        this.dash.currentRegistrations().subscribe({
            next: data => this.courses.set({ loading: false, data, error: null }),
            error: () => this.courses.set({ loading: false, data: null, error: 'Impossibile caricare i corsi.' }),
        });
    }
    protected loadCfu(): void {
        this.cfu.set(initial());
        this.dash.cfuProgress().subscribe({
            next: data => this.cfu.set({ loading: false, data, error: null }),
            error: () => this.cfu.set({ loading: false, data: null, error: 'Impossibile caricare il progresso CFU.' }),
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
