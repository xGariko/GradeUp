import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthShell, AuthShellConfig } from '$components/auth-shell/auth-shell';

@Component({
    selector: 'app-student-shell',
    imports: [RouterOutlet, AuthShell],
    templateUrl: './student.shell.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentShell {
    protected readonly config: AuthShellConfig = {
        profileRoute: '/student/profile',
        notificationsRoute: '/student/notifications',
        menu: [
            { label: 'Home', icon: 'house', route: '/student/home' },
            {
                label: 'Carriera',
                icon: 'mortarboard',
                children: [
                    { label: 'Piano di studi',  route: '/student/study-plan' },
                    { label: 'Iscrizioni corsi', route: '/student/registrations' },
                    { label: 'Catalogo corsi',   route: '/student/courses' },
                    { label: 'Libretto',         route: '/student/transcript' },
                ],
            },
            {
                label: 'Esami',
                icon: 'calendar-event',
                children: [
                    { label: 'Appelli disponibili', route: '/student/exams' },
                    { label: 'Le mie prenotazioni',  route: '/student/enrollments' },
                ],
            },
            { label: 'Notifiche', icon: 'bell', route: '/student/notifications' },
            { label: 'Profilo',   icon: 'person', route: '/student/profile' },
        ],
        tabs: [
            { label: 'Home', icon: 'house', route: '/student/home' },
            {
                label: 'Carriera',
                icon: 'mortarboard',
                group: [
                    { label: 'Piano di studi',  route: '/student/study-plan' },
                    { label: 'Iscrizioni corsi', route: '/student/registrations' },
                    { label: 'Catalogo corsi',   route: '/student/courses' },
                    { label: 'Libretto',         route: '/student/transcript' },
                ],
            },
            { label: 'Esami',   icon: 'calendar-event', route: '/student/exams' },
            { label: 'Profilo', icon: 'person', route: '/student/profile' },
        ],
    };
}
