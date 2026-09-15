import riderRepository from "../repositories/rideRepository.js";
import driverService from "./driverService.js";
import { redis } from "../config/redis.js";

const createRide = async (riderId, pickupLat, pickupLng, dropoffLat, dropoffLng) => {
    //1. create ride
    const ride = await riderRepository.createRide(riderId, pickupLat, pickupLng, dropoffLat, dropoffLng);
    console.log("ride created")
    
    //2. find nearby available drivers
    const drivers = await driverService.findNearbyDrivers(pickupLat, pickupLng, 5);
    console.log("nearby driver found")
    
    // 3.no driver available
    if (drivers.length === 0) return ride;
    
    // 4. Match drivers sequentially
    matchDriver(ride, drivers).catch(error => {
        console.error("Driver matching failed: ", error);
    });

    return ride;
};

const acceptRide = async (rideId, driverId) => {
    const ride = await riderRepository.acceptRide(rideId, driverId);

    if (!ride) {
        return null;
    }

    // tell matcher that driver accepted
    await redis.set(`ride:response:${rideId}`,"ACCEPTED");
    
    // confirm reservation
    await driverService.confirmDriver(driverId, rideId);
    return ride;
}

const rejectRide = async (rideId, driverId) => {
    const ride = await riderRepository.rejectRide(rideId, driverId);

    if (!ride) {
        return null;
    }

    // release driver
    // await redis.del(`driver:lock:${driverId}`);
    // await redis.set(`driver:status:${driverId}`, "AVAILABLE");
    await redis.set(`ride:response:${rideId}`,"REJECTED");

    return ride;
}

const waitForDriverResponse = async (rideId, timeout = 10000) => {
    return new Promise( async (resolve) => {
        const key = `ride:response:${rideId}`;

        await redis.set(key, "WAITING", {
            EX: 15
        });

        const start = Date.now();
        const check = async () => {
            const response = await redis.get(key);
            if (response === "ACCEPTED") {
                return resolve(true);
            }

            if (response === "REJECTED") {
                return resolve(false);
            }

            if (Date.now() - start >= timeout) {
                return resolve(false);
            }

            setTimeout(check, 500);
        }

        check();
    });
}

const matchDriver = async (ride, drivers) => {
    for (const driver of drivers) {
        console.log(`Trying driver: ${driver.driverId}`);

        //1. Reserver driver
        const reserved = await driverService.reserveDriver(driver.driverId, ride.id);

        if (!reserved) {
            console.log(`Driver ${driver.driverId} could not be reserved`);

            continue;
        }

        console.log(`Driver ${driver.driverId} reserved`);

        // 2. Assign driver to ride
        await riderRepository.assignDriver(ride.id,driver.driverId);

        // 3. Wait for driver response
        const accepted = await waitForDriverResponse(ride.id);

        // 4. Driver accepted
        if (accepted) {
            console.log(`Driver ${driver.driverId} accepted ride ${ride.id}`);
            return driver;
        }

        console.log(
            `Driver ${driver.driverId} rejected/timed out`
        );

        // 5. Driver rejected / timeout
        await driverService.releaseDriver(driver.driverId,ride.id);

        // 6. Release driver
        await riderRepository.clearDriver(ride.id, driver.driverId);

        console.log(`Driver ${driver.driverId} released`);

        
    }
    console.log("No driver available");
    return null;
}

export default { createRide, acceptRide, rejectRide, waitForDriverResponse, matchDriver };