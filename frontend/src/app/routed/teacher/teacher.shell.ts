import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
    selector: 'app-teacher-shell',
    imports: [IonRouterOutlet],
    templateUrl: './teacher.shell.html',
    styleUrl: './teacher.shell.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherShell {}
