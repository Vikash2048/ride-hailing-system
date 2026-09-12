import driverRepository from "../repositories/driverRepository.js";
import { redis } from "../config/redis.js";

const createDriver = async (userId) => {
    return await driverRepository.createDriver(userId);
};

const updateDriverStatus = async (driverId, status) => {
    return await driverRepository.updateDriverStatus(driverId, status);
};

const findNearbyDrivers = async (latitude, longitude, radiusKm) => {
    const drivers = await redis.geoSearch(
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

    return drivers;
};

export default { createDriver, updateDriverStatus, findNearbyDrivers };