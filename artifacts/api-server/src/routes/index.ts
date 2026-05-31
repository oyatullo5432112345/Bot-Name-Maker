import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import studentsRouter from "./students.js";
import classesRouter from "./classes.js";
import staffRouter from "./staff.js";
import dashboardRouter from "./dashboard.js";
import teacherSubjectsRouter from "./teacher-subjects.js";
import gamesRouter from "./games.js";
import lessonsRouter from "./lessons.js";
import gradesRouter from "./grades.js";
import timetableRouter from "./timetable.js";
import supportRouter from "./support.js";
import libraryRouter from "./library.js";
import certificateRouter from "./certificate.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(supportRouter);
router.use(libraryRouter);
router.use(certificateRouter);
router.use(studentsRouter);
router.use(classesRouter);
router.use(staffRouter);
router.use(dashboardRouter);
router.use(teacherSubjectsRouter);
router.use(gamesRouter);
router.use(lessonsRouter);
router.use(gradesRouter);
router.use(timetableRouter);

export default router;
