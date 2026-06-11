import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENROLLMENT_ENDPOINTS } from '$core/api/api.constants';

export type ExamStatus = 'scheduled' | 'passed' | 'failed' | 'absent' | 'withdrawn';
export type MatriculationStatus = 'pending' | 'active' | 'suspended' | 'withdrawn' | 'graduated';

export interface AvailableExam {
    id:           number;
    courseId:     number;
    subjectTitle: string;
    teacherName:  string;
    examDate:     string;
    location:     string | null;
    myStatus:     ExamStatus | null;
    grade:        number | null;
    enrollmentId: number | null;
}

export interface AvailableExams {
    matriculationStatus: MatriculationStatus | null;
    registeredCount:     number;
    exams:               AvailableExam[];
}

@Injectable({ providedIn: 'root' })
export class ExamsService {
    private readonly http = inject(HttpClient);

    list(): Observable<AvailableExams> {
        return this.http.get<AvailableExams>(ENROLLMENT_ENDPOINTS.availableExams);
    }

    book(idExam: number): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(ENROLLMENT_ENDPOINTS.enrollments, { id_exam: idExam });
    }

    withdraw(idEnrollment: number): Observable<{ ok: boolean }> {
        return this.http.patch<{ ok: boolean }>(ENROLLMENT_ENDPOINTS.enrollmentWithdraw(idEnrollment), {});
    }
}
