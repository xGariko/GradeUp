import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, IonProgressBar } from '@ionic/angular/standalone';
import { LoadingService } from './core/loading/loading.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet, IonProgressBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly loading = inject(LoadingService).loading;
}
