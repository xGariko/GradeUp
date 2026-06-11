import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { MeResponse, UpdateProfileDto, ChangePasswordDto } from '$shared/types/me';
import { ACCOUNT_ENDPOINTS, TEACHER_ENDPOINTS } from '$core/api/api.constants';

export interface TeacherProfileInfo {
    status:       string;
    contractType: string;
}

@Injectable({ providedIn: 'root' })
export class MeService {
    private readonly http = inject(HttpClient);

    get(): Observable<MeResponse> {
        return this.http.get<MeResponse>(ACCOUNT_ENDPOINTS.me);
    }

    teacherProfile(): Observable<TeacherProfileInfo> {
        return this.http.get<TeacherProfileInfo>(TEACHER_ENDPOINTS.teacherProfile);
    }

    updateProfile(dto: UpdateProfileDto): Observable<MeResponse> {
        return this.http.patch<MeResponse>(ACCOUNT_ENDPOINTS.profile, dto);
    }

    changePassword(dto: ChangePasswordDto): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(ACCOUNT_ENDPOINTS.changePassword, dto);
    }
}
