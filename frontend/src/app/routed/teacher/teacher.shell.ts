import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthShell, AuthShellConfig } from '$components/auth-shell/auth-shell';

@Component({
    selector: 'app-teacher-shell',
    imports: [RouterOutlet, AuthShell],
    templateUrl: './teacher.shell.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherShell {
    protected readonly config: AuthShellConfig = {
        profileRoute: '/teacher/profile',
        notificationsRoute: '/teacher/notifications',
        menu: [
            { label: 'Home', icon: 'house', route: '/teacher/home' },
            { label: 'I miei corsi', icon: 'journals', route: '/teacher/courses' },
            {
                label: 'Esami',
                icon: 'calendar-event',
                children: [
                    { label: 'Calendario appelli', route: '/teacher/exams' },
                    { label: 'Da verbalizzare',    route: '/teacher/grading' },
                ],
            },
            { label: 'Notifiche', icon: 'bell', route: '/teacher/notifications' },
            { label: 'Profilo',   icon: 'person', route: '/teacher/profile' },
        ],
        tabs: [
            { label: 'Home',    icon: 'house', route: '/teacher/home' },
            { label: 'Corsi',   icon: 'journals', route: '/teacher/courses' },
            { label: 'Esami',   icon: 'calendar-event', route: '/teacher/exams' },
            { label: 'Profilo', icon: 'person', route: '/teacher/profile' },
        ],
    };
}
