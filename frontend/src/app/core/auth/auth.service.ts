import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { AuthResponse, LoginDto, RegisterStudentDto } from '$shared/types/auth';
import { AUTH_ENDPOINTS } from '$core/api/api.constants';

interface AuthSession {
    token: string;
    user: AuthResponse['user'];
    role: AuthResponse['role'];
}

const STORAGE_KEY = 'gradeup_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http       = inject(HttpClient);
    private readonly router     = inject(Router);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly session    = signal<AuthSession | null>(null);

    readonly user       = computed(() => this.session()?.user ?? null);
    readonly role       = computed(() => this.session()?.role ?? null);
    readonly token      = computed(() => this.session()?.token ?? null);
    readonly isLoggedIn = computed(() => this.session() !== null);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) this.session.set(JSON.parse(raw) as AuthSession);
            } catch { /* storage non disponibile */ }
        }
    }

    async login(dto: LoginDto): Promise<void> {
        const response = await firstValueFrom(
            this.http.post<AuthResponse>(AUTH_ENDPOINTS.login, dto),
        );
        this.persist(response);
    }

    async register(dto: RegisterStudentDto): Promise<void> {
        const response = await firstValueFrom(
            this.http.post<AuthResponse>(AUTH_ENDPOINTS.register, dto),
        );
        this.persist(response);
    }

    async forgotPassword(email: string): Promise<void> {
        await firstValueFrom(this.http.post<void>(AUTH_ENDPOINTS.forgot, { email }));
    }

    async resetPassword(token: string, password: string): Promise<void> {
        await firstValueFrom(this.http.post<void>(AUTH_ENDPOINTS.reset, { token, password }));
    }

    logout(): void {
        this.session.set(null);
        if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem(STORAGE_KEY);
        }
        this.router.navigate(['/auth/login']);
    }

    private persist(response: AuthResponse): void {
        const sess: AuthSession = {
            token: response.token,
            user:  response.user,
            role:  response.role,
        };
        this.session.set(sess);
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sess));
        }
    }
}
