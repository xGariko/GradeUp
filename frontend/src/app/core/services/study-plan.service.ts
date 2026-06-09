import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ME_ENDPOINTS } from '$core/api/api.constants';

export type StudyPlanStatus = 'passed' | 'in_progress' | 'todo';
export type MatriculationStatus = 'pending' | 'active' | 'suspended' | 'withdrawn' | 'graduated';

export interface StudyPlanItem {
    subjectId:    number;
    subjectTitle: string;
    year:         number;
    isMandatory:  boolean;
    cfu:          number;
    status:       StudyPlanStatus;
    grade:        number | null;
    courseId:     number | null;
}

export interface StudyPlan {
    degreeTitle:         string | null;
    matriculationStatus: MatriculationStatus | null;
    cfuAcquired:         number;
    cfuTotal:            number;
    items:               StudyPlanItem[];
}

@Injectable({ providedIn: 'root' })
export class StudyPlanService {
    private readonly http = inject(HttpClient);

    get(): Observable<StudyPlan> {
        return this.http.get<StudyPlan>(ME_ENDPOINTS.studyPlan);
    }
}
