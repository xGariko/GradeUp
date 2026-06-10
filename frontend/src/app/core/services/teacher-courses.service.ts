import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ME_ENDPOINTS } from '$core/api/api.constants';

export interface TeacherCourse {
    id:           number;
    subjectTitle: string;
    degreeTitle:  string;
    cfu:          number;
    semester:     number | null;
    academicYear: number | null;
    capacity:     number | null;
    enrolled:     number;
    startDate:    string | null;
    endDate:      string | null;
    concluded:    boolean;
}

export interface TeacherCourseInfo extends TeacherCourse {
    subjectDescription: string | null;
    degreeId:           number;
}

export interface TeacherCourseStudent {
    studentId:         number;
    name:              string;
    surname:           string;
    matriculationCode: number | null;
    registrationDate:  string | null;
    studentStatus:     string;
}

export interface TeacherCourseDetail {
    course:   TeacherCourseInfo;
    students: TeacherCourseStudent[];
}

export interface CoursewareItem {
    id:           number;
    title:        string;
    description:  string | null;
    uploadedAt:   string;
    uploadedBy:   string;
    originalName: string;
    mimeType:     string;
    size:         string;
}

export interface CourseArchive {
    courseTitle: string;
    items:       CoursewareItem[];
}

export type ExamStatus = 'in_programma' | 'da_verbalizzare' | 'verbalizzato';

export interface CourseExam {
    id:             number;
    examDate:       string;
    location:       string | null;
    future:         boolean;
    enrolled:       number;
    scheduledCount: number;
    status:         ExamStatus;
}

export interface CourseExams {
    courseTitle: string;
    items:       CourseExam[];
}

export interface TeacherExamListItem {
    id:             number;
    courseId:       number;
    courseTitle:    string;
    degreeTitle:    string;
    academicYear:   number | null;
    examDate:       string;
    location:       string | null;
    future:         boolean;
    enrolled:       number;
    scheduledCount: number;
    status:         ExamStatus;
}

export interface ExamPayload {
    examDate: string;
    location: string;
}

export type EnrollmentStatus = 'scheduled' | 'passed' | 'failed' | 'absent' | 'withdrawn';

export interface GradingRow {
    enrollmentId:      number;
    studentId:         number;
    surname:           string;
    name:              string;
    matriculationCode: number | null;
    status:            EnrollmentStatus;
    grade:             number | null;
}

export interface ExamGrading {
    exam: {
        id:            number;
        courseId:      number;
        courseTitle:   string;
        examDate:      string;
        location:      string | null;
        enrolledCount: number;
        gradedCount:   number;
        pendingCount:  number;
        allGraded:     boolean;
    };
    rows: GradingRow[];
}

export interface GradingItem {
    enrollmentId: number;
    status:       Exclude<EnrollmentStatus, 'scheduled'>;
    grade:        number | null;
}

@Injectable({ providedIn: 'root' })
export class TeacherCoursesService {
    private readonly http = inject(HttpClient);

    list(): Observable<TeacherCourse[]> {
        return this.http.get<TeacherCourse[]>(ME_ENDPOINTS.teacherCoursesList);
    }

    detail(id: number): Observable<TeacherCourseDetail> {
        return this.http.get<TeacherCourseDetail>(ME_ENDPOINTS.teacherCourseDetail(id));
    }

    materials(courseId: number): Observable<CourseArchive> {
        return this.http.get<CourseArchive>(ME_ENDPOINTS.teacherArchive(courseId));
    }

    uploadMaterial(courseId: number, file: File): Observable<HttpEvent<{ id: number }>> {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<{ id: number }>(ME_ENDPOINTS.teacherArchive(courseId), form, {
            reportProgress: true,
            observe: 'events',
        });
    }

    renameMaterial(id: number, title: string): Observable<void> {
        return this.http.patch<void>(ME_ENDPOINTS.coursewareRename(id), { title });
    }

    removeMaterial(id: number): Observable<void> {
        return this.http.delete<void>(ME_ENDPOINTS.coursewareRemove(id));
    }

    downloadUrl(id: number): Observable<{ url: string }> {
        return this.http.get<{ url: string }>(ME_ENDPOINTS.coursewareDownload(id));
    }

    allExams(): Observable<TeacherExamListItem[]> {
        return this.http.get<TeacherExamListItem[]>(ME_ENDPOINTS.teacherExamsList);
    }

    courseExams(courseId: number): Observable<CourseExams> {
        return this.http.get<CourseExams>(ME_ENDPOINTS.teacherCourseExams(courseId));
    }

    createExam(courseId: number, payload: ExamPayload): Observable<{ id: number }> {
        return this.http.post<{ id: number }>(ME_ENDPOINTS.teacherCourseExams(courseId), payload);
    }

    updateExam(id: number, payload: ExamPayload): Observable<void> {
        return this.http.patch<void>(ME_ENDPOINTS.examUpdate(id), payload);
    }

    cancelExam(id: number): Observable<void> {
        return this.http.delete<void>(ME_ENDPOINTS.examCancel(id));
    }

    examGrading(id: number): Observable<ExamGrading> {
        return this.http.get<ExamGrading>(ME_ENDPOINTS.examGrading(id));
    }

    saveGrading(id: number, items: GradingItem[]): Observable<{ ok: true; updated: number }> {
        return this.http.post<{ ok: true; updated: number }>(ME_ENDPOINTS.examGrading(id), { items });
    }
}
