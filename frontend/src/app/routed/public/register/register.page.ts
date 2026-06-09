import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import { AuthService } from '$core/auth/auth.service';
import { zodValidator } from '$core/validators/zod.validator';

const nameSchema = z.string().min(2, 'Minimo 2 caratteri').max(40, 'Massimo 40 caratteri');
const birthdateSchema = z
    .string()
    .min(1, 'Inserisci la data di nascita')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida');
const taxcodeSchema = z
    .string()
    .min(1, 'Inserisci il codice fiscale')
    .length(16, 'Il codice fiscale deve avere 16 caratteri');
const emailSchema = z.string().min(1, 'Inserisci la tua email').email('Email non valida');
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
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './register.page.html',
    styleUrl: './register.page.scss',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
    private readonly fb     = inject(FormBuilder);
    private readonly auth   = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly submitting  = signal(false);
    protected readonly errorBanner = signal<string | null>(null);
    protected readonly emailTaken  = signal(false);

    protected readonly form = this.fb.nonNullable.group(
        {
            name:            ['', [zodValidator(nameSchema)]],
            surname:         ['', [zodValidator(nameSchema)]],
            birthdate:       ['', [zodValidator(birthdateSchema)]],
            taxcode:         ['', [zodValidator(taxcodeSchema)]],
            email:           ['', [zodValidator(emailSchema)]],
            password:        ['', [zodValidator(passwordSchema)]],
            confirmPassword: ['', [zodValidator(confirmSchema)]],
            acceptTerms:     [false, [Validators.requiredTrue]],
        },
        { validators: passwordsMatch },
    );

    protected fieldError(name: 'name' | 'surname' | 'birthdate' | 'taxcode' | 'email' | 'password'): string | null {
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

    protected termsError(): string | null {
        const control = this.form.controls.acceptTerms;
        return control.touched && control.invalid ? 'Devi accettare i termini per continuare' : null;
    }

    protected async submit(): Promise<void> {
        if (this.submitting()) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorBanner.set(null);
        this.emailTaken.set(false);
        const value = this.form.getRawValue();
        try {
            await this.auth.register({
                name:      value.name.trim(),
                surname:   value.surname.trim(),
                birthdate: value.birthdate,
                taxcode:   value.taxcode.trim().toUpperCase(),
                email:     value.email.trim(),
                password:  value.password,
            });
            this.router.navigate(['/student/home']);
        } catch (err) {
            if (err instanceof HttpErrorResponse && err.status === 409) {
                this.emailTaken.set(true);
            } else {
                this.errorBanner.set(this.messageFor(err));
            }
            this.submitting.set(false);
        }
    }

    private messageFor(err: unknown): string {
        if (err instanceof HttpErrorResponse) {
            if (err.status === 0)   return 'Non riusciamo a contattare il server. Controlla la connessione e riprova.';
            if (err.status === 429) return 'Troppi tentativi. Riprova tra qualche minuto.';
        }
        return 'Registrazione non riuscita. Riprova.';
    }
}
