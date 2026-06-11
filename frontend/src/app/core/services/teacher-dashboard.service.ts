import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
    TeacherCurrentCourse,
    TeacherUpcomingExam,
    TeacherExamToGrade,
} from '$shared/types/dashboard';
import { TEACHER_ENDPOINTS } from '$core/api/api.constants';

@Injectable({ providedIn: 'root' })
export class TeacherDashboardService {
    private readonly http = inject(HttpClient);

    currentCourses(): Observable<TeacherCurrentCourse[]> {
        return this.http.get<TeacherCurrentCourse[]>(TEACHER_ENDPOINTS.teacherCourses);
    }

    upcomingExams(): Observable<TeacherUpcomingExam[]> {
        return this.http.get<TeacherUpcomingExam[]>(TEACHER_ENDPOINTS.teacherUpcomingExams);
    }

    examsToGrade(): Observable<TeacherExamToGrade[]> {
        return this.http.get<TeacherExamToGrade[]>(TEACHER_ENDPOINTS.examsToGrade);
    }
}
