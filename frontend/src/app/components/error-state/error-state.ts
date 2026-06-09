import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2 mb-0" role="alert">
      <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
      <span class="me-auto">{{ message() }}</span>
      <button type="button" class="btn btn-sm btn-primary" (click)="retry.emit()">Riprova</button>
    </div>
  `,
})
export class ErrorState {
  readonly message = input('Caricamento non riuscito.');
  readonly retry = output<void>();
}
