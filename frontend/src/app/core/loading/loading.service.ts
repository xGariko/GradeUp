import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
    private readonly count = signal(0);

    readonly loading = computed(() => this.count() > 0);

    start(): void {
        this.count.update(n => n + 1);
    }

    stop(): void {
        this.count.update(n => Math.max(0, n - 1));
    }
}
