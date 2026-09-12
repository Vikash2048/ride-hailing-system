import driverRepository from "../repositories/driverRepository.js";
import { redis } from "../config/redis.js";

const createDriver = async (userId) => {
    return await driverRepository.createDriver(userId);
};

const updateDriverStatus = async (driverId, status) => {
    return await driverRepository.updateDriverStatus(driverId, status);
};

const findNearbyDrivers = async (latitude, longitude, radiusKm) => {
    const driversIds = await redis.geoSearch(
        "drivers:locations",
        {
            longitude,
            latitude
        },
        {
            radius: radiusKm,
            unit: "km"
        }
    );

    const availableDrivers = [];

    for (const driverId of driversIds){
        const status = await redis.get(
            `driver:status:${driverId}`
        );

        if (status === "AVAILABLE") {
            availableDrivers.push(driverId);
        }
    }

    return availableDrivers;
};

export default { createDriver, updateDriverStatus, findNearbyDrivers };