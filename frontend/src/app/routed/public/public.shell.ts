import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

@Component({
    selector: 'app-public-shell',
    imports: [IonContent, RouterOutlet],
    templateUrl: './public.shell.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicShell {}
