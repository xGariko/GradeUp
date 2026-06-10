import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ME_ENDPOINTS } from '$core/api/api.constants';
import { ExamStatus } from '$core/services/exams.service';

export interface MyEnrollment {
    id:           number;
    examId:       number;
    courseId:     number;
    subjectTitle: string;
    teacherName:  string;
    examDate:     string | null;
    location:     string | null;
    status:       ExamStatus;
    grade:        number | null;
    academicYear: number | null;
    future:       boolean;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentsService {
    private readonly http = inject(HttpClient);

    list(): Observable<MyEnrollment[]> {
        return this.http.get<MyEnrollment[]>(ME_ENDPOINTS.enrollments);
    }
}
