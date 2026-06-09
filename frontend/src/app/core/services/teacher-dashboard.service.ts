import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
    TeacherCurrentCourse,
    TeacherUpcomingExam,
    TeacherExamToGrade,
} from '$shared/types/dashboard';
import { ME_ENDPOINTS } from '$core/api/api.constants';

@Injectable({ providedIn: 'root' })
export class TeacherDashboardService {
    private readonly http = inject(HttpClient);

    currentCourses(): Observable<TeacherCurrentCourse[]> {
        return this.http.get<TeacherCurrentCourse[]>(ME_ENDPOINTS.teacherCourses);
    }

    upcomingExams(): Observable<TeacherUpcomingExam[]> {
        return this.http.get<TeacherUpcomingExam[]>(ME_ENDPOINTS.teacherUpcomingExams);
    }

    examsToGrade(): Observable<TeacherExamToGrade[]> {
        return this.http.get<TeacherExamToGrade[]>(ME_ENDPOINTS.examsToGrade);
    }
}
