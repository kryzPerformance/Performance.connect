import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import flyerRouter from "./flyer";
import sourcesRouter from "./sources";
import geocodeRouter from "./geocode";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(flyerRouter);
router.use(sourcesRouter);
router.use(geocodeRouter);

export default router;
