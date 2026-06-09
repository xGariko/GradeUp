import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import { AuthService } from '$core/auth/auth.service';
import { zodValidator } from '$core/validators/zod.validator';

const passwordSchema = z
    .string()
    .min(8, 'Minimo 8 caratteri')
    .regex(/[0-9]/, 'Deve contenere almeno un numero')
    .regex(/[A-Za-z]/, 'Deve contenere almeno una lettera');
const confirmSchema = z.string().min(1, 'Conferma la password');

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
    selector: 'app-reset',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './reset.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPage {
    private readonly fb    = inject(FormBuilder);
    private readonly auth  = inject(AuthService);
    private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

    protected readonly submitting   = signal(false);
    protected readonly done         = signal(false);
    protected readonly tokenInvalid = signal(!this.token);
    protected readonly errorBanner  = signal<string | null>(null);

    protected readonly form = this.fb.nonNullable.group(
        {
            password:        ['', [zodValidator(passwordSchema)]],
            confirmPassword: ['', [zodValidator(confirmSchema)]],
        },
        { validators: passwordsMatch },
    );

    protected fieldError(name: 'password'): string | null {
        const control = this.form.controls[name];
        return control.touched && control.invalid ? (control.getError('zod') as string) : null;
    }

    protected confirmError(): string | null {
        const control = this.form.controls.confirmPassword;
        if (!control.touched) return null;
        if (control.hasError('zod')) return control.getError('zod') as string;
        if (this.form.hasError('passwordMismatch')) return 'Le password non coincidono';
        return null;
    }

    protected async submit(): Promise<void> {
        if (this.submitting() || !this.token) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorBanner.set(null);
        try {
            await this.auth.resetPassword(this.token, this.form.getRawValue().password);
            this.done.set(true);
        } catch (err) {
            if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 410)) {
                this.tokenInvalid.set(true);
            } else {
                this.errorBanner.set('Non riusciamo a salvare la nuova password. Riprova.');
                this.submitting.set(false);
            }
        }
    }
}
