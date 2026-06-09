import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { COURSE_ENDPOINTS } from '$core/api/api.constants';

export interface CatalogCourse {
    id:                number;
    subjectTitle:      string;
    teacherName:       string;
    degreeTitle:       string;
    cfu:               number;
    semester:          number | null;
    academicYear:      number | null;
    capacity:          number | null;
    enrolled:          number;
    startDate:         string | null;
    endDate:           string | null;
    inMyPlan:          boolean;
    alreadyRegistered: boolean;
}

@Injectable({ providedIn: 'root' })
export class CourseCatalogService {
    private readonly http = inject(HttpClient);

    list(): Observable<CatalogCourse[]> {
        return this.http.get<CatalogCourse[]>(COURSE_ENDPOINTS.catalog);
    }
}
