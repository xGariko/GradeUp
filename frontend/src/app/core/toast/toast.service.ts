import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
    id:   number;
    text: string;
}

const AUTO_DISMISS_MS = 3500;

@Injectable({ providedIn: 'root' })
export class ToastService {
    private nextId = 0;
    readonly toasts = signal<ToastMessage[]>([]);

    show(text: string): void {
        const id = ++this.nextId;
        this.toasts.update(list => [...list, { id, text }]);
        setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
    }

    dismiss(id: number): void {
        this.toasts.update(list => list.filter(t => t.id !== id));
    }
}
