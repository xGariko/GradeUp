export const API_BASE = '/api';

export const AUTH_ENDPOINTS = {
    login:    `${API_BASE}/auth/login`,
    register: `${API_BASE}/auth/register`,
    forgot:   `${API_BASE}/auth/forgot`,
    reset:    `${API_BASE}/auth/reset`,
} as const;

export const ME_ENDPOINTS = {
    me:                   `${API_BASE}/me`,
    profile:              `${API_BASE}/me/profile`,
    changePassword:       `${API_BASE}/me/change-password`,
    careerSummary:        `${API_BASE}/me/career-summary`,
    studyPlan:            `${API_BASE}/me/study-plan`,
    upcomingExams:        `${API_BASE}/me/upcoming-exams`,
    currentRegistrations: `${API_BASE}/me/current-registrations`,
    cfuProgress:          `${API_BASE}/me/cfu-progress`,
    matriculations:       `${API_BASE}/me/matriculations`,
    registrations:        `${API_BASE}/me/registrations`,
    registration:         (courseId: number) => `${API_BASE}/me/registrations/${courseId}`,
    enrollments:          `${API_BASE}/me/enrollments`,
    teacherCourses:       `${API_BASE}/me/teacher-courses`,
    teacherUpcomingExams: `${API_BASE}/me/teacher-upcoming-exams`,
    examsToGrade:         `${API_BASE}/me/exams-to-grade`,
} as const;

export const DEGREE_ENDPOINTS = {
    list: `${API_BASE}/degrees`,
} as const;

export const COURSE_ENDPOINTS = {
    catalog: `${API_BASE}/courses`,
    detail:  (id: number) => `${API_BASE}/courses/${id}`,
    exams:   (id: number) => `${API_BASE}/courses/${id}/exams`,
    archive: (id: number) => `${API_BASE}/courses/${id}/archive`,
} as const;

export const NOTIFICATION_ENDPOINTS = {
    mine: `${API_BASE}/notifications/me`,
} as const;
