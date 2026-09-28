import riderRepository from "../repositories/rideRepository.js";
import driverService from "./driverService.js";
import { redis } from "../config/redis.js";
import fareService from "./fareService.js";
import { emitRideEvent } from "../socket/socket.js";
import { publishRideCreated } from "../kafka/rideProducer.js";

const createRide = async (riderId, pickupLat, pickupLng, dropoffLat, dropoffLng, idempotencyKey) => {
    //1. create ride
    const rideResult = await riderRepository.createRide(riderId, pickupLat, pickupLng, dropoffLat, dropoffLng, idempotencyKey);
    console.log("ride created")
    
    //2. find nearby available drivers
    const drivers = await driverService.findNearbyDrivers(pickupLat, pickupLng, 10);
    console.log("nearby driver found: ",drivers)
    
    // 3.no driver available
    if (drivers.length === 0) return rideResult.ride;
    
    // 4. Match drivers sequentially
    matchDriver(rideResult.ride, drivers).catch(error => {
        console.error("Driver matching failed: ", error);
    });

    return rideResult.ride;
};

const acceptRide = async (rideId, driverId) => {
    const ride = await riderRepository.acceptRide(rideId, driverId);

    if (!ride) {
        return null;
    }

    // tell matcher that driver accepted
    await redis.set(`ride:response:${rideId}:${driverId}`,"ACCEPTED");
    
    // confirm reservation
    await driverService.confirmDriver(driverId, rideId);

    // so that we know driver is assign to which ride using redis
    await redis.set(`driver:ride:${driverId}`, rideId);

    // Notify rider
    emitRideEvent(
        ride.id,
        "DRIVER_ACCEPTED",
        {
            driverId: ride.driver_id,
            status: ride.status,
            acceptedAt: ride.accepted_at
        }
    );

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
    await redis.set(`ride:response:${rideId}:${driverId}`,"REJECTED");

    return ride;
}

const waitForDriverResponse = async (rideId, driverId) => {
    const key = `ride:response:${rideId}:${driverId}`;

    await redis.set(key, "WAITING", {
        EX: 15
    });

    const timeout = 10000;
    const interval = 500;

    const start = Date.now();

    while (Date.now() - start < timeout) {
        const response = await redis.get(key);

        if (response === "ACCEPTED") {
            return true;
        }

        if (response === "REJECTED") {
            return false;
        }

        await new Promise(resolve =>
            setTimeout(resolve, interval)
        );
    }

    return false;
};

const matchDriver = async (ride, drivers) => {
    console.log(`Sending ride ${ride.id} to ${drivers.length} drivers`);

    const offers = drivers.map(async (driver) => {

        const reserved = await driverService.reserveDriver(driver.driverId,ride.id);

        if (!reserved) {
            return null;
        }

        console.log(`Driver ${driver.driverId} reserved`);

        await riderRepository.assignDriver(ride.id,driver.driverId
        );

        const accepted = await waitForDriverResponse(
            ride.id,
            driver.driverId
        );

        if (!accepted) {
            await driverService.releaseDriver(
                driver.driverId,
                ride.id
            );

            await riderRepository.clearDriver(
                ride.id,
                driver.driverId
            );

            return null;
        }

        return driver;
    });

    const results = await Promise.all(offers);

    const winner = results.find(
        driver => driver !== null
    );

    if (!winner) {
        console.log("No driver accepted");
        return null;
    }

    console.log(`Winner driver: ${winner.driverId}`);

    // release rest all driver
    for (const driver of drivers) {
        if (driver.driverId === winner.driverId) {
            continue;
        }

        await driverService.releaseDriver(driver.driverId, ride.id);
        await riderRepository.clearDriver(ride.id, driver.driverId);
    }

    return winner || null;
};

const driverArriving = async (rideId, driverId) => {
    const ride = await riderRepository.driverArriving(rideId, driverId);

    emitRideEvent(
        ride.id,
        "DRIVER_ARRIVING",
        {
            driverId: ride.driver_id,
            status: ride.status
        }
    );

    return ride;

}

const startRide = async (rideId, driverId) => {
    const ride = await riderRepository.startRide(rideId, driverId);

    emitRideEvent(
        ride.id,
        "RIDE_STARTED",
        {
            driverId: ride.driver_id,
            status: ride.status,
            startedAt: ride.started_at
        }
    );

    return ride;

}

const completeRide = async (rideId, driverId) => {
    const ride = await riderRepository.getRideById(rideId);

    if (!ride) {
        return null;
    }

    const fare = await fareService.calculateFare(ride);

    const ride_status = await riderRepository.completeRide(rideId, driverId, fare);

    await redis.del(`driver:ride:${driverId}`);
    
    emitRideEvent(
        ride.id,
        "RIDE_COMPLETED",
        {
            driverId: ride.driver_id,
            status: ride.status,
            fare: ride.fare,
            completedAt: ride.completed_at
        }
    );
    
    return ride_status;
}

const cancelRide = async (rideId, riderId) => {
    const ride = await riderRepository.cancelRide(rideId, riderId);
    
    if (!ride) {
        return null;
    }
    
    // release driver if ride was already accepted
    if (ride.driver_id) {
        await driverService.releaseDriver(ride.driver_id, ride.id);
    }
    
    // notify matching process
    await redis.set(`ride:response:${rideId}`,"CANCELLED"    );
    await redis.del(`driver:ride:${ride.driverId}`);

    emitRideEvent(
        ride.id,
        "RIDE_CANCELLED",
        {
            status: ride.status
        }
    )
    

    return ride;
}

const getRidesByRider = async (riderId, page=1, limit=20) => {
    const offset = (page - 1) * limit;
    return await riderRepository.getRidesByRider(riderId, limit, offset);
};

export default { createRide, acceptRide, rejectRide, waitForDriverResponse, matchDriver, driverArriving, startRide, completeRide, cancelRide, getRidesByRider };