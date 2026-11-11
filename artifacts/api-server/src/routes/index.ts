import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import studentsRouter from "./students.js";
import classesRouter from "./classes.js";
import bulkImportRouter from "./bulk-import.js";
import staffRouter from "./staff.js";
import dashboardRouter from "./dashboard.js";
import teacherSubjectsRouter from "./teacher-subjects.js";
import gamesRouter from "./games.js";
import lessonsRouter from "./lessons.js";
import gradesRouter from "./grades.js";
import timetableRouter from "./timetable.js";
import timetableImportRouter from "./timetable-import.js";
import timetableBulkRouter from "./timetable-bulk.js";
import maktabPeriodsRouter from "./maktab-periods.js";
import supportRouter from "./support.js";
import libraryRouter from "./library.js";
import certificateRouter from "./certificate.js";
import settingsRouter from "./settings.js";
import codesRouter from "./codes.js";
import olimpiadaRouter from "./olimpiada.js";
import announcementsRouter from "./announcements.js";
import attendanceRouter from "./attendance.js";
import reytingRouter from "./reyting.js";
import tangaRouter from "./tanga.js";
import olimpiadaAnnounceRouter from "./olimpiada-announce.js";
import monitoringRouter from "./monitoring.js";
import boardGamesRouter from "./board-games.js";
import wheelGamesRouter from "./wheel-games.js";
import adminResetRouter from "./admin-reset.js";
import riddlesRouter from "./riddles.js";
import telegramWebappRouter from "./telegram-webapp.js";
import faceidRouter from "./faceid.js";
import faceidTodayRouter from "./faceid-today.js";
import labRouter from "./lab.js";
import authLoginRouter from "./auth-login.js";
import sayohatRouter from "./sayohat.js";
import maktablarRouter from "./maktablar.js";
import analyticsRouter, { activityMiddleware } from "./analytics.js";
import confirmRouter from "./confirm.js";
import elibraryRouter from "./elibrary.js";
// 🔴 YANGI: o'quvchi (4 xonali kod) + o'qituvchi (5 xonali ID) uchun yangi kirish routeri
import studentLoginRouter from "./student-login.js";
// 🔴 YANGI: login sahifasi uchun ochiq (public) ma'lumotlar
import publicRouter from "./public.js";

const router: IRouter = Router();

// Faollik kuzatuvi — barcha route'lardan oldin (autentifikatsiyalangan so'rovlarni yozadi)
router.use(activityMiddleware);

// 🔴 Yangi router'lar — eng oldin (autentifikatsiyasiz, ochiq)
router.use(publicRouter);
router.use(studentLoginRouter);

router.use(healthRouter);
router.use(authRouter);
router.use(authLoginRouter);
router.use(telegramWebappRouter);
router.use(supportRouter);
router.use(libraryRouter);
router.use(certificateRouter);
router.use(settingsRouter);
router.use(codesRouter);
router.use(studentsRouter);
router.use(classesRouter);
router.use(bulkImportRouter);
router.use(staffRouter);
router.use(dashboardRouter);
router.use(teacherSubjectsRouter);
router.use(gamesRouter);
router.use(lessonsRouter);
router.use(gradesRouter);
router.use(timetableRouter);
router.use(timetableImportRouter);
router.use(timetableBulkRouter);
router.use(maktabPeriodsRouter);
router.use(olimpiadaRouter);
router.use(announcementsRouter);
router.use(attendanceRouter);
router.use(reytingRouter);
router.use(tangaRouter);
router.use(olimpiadaAnnounceRouter);
router.use(monitoringRouter);
router.use(boardGamesRouter);
router.use(wheelGamesRouter);
router.use(adminResetRouter);
router.use(riddlesRouter);
router.use(faceidRouter);
router.use(faceidTodayRouter);
router.use(labRouter);
router.use(sayohatRouter);
router.use(maktablarRouter);
router.use(analyticsRouter);
router.use(confirmRouter);
router.use(elibraryRouter);

export default router;
