import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '$core/auth/auth.service';

export const teacherGuard: CanActivateFn = () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) return router.createUrlTree(['/auth/login']);
    if (auth.role() !== 'teacher') return router.createUrlTree(['/student/home']);

    return true;
};
