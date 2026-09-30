import express from "express";
import driverController from "../controllers/driverController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validator.js";
import { driverLocationSchema } from "../validators/driverValidator.js";

const router = express.Router();

router.post("/online", authMiddleware, requireRole("driver"), driverController.goOnline);
router.post("/offline", authMiddleware, requireRole("driver"), driverController.goOffline);
router.post("/location", authMiddleware, requireRole("driver"), validate(driverLocationSchema), driverController.updateLocation);
router.get("/nearby", driverController.findNearbyDrivers);
router.post("/", driverController.createDriver);

export default router;