import express from "express";
import driverController from "../controllers/driverController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/online", authMiddleware, requireRole("driver"), driverController.goOnline);
router.post("/offline", authMiddleware, requireRole("driver"), driverController.goOffline);
router.post("/location", authMiddleware, requireRole("driver"), driverController.updateLocation);
router.get("/nearby", driverController.findNearbyDrivers);
router.post("/", driverController.createDriver);

export default router;