import driverRepository from "../repositories/driverRepository.js";
import { redis } from "../config/redis.js";

const createDriver = async (userId) => {
    return await driverRepository.createDriver(userId);
};

const updateDriverStatus = async (driverId, status) => {
    return await driverRepository.updateDriverStatus(driverId, status);
};

const findNearbyDrivers = async (latitude, longitude, radiusKm) => {
    const drivers = await redis.geoSearchWith(
        "drivers:locations",
        {
            longitude,
            latitude
        },
        {
            radius: radiusKm,
            unit: "km"
        },
        ["WITHDIST"],
        {
            SORT: "ASC",
            COUNT: {
                value: 10,
                ANY: false
            }
        }
    );

    for(const driver of drivers) {
        console.log(driver)
    }

    const availableDrivers = [];

    for (const driver of drivers) {
        const status = await redis.get(
            `driver:status:${driver.member}`
        );

        if (status === "AVAILABLE") {
            availableDrivers.push({
                driverId: driver.member,
                distance: driver.distance
            });
        }
    }

    return availableDrivers;
};

const reserveDriverScript = `
local status = redis.call("GET", KEYS[1])

if not status or status ~= "AVAILABLE" then
    return 0
end

local locked = redis.call(
    "SET",
    KEYS[2],
    ARGV[1],
    "NX",
    "EX",
    10
)

if not locked then
    return 0
end

redis.call("SET", KEYS[1], "BUSY")

return 1
`;


const reserverDriver = async (driverId, rideId) => {
    const statusKey = `driver:status:${driverId}`;
    const lockKey = `driver:lock:${driverId}`;

    const result = await redis.eval(reserveDriverScript, {
        keys: [statusKey, lockKey],
        arguments: [rideId]
    });

    return result === 1;

    
    // const lockKey = `driver:lock:${driverId}`;
    // const statusKey = `driver:status:${driverId}`;

    // const result = await redis.set(
    //     lockKey,
    //     rideId,
    //     {
    //         NX: true,
    //         EX: 10
    //     }
    // );

    // if (!result) {
    //     return false;
    // }

    // const status = await redis.get(statusKey);

    // if (status !== "AVAILABLE") {
    //     await redis.del(lockKey);
    //     return false;
    // }

    // await redis.set(statusKey, "BUSY");

    // return true;

}

export default { createDriver, updateDriverStatus, findNearbyDrivers, reserverDriver };