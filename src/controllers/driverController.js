import { redis } from "../config/redis.js";
import driverService from "../services/driverService.js";
import { pool } from "../config/db.js";
import { emitRideEvent } from "../socket/socket.js";
import driverRepository from "../repositories/driverRepository.js";

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
        const driver = await driverRepository.getDriverByUserId( req.user.userId );

        if (!driver) {
            return res.status(400).json({
                error: "driver not found"
            });
        }

        await driverService.updateDriverStatus(driver.id, "AVAILABLE");

        if (!driver) {
            return res.status(404).json({
                error: "Driver not found"
            });
        }

        await redis.set(
            `driver:status:${driver.id}`,
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

        const rideId = await redis.get(`driver:ride:${driverId}`);

        if (rideId) {
            emitRideEvent(
                rideId,
                "DRIVER_LOCATION_UPDATED",
                {
                    driverId,
                    latitude,
                    longitude
                }
            );
        }

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

const findNearbyDrivers = async (req, res) => {
    try {
        const { latitude, longitude, radius } = req.query;

        if (latitude === undefined || longitude === undefined || radius === undefined) {
            return res.status(400).json({
                error: "latitude, longitude and radius are required"
            });
        }

        const drivers = await driverService.findNearbyDrivers(
            Number(latitude),
            Number(longitude),
            Number(radius)
        );

        return res.json({ drivers });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Failed to find nearby drivers"
        });
    }
};

export default { createDriver, goOnline, goOffline, updateLocation, findNearbyDrivers };