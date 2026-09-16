import express from "express";
import rideController from "../controllers/rideController.js";

const router = express.Router();

router.post("/", rideController.createRide);
router.post("/:rideId/accept",rideController.acceptRide);
router.post("/:rideId/reject",rideController.rejectRide);
router.post("/:rideId/arriving", rideController.driverArriving);
router.post("/:rideId/start", rideController.startRide);
router.post("/:rideId/complete", rideController.compeleteRide);

export default router;