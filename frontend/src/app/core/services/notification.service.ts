import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { NotificationItem } from '$shared/types/dashboard';
import { NOTIFICATION_ENDPOINTS } from '$core/api/api.constants';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly http = inject(HttpClient);

    listMine(): Observable<NotificationItem[]> {
        return this.http.get<NotificationItem[]>(NOTIFICATION_ENDPOINTS.mine);
    }
}
