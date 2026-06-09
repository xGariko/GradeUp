import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import { AuthService } from '$core/auth/auth.service';
import { zodValidator } from '$core/validators/zod.validator';

const emailSchema = z.string().min(1, 'Inserisci la tua email').email('Email non valida');
const passwordSchema = z
    .string()
    .min(1, 'Inserisci la password')
    .min(8, 'La password deve avere almeno 8 caratteri');

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './login.page.html',
    styleUrl: './login.page.scss',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
    private readonly fb     = inject(FormBuilder);
    private readonly auth   = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route  = inject(ActivatedRoute);

    protected readonly submitting   = signal(false);
    protected readonly errorBanner  = signal<string | null>(null);
    protected readonly showPassword = signal(false);

    protected readonly form = this.fb.nonNullable.group({
        email:    ['', [zodValidator(emailSchema)]],
        password: ['', [zodValidator(passwordSchema)]],
    });

    protected fieldError(name: 'email' | 'password'): string | null {
        const control = this.form.controls[name];
        return control.touched && control.invalid ? (control.getError('zod') as string) : null;
    }

    protected togglePassword(): void {
        this.showPassword.update(v => !v);
    }

    protected async submit(): Promise<void> {
        if (this.submitting()) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorBanner.set(null);
        try {
            await this.auth.login(this.form.getRawValue());
            const redirect = this.route.snapshot.queryParamMap.get('redirect');
            if (redirect) {
                this.router.navigateByUrl(redirect);
            } else {
                this.router.navigate([this.auth.role() === 'teacher' ? '/teacher/home' : '/student/home']);
            }
        } catch (err) {
            this.errorBanner.set(this.messageFor(err));
            this.submitting.set(false);
        }
    }

    private messageFor(err: unknown): string {
        if (err instanceof HttpErrorResponse) {
            if (err.status === 0)   return 'Non riusciamo a contattare il server. Controlla la connessione e riprova.';
            if (err.status === 401) return 'Email o password non corretti.';
            if (err.status === 403) return 'Account non attivo. Contatta la segreteria.';
            if (err.status === 429) return 'Troppi tentativi falliti. Riprova tra qualche minuto.';
        }
        return 'Accesso non riuscito. Riprova.';
    }
}
