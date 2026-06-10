import { CanDeactivateFn } from '@angular/router';

export interface HasPendingChanges {
    hasUnsavedChanges(): boolean;
}

export const pendingChangesGuard: CanDeactivateFn<HasPendingChanges> = component => {
    if (!component.hasUnsavedChanges()) return true;
    return confirm('Hai modifiche non salvate. Uscire comunque?');
};
