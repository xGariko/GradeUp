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
    transcript:           `${API_BASE}/me/transcript`,
    upcomingExams:        `${API_BASE}/me/upcoming-exams`,
    availableExams:       `${API_BASE}/me/exams`,
    currentRegistrations: `${API_BASE}/me/current-registrations`,
    cfuProgress:          `${API_BASE}/me/cfu-progress`,
    matriculations:       `${API_BASE}/me/matriculations`,
    registrations:        `${API_BASE}/me/registrations`,
    registration:         (courseId: number) => `${API_BASE}/me/registrations/${courseId}`,
    enrollments:          `${API_BASE}/me/enrollments`,
    enrollmentWithdraw:   (id: number) => `${API_BASE}/me/enrollments/${id}/withdraw`,
    teacherProfile:       `${API_BASE}/me/teacher-profile`,
    teacherCourses:       `${API_BASE}/me/teacher-courses`,
    teacherUpcomingExams: `${API_BASE}/me/teacher-upcoming-exams`,
    examsToGrade:         `${API_BASE}/me/exams-to-grade`,
    teacherExamsList:     `${API_BASE}/me/teacher-exams`,
    teacherCoursesList:   `${API_BASE}/me/courses`,
    teacherCourseDetail:  (id: number) => `${API_BASE}/me/courses/${id}`,
    teacherArchive:       (courseId: number) => `${API_BASE}/me/courses/${courseId}/archive`,
    coursewareRename:     (id: number) => `${API_BASE}/me/courseware/${id}`,
    coursewareRemove:     (id: number) => `${API_BASE}/me/courseware/${id}`,
    coursewareDownload:   (id: number) => `${API_BASE}/me/courseware/${id}/download`,
    teacherCourseExams:   (courseId: number) => `${API_BASE}/me/courses/${courseId}/exams`,
    examUpdate:           (id: number) => `${API_BASE}/me/exams/${id}`,
    examCancel:           (id: number) => `${API_BASE}/me/exams/${id}`,
    examGrading:          (id: number) => `${API_BASE}/me/exams/${id}/grading`,
} as const;

export const DEGREE_ENDPOINTS = {
    list: `${API_BASE}/degrees`,
} as const;

export const COURSE_ENDPOINTS = {
    catalog: `${API_BASE}/courses`,
    detail:  (id: number) => `${API_BASE}/courses/${id}`,
    exams:   (id: number) => `${API_BASE}/courses/${id}/exams`,
    archive: (id: number) => `${API_BASE}/courses/${id}/archive`,
    archiveDownload: (id: number, coursewareId: number) => `${API_BASE}/courses/${id}/archive/${coursewareId}/download`,
} as const;

export const NOTIFICATION_ENDPOINTS = {
    mine:    `${API_BASE}/notifications/me`,
    read:    (id: number) => `${API_BASE}/notifications/${id}/read`,
    readAll: `${API_BASE}/notifications/read-all`,
} as const;
