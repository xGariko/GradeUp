import { Routes } from '@angular/router';
import { guestGuard }   from '$core/guards/guest.guard';
import { studentGuard } from '$core/guards/student.guard';
import { teacherGuard } from '$core/guards/teacher.guard';

export const routes: Routes = [
    {
        path: 'auth',
        loadComponent: () => import('$routed/public/public.shell').then(m => m.PublicShell),
        canActivate: [guestGuard],
        children: [
            {
                path: 'login',
                loadComponent: () => import('$routed/public/login/login.page').then(m => m.LoginPage),
            },
            {
                path: 'register',
                loadComponent: () => import('$routed/public/register/register.page').then(m => m.RegisterPage),
            },
            {
                path: 'forgot',
                loadComponent: () => import('$routed/public/forgot/forgot.page').then(m => m.ForgotPage),
            },
            {
                path: 'reset',
                loadComponent: () => import('$routed/public/reset/reset.page').then(m => m.ResetPage),
            },
            { path: '', redirectTo: 'login', pathMatch: 'full' },
        ],
    },

    {
        path: 'student',
        loadComponent: () => import('$routed/student/student.shell').then(m => m.StudentShell),
        canActivate: [studentGuard],
        children: [
            {
                path: 'home',
                title: 'Home',
                loadComponent: () => import('$routed/student/home/home.page').then(m => m.HomePage),
            },
            {
                path: 'matriculation',
                title: 'Immatricolazione',
                loadComponent: () => import('$routed/student/matriculation/matriculation.page').then(m => m.MatriculationPage),
            },
            {
                path: 'study-plan',
                title: 'Piano di studi',
                loadComponent: () => import('$routed/student/study-plan/study-plan.page').then(m => m.StudyPlanPage),
            },
            {
                path: 'registrations',
                title: 'Le mie iscrizioni',
                loadComponent: () => import('$routed/student/registrations/registrations.page').then(m => m.RegistrationsPage),
            },
            {
                path: 'courses',
                title: 'Catalogo corsi',
                loadComponent: () => import('$routed/student/courses/courses.page').then(m => m.CoursesPage),
            },
            {
                path: 'courses/:id',
                title: 'Dettaglio corso',
                loadComponent: () => import('$routed/student/courses/detail/course-detail.page').then(m => m.CourseDetailPage),
            },
            {
                path: 'profile',
                title: 'Profilo',
                loadComponent: () => import('$routed/student/profile/profile.page').then(m => m.ProfilePage),
            },
            { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
    },

    {
        path: 'teacher',
        loadComponent: () => import('$routed/teacher/teacher.shell').then(m => m.TeacherShell),
        canActivate: [teacherGuard],
        children: [
            {
                path: 'home',
                loadComponent: () => import('$routed/teacher/home/teacher-home.page').then(m => m.TeacherHomePage),
            },
            { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
    },

    { path: '', redirectTo: 'auth', pathMatch: 'full' },
    { path: '**', redirectTo: 'auth' },
];
