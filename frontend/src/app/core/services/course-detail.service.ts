import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { COURSE_ENDPOINTS, ENROLLMENT_ENDPOINTS } from '$core/api/api.constants';

export type MatriculationStatus = 'pending' | 'active' | 'suspended' | 'withdrawn' | 'graduated';
export type ExamStatus = 'scheduled' | 'passed' | 'failed' | 'absent' | 'withdrawn';

export interface CourseDetail {
    id:                  number;
    subjectTitle:        string;
    subjectDescription:  string | null;
    teacherName:         string;
    degreeTitle:         string;
    degreeId:            number;
    cfu:                 number;
    semester:            number | null;
    academicYear:        number | null;
    capacity:            number | null;
    enrolled:            number;
    startDate:           string | null;
    endDate:             string | null;
    inMyPlan:            boolean;
    alreadyRegistered:   boolean;
    matriculationStatus: MatriculationStatus | null;
}

export interface CourseExam {
    id:          number;
    examDate:    string;
    location:    string | null;
    teacherName: string;
    myStatus:    ExamStatus | null;
}

export interface CourseMaterial {
    id:         number;
    title:      string | null;
    fileName:   string | null;
    mimeType:   string | null;
    size:       string | null;
    uploadedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class CourseDetailService {
    private readonly http = inject(HttpClient);

    detail(id: number): Observable<CourseDetail> {
        return this.http.get<CourseDetail>(COURSE_ENDPOINTS.detail(id));
    }

    exams(id: number): Observable<CourseExam[]> {
        return this.http.get<CourseExam[]>(COURSE_ENDPOINTS.exams(id));
    }

    materials(id: number): Observable<CourseMaterial[]> {
        return this.http.get<CourseMaterial[]>(COURSE_ENDPOINTS.archive(id));
    }

    downloadUrl(id: number, coursewareId: number): Observable<{ url: string }> {
        return this.http.get<{ url: string }>(COURSE_ENDPOINTS.archiveDownload(id, coursewareId));
    }

    register(idCourse: number): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(ENROLLMENT_ENDPOINTS.registrations, { id_course: idCourse });
    }

    unregister(idCourse: number): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(ENROLLMENT_ENDPOINTS.registration(idCourse));
    }

    enroll(idExam: number): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(ENROLLMENT_ENDPOINTS.enrollments, { id_exam: idExam });
    }
}
