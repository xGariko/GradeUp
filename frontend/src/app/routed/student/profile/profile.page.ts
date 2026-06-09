import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import {
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonInput, IonNote, IonButton, IonIcon, IonSpinner,
    IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    personOutline, schoolOutline, lockClosedOutline, logOutOutline,
    saveOutline, alertCircleOutline, checkmarkCircleOutline,
} from 'ionicons/icons';
import { AuthService } from '$core/auth/auth.service';
import { MeService } from '$core/services/me.service';
import { StudentDashboardService } from '$core/services/student-dashboard.service';
import { zodValidator } from '$core/validators/zod.validator';
import type { StudentCareerSummary } from '$shared/types/dashboard';

const nameSchema   = z.string().min(1, 'Campo obbligatorio').max(40, 'Max 40 caratteri');
const mobileSchema = z.string().max(20, 'Max 20 caratteri').optional();
const currentSchema = z.string().min(1, 'Inserisci la password attuale');
const newSchema     = z.string().min(8, 'Minimo 8 caratteri');

type FeedbackKind = 'success' | 'error';
interface Feedback { kind: FeedbackKind; message: string; }

@Component({
    selector: 'app-profile',
    imports: [
        ReactiveFormsModule,
        IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
        IonList, IonItem, IonInput, IonNote, IonButton, IonIcon, IonSpinner,
        IonBadge,
    ],
    templateUrl: './profile.page.html',
    styleUrl: './profile.page.scss',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
    private readonly fb       = inject(FormBuilder);
    private readonly me       = inject(MeService);
    private readonly dash     = inject(StudentDashboardService);
    protected readonly auth   = inject(AuthService);

    protected readonly career         = signal<StudentCareerSummary | null>(null);
    protected readonly careerLoading  = signal(true);
    protected readonly careerError    = signal<string | null>(null);

    protected readonly savingProfile  = signal(false);
    protected readonly profileFeedback = signal<Feedback | null>(null);

    protected readonly savingPassword   = signal(false);
    protected readonly passwordFeedback = signal<Feedback | null>(null);

    protected readonly profileForm = this.fb.nonNullable.group({
        name:    [this.auth.user()?.name    ?? '', zodValidator(nameSchema)],
        surname: [this.auth.user()?.surname ?? '', zodValidator(nameSchema)],
        mobile:  [this.auth.user()?.mobile  ?? '', zodValidator(mobileSchema)],
    });

    protected readonly passwordForm = this.fb.nonNullable.group({
        currentPassword: ['', zodValidator(currentSchema)],
        newPassword:     ['', zodValidator(newSchema)],
        confirmPassword: [''],
    });

    protected readonly initials = computed(() => {
        const u = this.auth.user();
        if (!u) return '';
        return `${u.name[0] ?? ''}${u.surname[0] ?? ''}`.toUpperCase();
    });

    protected readonly fullName = computed(() => {
        const u = this.auth.user();
        return u ? `${u.name} ${u.surname}` : '';
    });

    constructor() {
        addIcons({
            personOutline, schoolOutline, lockClosedOutline, logOutOutline,
            saveOutline, alertCircleOutline, checkmarkCircleOutline,
        });
        this.loadCareer();
    }

    protected loadCareer(): void {
        this.careerLoading.set(true);
        this.careerError.set(null);
        this.dash.careerSummary().subscribe({
            next: data => {
                this.career.set(data);
                this.careerLoading.set(false);
            },
            error: () => {
                this.careerError.set('Impossibile caricare i dati di carriera');
                this.careerLoading.set(false);
            },
        });
    }

    protected showProfileError(field: 'name' | 'surname' | 'mobile'): boolean {
        const ctrl = this.profileForm.controls[field];
        return ctrl.invalid && (ctrl.dirty || ctrl.touched);
    }

    protected showPasswordError(field: 'currentPassword' | 'newPassword'): boolean {
        const ctrl = this.passwordForm.controls[field];
        return ctrl.invalid && (ctrl.dirty || ctrl.touched);
    }

    protected showConfirmMismatch(): boolean {
        const c = this.passwordForm.controls;
        return c.confirmPassword.touched && c.confirmPassword.value !== c.newPassword.value;
    }

    protected async saveProfile(): Promise<void> {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }
        this.savingProfile.set(true);
        this.profileFeedback.set(null);

        const dto = this.profileForm.getRawValue();
        this.me.updateProfile({
            name:    dto.name,
            surname: dto.surname,
            mobile:  dto.mobile || null,
        }).subscribe({
            next: () => {
                this.savingProfile.set(false);
                this.profileFeedback.set({ kind: 'success', message: 'Dati aggiornati' });
            },
            error: (err: unknown) => {
                this.savingProfile.set(false);
                this.profileFeedback.set({
                    kind: 'error',
                    message: err instanceof HttpErrorResponse
                        ? ((err.error as { error?: string })?.error ?? 'Errore durante il salvataggio')
                        : 'Errore di connessione',
                });
            },
        });
    }

    protected async changePassword(): Promise<void> {
        if (this.passwordForm.invalid || this.showConfirmMismatch()) {
            this.passwordForm.markAllAsTouched();
            return;
        }
        const v = this.passwordForm.getRawValue();
        if (v.currentPassword === v.newPassword) {
            this.passwordFeedback.set({ kind: 'error', message: 'La nuova password deve essere diversa' });
            return;
        }
        this.savingPassword.set(true);
        this.passwordFeedback.set(null);

        this.me.changePassword({
            currentPassword: v.currentPassword,
            newPassword:     v.newPassword,
        }).subscribe({
            next: () => {
                this.savingPassword.set(false);
                this.passwordFeedback.set({ kind: 'success', message: 'Password aggiornata' });
                this.passwordForm.reset();
            },
            error: (err: unknown) => {
                this.savingPassword.set(false);
                this.passwordFeedback.set({
                    kind: 'error',
                    message: err instanceof HttpErrorResponse
                        ? ((err.error as { error?: string })?.error ?? 'Errore durante il cambio password')
                        : 'Errore di connessione',
                });
            },
        });
    }

    protected logout(): void {
        this.auth.logout();
    }
}
