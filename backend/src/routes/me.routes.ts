import { Router } from 'express';
import { asyncHandler } from '@middleware/async-handler';
import { authenticate, requireRole } from '@middleware/auth.middleware';
import * as me from '@controllers/me.controller';
import * as student from '@controllers/student-dashboard.controller';
import * as teacher from '@controllers/teacher-dashboard.controller';

const router = Router();

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

// Dashboard studente
router.get('/career-summary',         requireRole('student'), asyncHandler(student.careerSummary));
router.get('/study-plan',              requireRole('student'), asyncHandler(student.studyPlan));
router.get('/upcoming-exams',         requireRole('student'), asyncHandler(student.upcomingExams));
router.get('/current-registrations',  requireRole('student'), asyncHandler(student.currentRegistrations));
router.get('/cfu-progress',           requireRole('student'), asyncHandler(student.cfuProgress));

// Dashboard docente
router.get('/teacher-courses',          requireRole('teacher'), asyncHandler(teacher.currentCourses));
router.get('/teacher-upcoming-exams',   requireRole('teacher'), asyncHandler(teacher.upcomingExams));
router.get('/exams-to-grade',           requireRole('teacher'), asyncHandler(teacher.examsToGrade));

export default router;
