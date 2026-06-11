import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Degree } from '$shared/types/degree';
import type { Matriculation } from '$shared/types/matriculation';
import { DEGREE_ENDPOINTS, ENROLLMENT_ENDPOINTS } from '$core/api/api.constants';

export interface MatriculationRequest {
    id_degree:     number;
    academic_year: string;
}

@Injectable({ providedIn: 'root' })
export class MatriculationService {
    private readonly http = inject(HttpClient);

    openDegrees(): Observable<Degree[]> {
        const params = new HttpParams().set('open', 'true');
        return this.http.get<Degree[]>(DEGREE_ENDPOINTS.list, { params });
    }

    matriculate(request: MatriculationRequest): Observable<Matriculation> {
        return this.http.post<Matriculation>(ENROLLMENT_ENDPOINTS.matriculations, request);
    }
}
