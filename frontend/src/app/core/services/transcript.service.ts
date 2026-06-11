import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CAREER_ENDPOINTS } from '$core/api/api.constants';
import { MatriculationStatus } from '$core/services/study-plan.service';

export interface TranscriptItem {
    enrollmentId: number;
    courseId:     number;
    examDate:     string | null;
    subjectTitle: string;
    cfu:          number;
    grade:        number | null;
    teacherName:  string;
    academicYear: number | null;
    location:     string | null;
}

export interface Transcript {
    studentName:         string;
    matriculationCode:   string | null;
    degreeTitle:         string | null;
    matriculationStatus: MatriculationStatus | null;
    academicYear:        string | null;
    cfuAcquired:         number;
    cfuTotal:            number;
    averageArithmetic:   number | null;
    averageWeighted:     number | null;
    items:               TranscriptItem[];
}

@Injectable({ providedIn: 'root' })
export class TranscriptService {
    private readonly http = inject(HttpClient);

    get(): Observable<Transcript> {
        return this.http.get<Transcript>(CAREER_ENDPOINTS.transcript);
    }
}
