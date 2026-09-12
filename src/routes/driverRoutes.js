import express from "express";
import driverController from "../controllers/driverController.js";

const router = express.Router();

router.post("/:driverId/online", driverController.goOnline);
router.post("/", driverController.createDriver);

export default router;