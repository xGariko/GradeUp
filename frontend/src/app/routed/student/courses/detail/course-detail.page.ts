import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { IonAlert, ToastController } from '@ionic/angular/standalone';
import {
    CourseDetailService,
    CourseDetail,
    CourseExam,
    CourseMaterial,
} from '$core/services/course-detail.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

interface AlertButton {
    text: string;
    role?: 'cancel' | 'destructive';
    handler?: () => void;
}

@Component({
    selector: 'app-course-detail',
    imports: [DatePipe, RouterLink, IonAlert, EmptyState, ErrorState],
    templateUrl: './course-detail.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailPage {
    private readonly service = inject(CourseDetailService);
    private readonly router  = inject(Router);
    private readonly route   = inject(ActivatedRoute);
    private readonly toast   = inject(ToastController);

    private readonly id = Number(this.route.snapshot.paramMap.get('id'));

    protected readonly course    = signal<AsyncState<CourseDetail>>(initial());
    protected readonly exams     = signal<AsyncState<CourseExam[]>>(initial());
    protected readonly materials = signal<AsyncState<CourseMaterial[]>>({ loading: false, data: [], error: null });
    protected readonly notFound  = signal(false);

    protected readonly submitting = signal(false);
    protected readonly bookingId  = signal<number | null>(null);
    protected readonly confirmOpen = signal(false);

    protected readonly data = computed(() => this.course().data);

    protected readonly seatsLeft = computed(() => {
        const c = this.data();
        return c && c.capacity != null ? Math.max(0, c.capacity - c.enrolled) : null;
    });
    protected readonly full       = computed(() => {
        const c = this.data();
        return !!c && c.capacity != null && c.enrolled >= c.capacity;
    });
    protected readonly registered      = computed(() => !!this.data()?.alreadyRegistered);
    protected readonly isActive        = computed(() => this.data()?.matriculationStatus === 'active');
    protected readonly isPending       = computed(() => this.data()?.matriculationStatus === 'pending');
    protected readonly notMatriculated = computed(() => this.data()?.matriculationStatus == null);
    protected readonly canRegister     = computed(() => this.isActive() && !this.registered() && !this.full());

    protected readonly alertButtons: AlertButton[] = [
        { text: 'Annulla', role: 'cancel', handler: () => this.confirmOpen.set(false) },
        { text: 'Disiscriviti', role: 'destructive', handler: () => { this.confirmOpen.set(false); this.unregister(); } },
    ];

    constructor() {
        this.loadCourse();
    }

    protected loadCourse(): void {
        if (!Number.isInteger(this.id) || this.id <= 0) {
            this.notFound.set(true);
            this.course.set({ loading: false, data: null, error: null });
            return;
        }
        this.course.set(initial());
        this.notFound.set(false);
        this.service.detail(this.id).subscribe({
            next: data => {
                this.course.set({ loading: false, data, error: null });
                this.loadExams();
                if (data.alreadyRegistered) {
                    this.loadMaterials();
                } else {
                    this.materials.set({ loading: false, data: [], error: null });
                }
            },
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.notFound.set(true);
                    this.course.set({ loading: false, data: null, error: null });
                } else {
                    this.course.set({ loading: false, data: null, error: 'Impossibile caricare il corso.' });
                }
            },
        });
    }

    protected loadExams(): void {
        this.exams.set(initial());
        this.service.exams(this.id).subscribe({
            next: data => this.exams.set({ loading: false, data, error: null }),
            error: () => this.exams.set({ loading: false, data: null, error: 'Impossibile caricare gli appelli.' }),
        });
    }

    protected loadMaterials(): void {
        this.materials.set(initial());
        this.service.materials(this.id).subscribe({
            next: data => this.materials.set({ loading: false, data, error: null }),
            error: () => this.materials.set({ loading: false, data: null, error: 'Impossibile caricare il materiale.' }),
        });
    }

    protected register(): void {
        const c = this.data();
        if (!c || this.submitting()) return;
        this.submitting.set(true);
        this.service.register(c.id).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.notify('Iscritto al corso.');
                this.loadCourse();
            },
            error: (err: unknown) => {
                this.submitting.set(false);
                void this.notify(this.errorMessage(err, 'Iscrizione non riuscita. Riprova.'));
                this.loadCourse();
            },
        });
    }

    protected askUnregister(): void {
        this.confirmOpen.set(true);
    }

    protected unregister(): void {
        const c = this.data();
        if (!c || this.submitting()) return;
        this.submitting.set(true);
        this.service.unregister(c.id).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.notify('Iscrizione annullata.');
                this.loadCourse();
            },
            error: (err: unknown) => {
                this.submitting.set(false);
                void this.notify(this.errorMessage(err, 'Operazione non riuscita. Riprova.'));
                this.loadCourse();
            },
        });
    }

    protected book(exam: CourseExam): void {
        if (this.bookingId() !== null) return;
        this.bookingId.set(exam.id);
        this.service.enroll(exam.id).subscribe({
            next: () => {
                this.bookingId.set(null);
                void this.notify('Prenotazione registrata.');
                this.loadExams();
            },
            error: (err: unknown) => {
                this.bookingId.set(null);
                void this.notify(this.errorMessage(err, 'Prenotazione non riuscita. Riprova.'));
                this.loadExams();
            },
        });
    }

    protected goCatalog(): void {
        this.router.navigateByUrl('/student/courses');
    }

    protected goMatriculation(): void {
        this.router.navigateByUrl('/student/matriculation');
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
