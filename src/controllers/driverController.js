import { redis } from "../config/redis.js";
import driverService from "../services/driverService.js";

const createDriver = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: "userId is required"
            });
        }

        const driver = await driverService.createDriver(userId);
        res.status(201).json(driver);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to create driver"
        });
    }
};

const goOnline = async (req, res) => {
    try {
        const { driverId } = req.params;

        if (!driverId) {
            return res.status(400).json({
                error: "driverId is required"
            });
        }

        const driver = await driverService.updateDriverStatus(driverId, "AVAILABLE");

        if (!driver) {
            return res.status(404).json({
                error: "Driver not found"
            });
        }

        await redis.set(
            `driver:status:${driverId}`,
            "AVAILABLE"
        );

        return res.json(driver);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Failed to update driver status"
        });
    }
};

const goOffline = async (req, res) => {
    try {
        const { driverId } = req.params;

        if (!driverId) {
            res.status(400).json({
                error: "Driver id missing"
            });
        }

        const driver = await driverService.updateDriverStatus(driverId, "OFFLINE");

        await redis.set(
            `driver:status:${driverId}`,
            "OFFLINE"
        );

        return res.json(driver);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Failed to update driver status"
        });
    }
};

const updateLocation = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                error: "latitude and longitude are required"
            });
        }

        await redis.geoAdd("drivers:locations", {
            longitude,
            latitude,
            member: driverId
        });

        res.json({
            message: "Location updated"
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to update location"
        });
    }
}

export default { createDriver, goOnline, goOffline, updateLocation };