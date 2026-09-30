import express from "express";
import rideController from "../controllers/rideController.js";
import {authMiddleware} from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validator.js";
import { rideSchema } from "../validators/rideValidator.js";

const router = express.Router();

router.post("/", authMiddleware, requireRole("rider"), validate(rideSchema), rideController.createRide);
router.post("/:rideId/accept", authMiddleware, requireRole("driver"), rideController.acceptRide);
router.post("/:rideId/reject", authMiddleware, requireRole("driver"), rideController.rejectRide);
router.post("/:rideId/arriving", authMiddleware, requireRole("driver"), rideController.driverArriving);
router.post("/:rideId/start", authMiddleware, requireRole("driver"), rideController.startRide);
router.post("/:rideId/complete", authMiddleware, requireRole("driver"), rideController.compeleteRide);
router.post("/:rideId/cancel", authMiddleware, requireRole("rider"), rideController.cancelRide);
router.post("/users/:riderId", authMiddleware, requireRole("rider"), rideController.getRidesByRider);

export default router;