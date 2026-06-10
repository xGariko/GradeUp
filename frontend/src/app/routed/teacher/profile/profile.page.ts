import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import { AuthService } from '$core/auth/auth.service';
import { MeService, TeacherProfileInfo } from '$core/services/me.service';
import { ToastService } from '$core/toast/toast.service';
import { zodValidator } from '$core/validators/zod.validator';
import { ErrorState } from '$components/error-state/error-state';

const nameSchema    = z.string().min(1, 'Campo obbligatorio').max(40, 'Max 40 caratteri');
const mobileSchema  = z.string().max(20, 'Max 20 caratteri').optional();
const currentSchema = z.string().min(1, 'Inserisci la password attuale');
const newSchema     = z.string().min(8, 'Minimo 8 caratteri').max(255, 'Max 255 caratteri');

const STATUS_LABELS: Record<string, string> = {
    active:   'Attivo',
    inactive: 'Inattivo',
    on_leave: 'In aspettativa',
    retired:  'In pensione',
};

const CONTRACT_LABELS: Record<string, string> = {
    full_time: 'Tempo pieno',
    part_time: 'Tempo parziale',
    visiting:  'Visiting professor',
    adjunct:   'Docente a contratto',
    emeritus:  'Emerito',
};

@Component({
    selector: 'app-teacher-profile',
    imports: [ReactiveFormsModule, ErrorState],
    templateUrl: './profile.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherProfilePage {
    private readonly fb     = inject(FormBuilder);
    private readonly me     = inject(MeService);
    private readonly toasts = inject(ToastService);
    protected readonly auth = inject(AuthService);

    protected readonly contract        = signal<TeacherProfileInfo | null>(null);
    protected readonly contractLoading = signal(true);
    protected readonly contractError   = signal<string | null>(null);

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
        const c = this.contract();
        return !!c && c.status !== 'active';
    });

    protected readonly statusLabel  = computed(() => this.labelOf(STATUS_LABELS, this.contract()?.status));
    protected readonly contractLabel = computed(() => this.labelOf(CONTRACT_LABELS, this.contract()?.contractType));

    constructor() {
        this.loadContract();
    }

    protected loadContract(): void {
        this.contractLoading.set(true);
        this.contractError.set(null);
        this.me.teacherProfile().subscribe({
            next: data => {
                this.contract.set(data);
                this.contractLoading.set(false);
                if (data.status !== 'active') this.profileForm.disable();
            },
            error: () => {
                this.contractError.set('Impossibile caricare i dati contrattuali.');
                this.contractLoading.set(false);
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

    private labelOf(map: Record<string, string>, key: string | undefined): string {
        return key ? (map[key] ?? key) : '';
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
