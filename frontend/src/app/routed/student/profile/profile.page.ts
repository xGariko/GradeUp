import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import { AuthService } from '$core/auth/auth.service';
import { MeService } from '$core/services/me.service';
import { StudentDashboardService } from '$core/services/student-dashboard.service';
import { ToastService } from '$core/toast/toast.service';
import { zodValidator } from '$core/validators/zod.validator';
import { ErrorState } from '$components/error-state/error-state';
import type { StudentCareerSummary } from '$shared/types/dashboard';

const nameSchema    = z.string().min(1, 'Campo obbligatorio').max(40, 'Max 40 caratteri');
const mobileSchema  = z.string().max(20, 'Max 20 caratteri').optional();
const currentSchema = z.string().min(1, 'Inserisci la password attuale');
const newSchema     = z.string().min(8, 'Minimo 8 caratteri').max(255, 'Max 255 caratteri');

const READ_ONLY_STATUSES = new Set<string>(['suspended', 'withdrawn', 'graduated']);

const STATUS_LABELS: Record<string, string> = {
    not_matriculated: 'Non immatricolato',
    pending:          'In attesa di approvazione',
    active:           'Attiva',
    suspended:        'Sospesa',
    withdrawn:        'Ritirata',
    graduated:        'Conseguita',
};

@Component({
    selector: 'app-profile',
    imports: [ReactiveFormsModule, ErrorState],
    templateUrl: './profile.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
    private readonly fb     = inject(FormBuilder);
    private readonly me     = inject(MeService);
    private readonly dash   = inject(StudentDashboardService);
    private readonly toasts = inject(ToastService);
    protected readonly auth = inject(AuthService);

    protected readonly career        = signal<StudentCareerSummary | null>(null);
    protected readonly careerLoading = signal(true);
    protected readonly careerError   = signal<string | null>(null);

    protected readonly savingProfile = signal(false);
    protected readonly profileError  = signal<string | null>(null);

    protected readonly savingPassword = signal(false);
    protected readonly passwordError  = signal<string | null>(null);

    protected readonly showCurrent = signal(false);
    protected readonly showNew     = signal(false);

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

    protected readonly email = computed(() => this.auth.user()?.email ?? '');

    protected readonly readOnly = computed(() => {
        const c = this.career();
        return !!c && READ_ONLY_STATUSES.has(c.status);
    });

    protected readonly statusLabel = computed(() => {
        const c = this.career();
        return c ? (STATUS_LABELS[c.status] ?? c.status) : '';
    });

    constructor() {
        this.loadCareer();
    }

    protected loadCareer(): void {
        this.careerLoading.set(true);
        this.careerError.set(null);
        this.dash.careerSummary().subscribe({
            next: data => {
                this.career.set(data);
                this.careerLoading.set(false);
                if (READ_ONLY_STATUSES.has(data.status)) this.profileForm.disable();
            },
            error: () => {
                this.careerError.set('Impossibile caricare i dati di carriera.');
                this.careerLoading.set(false);
            },
        });
    }

    protected profileFieldError(field: 'name' | 'surname' | 'mobile'): string | null {
        const ctrl = this.profileForm.controls[field];
        return ctrl.invalid && (ctrl.dirty || ctrl.touched) ? (ctrl.getError('zod') as string) : null;
    }

    protected passwordFieldError(field: 'currentPassword' | 'newPassword'): string | null {
        const ctrl = this.passwordForm.controls[field];
        return ctrl.invalid && (ctrl.dirty || ctrl.touched) ? (ctrl.getError('zod') as string) : null;
    }

    protected showConfirmMismatch(): boolean {
        const c = this.passwordForm.controls;
        return c.confirmPassword.touched && c.confirmPassword.value !== c.newPassword.value;
    }

    protected saveProfile(): void {
        if (this.savingProfile() || this.readOnly()) return;
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }
        this.savingProfile.set(true);
        this.profileError.set(null);

        const dto = this.profileForm.getRawValue();
        this.me.updateProfile({ name: dto.name, surname: dto.surname, mobile: dto.mobile || null }).subscribe({
            next: res => {
                this.savingProfile.set(false);
                this.auth.updateUser(res.user);
                this.profileForm.markAsPristine();
                void this.notify('Dati aggiornati.');
            },
            error: (err: unknown) => {
                this.savingProfile.set(false);
                this.profileError.set(this.errorMessage(err, 'Errore durante il salvataggio.'));
            },
        });
    }

    protected changePassword(): void {
        if (this.savingPassword()) return;
        if (this.passwordForm.invalid || this.showConfirmMismatch()) {
            this.passwordForm.markAllAsTouched();
            return;
        }
        const v = this.passwordForm.getRawValue();
        if (v.currentPassword === v.newPassword) {
            this.passwordError.set('La nuova password deve essere diversa da quella attuale.');
            return;
        }
        this.savingPassword.set(true);
        this.passwordError.set(null);

        this.me.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }).subscribe({
            next: () => {
                this.savingPassword.set(false);
                this.passwordForm.reset();
                void this.notify('Password aggiornata.');
            },
            error: (err: unknown) => {
                this.savingPassword.set(false);
                this.passwordError.set(this.errorMessage(err, 'Errore durante il cambio password.'));
            },
        });
    }

    protected logout(): void {
        this.auth.logout();
    }

    private errorMessage(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse && err.error && typeof err.error.error === 'string') {
            return err.error.error;
        }
        return fallback;
    }

    private notify(message: string): void {
        this.toasts.show(message);
    }
}
