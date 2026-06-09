import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';

@Component({
    selector: 'app-teacher-home',
    imports: [IonContent],
    templateUrl: './teacher-home.page.html',
    styleUrl: './teacher-home.page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherHomePage {}
