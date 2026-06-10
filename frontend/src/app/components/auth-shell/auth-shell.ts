import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IonContent, IonActionSheet } from '@ionic/angular/standalone';
import { AuthService } from '$core/auth/auth.service';
import { ToastService } from '$core/toast/toast.service';

export interface AuthNavLink {
    label: string;
    route: string;
}

export interface AuthNavSection {
    label: string;
    icon: string;
    route?: string;
    children?: AuthNavLink[];
}

export interface AuthNavTab {
    label: string;
    icon: string;
    route?: string;
    group?: AuthNavLink[];
}

export interface AuthShellConfig {
    menu: AuthNavSection[];
    tabs: AuthNavTab[];
    profileRoute: string;
    notificationsRoute?: string;
}

interface SheetButton {
    text: string;
    role?: 'cancel';
    handler?: () => void;
}

@Component({
    selector: 'app-auth-shell',
    imports: [IonContent, IonActionSheet, RouterLink, RouterLinkActive],
    templateUrl: './auth-shell.html',
    host: {
        class: 'd-flex flex-column flex-grow-1',
        '(document:click)': 'closeMenu()',
        '(document:keydown.escape)': 'closeMenu()',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShell {
    private readonly router = inject(Router);
    private readonly auth   = inject(AuthService);
    private readonly toast  = inject(ToastService);

    readonly config = input.required<AuthShellConfig>();

    protected readonly menuOpen     = signal(false);
    protected readonly sheetOpen    = signal(false);
    protected readonly sheetHeader  = signal('');
    protected readonly sheetButtons = signal<SheetButton[]>([]);

    protected readonly pageTitle = toSignal(
        this.router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            startWith(null),
            map(() => this.resolveTitle()),
        ),
        { initialValue: '' },
    );

    protected readonly fullName = computed(() => {
        const u = this.auth.user();
        return u ? `${u.name} ${u.surname}` : '';
    });

    protected readonly initials = computed(() => {
        const u = this.auth.user();
        if (!u) return '';
        return `${u.name[0] ?? ''}${u.surname[0] ?? ''}`.toUpperCase();
    });

    protected toggleMenu(event: Event): void {
        event.stopPropagation();
        this.menuOpen.update(open => !open);
    }

    protected closeMenu(): void {
        if (this.menuOpen()) this.menuOpen.set(false);
    }

    protected openGroup(tab: AuthNavTab): void {
        if (!tab.group) return;
        this.sheetHeader.set(tab.label);
        this.sheetButtons.set([
            ...tab.group.map(link => ({
                text: link.label,
                handler: () => { this.router.navigateByUrl(link.route); },
            })),
            { text: 'Annulla', role: 'cancel' as const },
        ]);
        this.sheetOpen.set(true);
    }

    protected logout(): void {
        this.menuOpen.set(false);
        this.toast.show('Sei uscito');
        this.auth.logout();
    }

    private resolveTitle(): string {
        let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
        let title = '';
        while (route) {
            if (route.title) title = route.title;
            route = route.firstChild;
        }
        return title;
    }
}
