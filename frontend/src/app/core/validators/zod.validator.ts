import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

type SafeParseSchema = {
    safeParse(value: unknown): { success: true } | { success: false; error: { issues: Array<{ message: string }> } };
};

export function zodValidator(schema: SafeParseSchema): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const result = schema.safeParse(control.value);
        if (result.success) return null;
        return { zod: !result.success ? (result.error.issues[0]?.message ?? 'Valore non valido') : 'Valore non valido' };
    };
}
