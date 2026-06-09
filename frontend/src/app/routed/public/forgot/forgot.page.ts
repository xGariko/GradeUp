import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { z } from 'zod';
import { AuthService } from '$core/auth/auth.service';
import { zodValidator } from '$core/validators/zod.validator';

const emailSchema = z.string().min(1, 'Inserisci la tua email').email('Email non valida');

@Component({
    selector: 'app-forgot',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './forgot.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPage {
    private readonly fb   = inject(FormBuilder);
    private readonly auth = inject(AuthService);

    protected readonly submitting  = signal(false);
    protected readonly sent        = signal(false);
    protected readonly errorBanner = signal<string | null>(null);

    protected readonly form = this.fb.nonNullable.group({
        email: ['', [zodValidator(emailSchema)]],
    });

    protected fieldError(): string | null {
        const control = this.form.controls.email;
        return control.touched && control.invalid ? (control.getError('zod') as string) : null;
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
            await this.auth.forgotPassword(this.form.getRawValue().email.trim());
            this.sent.set(true);
        } catch (err) {
            this.errorBanner.set(
                err instanceof HttpErrorResponse && err.status === 429
                    ? 'Troppi tentativi. Riprova tra qualche minuto.'
                    : 'Non riusciamo a inviare la richiesta. Riprova.',
            );
            this.submitting.set(false);
        }
    }
}
