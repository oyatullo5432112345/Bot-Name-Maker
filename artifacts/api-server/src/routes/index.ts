import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import studentsRouter from "./students.js";
import classesRouter from "./classes.js";
import staffRouter from "./staff.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentsRouter);
router.use(classesRouter);
router.use(staffRouter);
router.use(dashboardRouter);

export default router;
