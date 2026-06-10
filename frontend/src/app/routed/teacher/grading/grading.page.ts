import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeacherDashboardService } from '$core/services/teacher-dashboard.service';
import { EmptyState } from '$components/empty-state/empty-state';
import { ErrorState } from '$components/error-state/error-state';
import type { TeacherExamToGrade } from '$shared/types/dashboard';

type AsyncState<T> = { loading: boolean; data: T | null; error: string | null };

function initial<T>(): AsyncState<T> {
    return { loading: true, data: null, error: null };
}

@Component({
    selector: 'app-teacher-grading',
    imports: [DatePipe, RouterLink, EmptyState, ErrorState],
    templateUrl: './grading.page.html',
    host: { class: 'd-block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherGradingPage {
    private readonly dash = inject(TeacherDashboardService);

    protected readonly exams = signal<AsyncState<TeacherExamToGrade[]>>(initial());

    constructor() {
        this.load();
    }

    protected load(): void {
        this.exams.set(initial());
        this.dash.examsToGrade().subscribe({
            next: data => this.exams.set({ loading: false, data, error: null }),
            error: () => this.exams.set({ loading: false, data: null, error: 'Impossibile caricare gli esami da verbalizzare.' }),
        });
    }
}
