import express from "express";
import rideController from "../controllers/rideController.js";

const router = express.Router();

router.post("/", rideController.createRide);
router.post("/:rideId/accept",rideController.acceptRide);

export default router;