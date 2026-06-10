import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '$core/toast/toast.service';

@Component({
    selector: 'app-toast-host',
    templateUrl: './toast-host.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHost {
    private readonly service = inject(ToastService);
    protected readonly toasts = this.service.toasts;

    protected dismiss(id: number): void {
        this.service.dismiss(id);
    }
}
