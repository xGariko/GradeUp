import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { z } from 'zod';
import { MatriculationService } from '$core/services/matriculation.service';
import { zodValidator } from '$core/validators/zod.validator';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';
import type { Degree } from '$shared/types/degree';
import type { DegreeType } from '$shared/types/enums';
import type { Matriculation } from '$shared/types/matriculation';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

const academicYearSchema = z.string().regex(/^\d{4}\/\d{4}$/, 'Formato AAAA/AAAA');

const TYPE_LABELS: Record<DegreeType, string> = {
    bachelor: 'Triennale',
    master:   'Magistrale',
    phd:      'Dottorato',
    diploma:  'Diploma',
};

@Component({
    selector: 'app-matriculation',
    imports: [ReactiveFormsModule, RouterLink, EmptyState, ErrorState],
    templateUrl: './matriculation.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatriculationPage {
    private readonly fb      = inject(FormBuilder);
    private readonly service = inject(MatriculationService);
    private readonly router  = inject(Router);

    protected readonly typeLabels  = TYPE_LABELS;
    protected readonly degreeTypes: DegreeType[] = ['bachelor', 'master', 'phd', 'diploma'];

    protected readonly step        = signal<1 | 2 | 3>(1);
    protected readonly degrees     = signal<AsyncState<Degree[]>>(initial());
    protected readonly selected    = signal<Degree | null>(null);
    protected readonly submitting   = signal(false);
    protected readonly errorBanner = signal<string | null>(null);
    protected readonly result      = signal<Matriculation | null>(null);

    protected readonly filterType     = signal<DegreeType | ''>('');
    protected readonly filterDept     = signal('');
    protected readonly filterDuration = signal('');

    protected readonly departments = computed(() =>
        [...new Set((this.degrees().data ?? []).map(d => d.department))].sort(),
    );

    protected readonly durations = computed(() =>
        [...new Set((this.degrees().data ?? []).map(d => d.duration))].sort((a, b) => a - b),
    );

    protected readonly filtered = computed(() => {
        const type = this.filterType();
        const dept = this.filterDept();
        const dur  = this.filterDuration();
        return (this.degrees().data ?? []).filter(d =>
            (!type || d.type === type) &&
            (!dept || d.department === dept) &&
            (!dur  || d.duration === Number(dur)),
        );
    });

    protected readonly form = this.fb.nonNullable.group({
        academicYear: [this.suggestedYear(), [zodValidator(academicYearSchema)]],
        accept:       [false, [Validators.requiredTrue]],
    });

    constructor() {
        this.loadDegrees();
    }

    protected loadDegrees(): void {
        this.degrees.set(initial());
        this.service.openDegrees().subscribe({
            next: data => this.degrees.set({ loading: false, data, error: null }),
            error: () => this.degrees.set({ loading: false, data: null, error: 'Impossibile caricare i corsi di laurea.' }),
        });
    }

    protected onType(event: Event): void {
        this.filterType.set((event.target as HTMLSelectElement).value as DegreeType | '');
    }
    protected onDept(event: Event): void {
        this.filterDept.set((event.target as HTMLSelectElement).value);
    }
    protected onDuration(event: Event): void {
        this.filterDuration.set((event.target as HTMLSelectElement).value);
    }

    protected select(degree: Degree): void {
        this.selected.set(degree);
        this.errorBanner.set(null);
        this.form.reset({ academicYear: this.suggestedYear(), accept: false });
        this.step.set(2);
    }

    protected back(): void {
        if (this.submitting()) return;
        this.step.set(1);
    }

    protected confirm(): void {
        const degree = this.selected();
        if (!degree || this.submitting()) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.submitting.set(true);
        this.errorBanner.set(null);
        this.service.matriculate({ id_degree: degree.id, academic_year: this.form.getRawValue().academicYear }).subscribe({
            next: res => {
                this.result.set(res);
                this.step.set(3);
                this.submitting.set(false);
            },
            error: (err: unknown) => {
                this.submitting.set(false);
                if (err instanceof HttpErrorResponse && err.status === 409) {
                    this.errorBanner.set('Risulti gia immatricolato. Ti riportiamo alla home.');
                    setTimeout(() => this.router.navigateByUrl('/student/home'), 3000);
                } else {
                    this.errorBanner.set('Non riusciamo a completare l\'immatricolazione. Riprova.');
                }
            },
        });
    }

    protected fieldError(name: 'academicYear'): string | null {
        const control = this.form.controls[name];
        return control.touched && control.invalid ? (control.getError('zod') as string) : null;
    }

    protected statusLabel(status: Matriculation['status'] | undefined): string {
        switch (status) {
            case 'active':  return 'Attiva';
            case 'pending': return 'In attesa di approvazione';
            default:        return status ?? '';
        }
    }

    private suggestedYear(): string {
        const now = new Date();
        const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        return `${start}/${start + 1}`;
    }
}
