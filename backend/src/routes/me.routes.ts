import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '@middleware/async-handler';
import { authenticate, requireRole } from '@middleware/auth.middleware';
import * as me from '@controllers/me.controller';
import * as student from '@controllers/student-dashboard.controller';
import * as teacher from '@controllers/teacher-dashboard.controller';
import * as archive from '@controllers/archive.controller';
import * as exam from '@controllers/exam.controller';

const router = Router();

const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
});

router.use(authenticate);

// Profilo
router.get('/',                  asyncHandler(me.getMe));
router.patch('/profile',         asyncHandler(me.updateProfile));
router.post('/change-password',  asyncHandler(me.changePassword));

// Immatricolazione
router.post('/matriculations',   requireRole('student'), asyncHandler(me.createMatriculation));

// Iscrizioni ai corsi e prenotazioni agli appelli
router.get('/registrations',               requireRole('student'), asyncHandler(student.listRegistrations));
router.post('/registrations',              requireRole('student'), asyncHandler(me.createRegistration));
router.delete('/registrations/:courseId',  requireRole('student'), asyncHandler(me.deleteRegistration));
router.post('/enrollments',                requireRole('student'), asyncHandler(me.createEnrollment));
router.get('/enrollments',                 requireRole('student'), asyncHandler(student.listEnrollments));
router.patch('/enrollments/:id/withdraw',  requireRole('student'), asyncHandler(me.withdrawEnrollment));

// Dashboard studente
router.get('/career-summary',         requireRole('student'), asyncHandler(student.careerSummary));
router.get('/study-plan',              requireRole('student'), asyncHandler(student.studyPlan));
router.get('/transcript',             requireRole('student'), asyncHandler(student.transcript));
router.get('/upcoming-exams',         requireRole('student'), asyncHandler(student.upcomingExams));
router.get('/exams',                  requireRole('student'), asyncHandler(student.availableExams));
router.get('/current-registrations',  requireRole('student'), asyncHandler(student.currentRegistrations));
router.get('/cfu-progress',           requireRole('student'), asyncHandler(student.cfuProgress));

// Dashboard docente
router.get('/teacher-profile',          requireRole('teacher'), asyncHandler(teacher.teacherProfile));
router.get('/teacher-courses',          requireRole('teacher'), asyncHandler(teacher.currentCourses));
router.get('/teacher-upcoming-exams',   requireRole('teacher'), asyncHandler(teacher.upcomingExams));
router.get('/exams-to-grade',           requireRole('teacher'), asyncHandler(teacher.examsToGrade));
router.get('/teacher-exams',            requireRole('teacher'), asyncHandler(teacher.listExams));
router.get('/courses',                  requireRole('teacher'), asyncHandler(teacher.listCourses));
router.get('/courses/:id',              requireRole('teacher'), asyncHandler(teacher.courseDetail));

// Materiale didattico docente
router.get('/courses/:id/archive',      requireRole('teacher'), asyncHandler(archive.list));
router.post('/courses/:id/archive',     requireRole('teacher'), fileUpload.single('file'), asyncHandler(archive.upload));
router.patch('/courseware/:id',         requireRole('teacher'), asyncHandler(archive.rename));
router.delete('/courseware/:id',        requireRole('teacher'), asyncHandler(archive.remove));
router.get('/courseware/:id/download',  requireRole('teacher'), asyncHandler(archive.download));

// Appelli del corso (docente)
router.get('/courses/:id/exams',        requireRole('teacher'), asyncHandler(exam.listForCourse));
router.post('/courses/:id/exams',       requireRole('teacher'), asyncHandler(exam.create));
router.patch('/exams/:id',              requireRole('teacher'), asyncHandler(exam.update));
router.delete('/exams/:id',             requireRole('teacher'), asyncHandler(exam.cancel));
router.get('/exams/:id/grading',        requireRole('teacher'), asyncHandler(exam.grading));
router.post('/exams/:id/grading',       requireRole('teacher'), asyncHandler(exam.saveGrading));

export default router;
