import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENROLLMENT_ENDPOINTS } from '$core/api/api.constants';

export interface MyRegistration {
    courseId:         number;
    subjectTitle:     string;
    teacherName:      string;
    degreeTitle:      string;
    academicYear:     number | null;
    semester:         number | null;
    cfu:              number;
    registrationDate: string | null;
    futureExams:      number;
}

@Injectable({ providedIn: 'root' })
export class RegistrationsService {
    private readonly http = inject(HttpClient);

    list(): Observable<MyRegistration[]> {
        return this.http.get<MyRegistration[]>(ENROLLMENT_ENDPOINTS.registrations);
    }

    unregister(courseId: number): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(ENROLLMENT_ENDPOINTS.registration(courseId));
    }
}
