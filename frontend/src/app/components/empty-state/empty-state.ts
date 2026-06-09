import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column align-items-center text-center text-body-secondary py-5 px-3">
      <i class="bi bi-{{ icon() }} fs-1 mb-3" aria-hidden="true"></i>
      <p class="mb-0">{{ message() }}</p>
      @if (ctaLabel()) {
        <button type="button" class="btn btn-primary mt-3" (click)="cta.emit()">{{ ctaLabel() }}</button>
      }
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly message = input.required<string>();
  readonly ctaLabel = input<string>();
  readonly cta = output<void>();
}
