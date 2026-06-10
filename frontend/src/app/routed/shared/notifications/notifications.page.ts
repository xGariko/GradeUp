import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '$core/services/notification.service';
import { AuthService } from '$core/auth/auth.service';
import type { NotificationItem } from '$shared/types/dashboard';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

type Tab = 'unread' | 'all';
type Severity = NotificationItem['severity'];

// Pagina condivisa student/teacher: stessa logica e backend (notifiche filtrate per utente
// autenticato), cambia solo il sottotitolo a seconda del ruolo.
@Component({
    selector: 'app-notifications',
    imports: [DatePipe, EmptyState, ErrorState],
    templateUrl: './notifications.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
    private readonly service = inject(NotificationService);
    private readonly auth    = inject(AuthService);

    protected readonly subtitle = this.auth.role() === 'teacher'
        ? 'Le tue comunicazioni da segreteria, iscrizioni e sistema.'
        : 'Le tue comunicazioni da docenti, segreteria e sistema.';

    protected readonly state     = signal<AsyncState<NotificationItem[]>>(initial());
    protected readonly tab       = signal<Tab>('unread');
    protected readonly pending   = signal<Set<number>>(new Set());
    protected readonly bulkBusy  = signal(false);

    protected readonly data        = computed(() => this.state().data ?? []);
    protected readonly unread      = computed(() => this.data().filter(n => !n.read));
    protected readonly unreadCount = computed(() => this.unread().length);
    protected readonly current     = computed(() => (this.tab() === 'unread' ? this.unread() : this.data()));

    constructor() {
        this.load();
    }

    protected load(): void {
        this.state.set(initial());
        this.service.listMine().subscribe({
            next: data => this.state.set({ loading: false, data, error: null }),
            error: () => this.state.set({ loading: false, data: null, error: 'Impossibile caricare le notifiche.' }),
        });
    }

    protected setTab(tab: Tab): void {
        this.tab.set(tab);
    }

    protected busy(id: number): boolean {
        return this.pending().has(id);
    }

    protected markRead(n: NotificationItem): void {
        if (n.read || this.busy(n.id)) return;
        this.setPending(n.id, true);
        this.service.markRead(n.id).subscribe({
            next: () => { this.applyRead([n.id]); this.setPending(n.id, false); },
            error: () => this.setPending(n.id, false),
        });
    }

    protected markAllRead(): void {
        if (this.bulkBusy() || this.unreadCount() === 0) return;
        this.bulkBusy.set(true);
        const ids = this.unread().map(n => n.id);
        this.service.markAllRead().subscribe({
            next: () => { this.applyRead(ids); this.bulkBusy.set(false); },
            error: () => this.bulkBusy.set(false),
        });
    }

    protected severityIcon(s: Severity): string {
        switch (s) {
            case 'success': return 'check-circle';
            case 'warning': return 'exclamation-triangle';
            case 'danger':  return 'exclamation-octagon';
            default:        return 'info-circle';
        }
    }

    protected iconClass(s: Severity): string {
        return `bi bi-${this.severityIcon(s)} fs-5 text-${s}-emphasis`;
    }

    protected relative(iso: string | null): string {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1)  return 'adesso';
        if (min < 60) return `${min} ${min === 1 ? 'minuto' : 'minuti'} fa`;
        const h = Math.floor(min / 60);
        if (h < 24)   return `${h} ${h === 1 ? 'ora' : 'ore'} fa`;
        const d = Math.floor(h / 24);
        if (d < 7)    return `${d} ${d === 1 ? 'giorno' : 'giorni'} fa`;
        const w = Math.floor(d / 7);
        if (d < 30)   return `${w} ${w === 1 ? 'settimana' : 'settimane'} fa`;
        const mo = Math.floor(d / 30);
        if (mo < 12)  return `${mo} ${mo === 1 ? 'mese' : 'mesi'} fa`;
        const y = Math.floor(d / 365);
        return `${y} ${y === 1 ? 'anno' : 'anni'} fa`;
    }

    private setPending(id: number, on: boolean): void {
        this.pending.update(set => {
            const next = new Set(set);
            if (on) next.add(id); else next.delete(id);
            return next;
        });
    }

    private applyRead(ids: number[]): void {
        this.state.update(s =>
            s.data ? { ...s, data: s.data.map(n => (ids.includes(n.id) ? { ...n, read: true } : n)) } : s,
        );
    }
}
