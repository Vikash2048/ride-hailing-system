import express from "express";
import rideController from "../controllers/rideController.js";
import {authMiddleware} from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, requireRole("rider"), rideController.createRide);
router.post("/:rideId/accept",rideController.acceptRide);
router.post("/:rideId/reject",rideController.rejectRide);
router.post("/:rideId/arriving", rideController.driverArriving);
router.post("/:rideId/start", rideController.startRide);
router.post("/:rideId/complete", rideController.compeleteRide);
router.post("/:rideId/cancel", rideController.cancelRide);
router.post("/users/:riderId", rideController.getRidesByRider);

export default router;