import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
    StudentCareerSummary,
    StudentUpcomingExam,
    StudentCurrentCourse,
    StudentCfuProgress,
} from '$shared/types/dashboard';
import { ME_ENDPOINTS } from '$core/api/api.constants';

@Injectable({ providedIn: 'root' })
export class StudentDashboardService {
    private readonly http = inject(HttpClient);

    careerSummary(): Observable<StudentCareerSummary> {
        return this.http.get<StudentCareerSummary>(ME_ENDPOINTS.careerSummary);
    }

    upcomingExams(): Observable<StudentUpcomingExam[]> {
        return this.http.get<StudentUpcomingExam[]>(ME_ENDPOINTS.upcomingExams);
    }

    currentRegistrations(): Observable<StudentCurrentCourse[]> {
        return this.http.get<StudentCurrentCourse[]>(ME_ENDPOINTS.currentRegistrations);
    }

    cfuProgress(): Observable<StudentCfuProgress> {
        return this.http.get<StudentCfuProgress>(ME_ENDPOINTS.cfuProgress);
    }
}
