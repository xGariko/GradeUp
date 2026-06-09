import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { MeResponse, UpdateProfileDto, ChangePasswordDto } from '$shared/types/me';
import { ME_ENDPOINTS } from '$core/api/api.constants';

@Injectable({ providedIn: 'root' })
export class MeService {
    private readonly http = inject(HttpClient);

    get(): Observable<MeResponse> {
        return this.http.get<MeResponse>(ME_ENDPOINTS.me);
    }

    updateProfile(dto: UpdateProfileDto): Observable<MeResponse> {
        return this.http.patch<MeResponse>(ME_ENDPOINTS.profile, dto);
    }

    changePassword(dto: ChangePasswordDto): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(ME_ENDPOINTS.changePassword, dto);
    }
}
