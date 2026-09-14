import riderRepository from "../repositories/rideRepository.js";
import driverService from "./driverService.js";

const createRide = async (riderId, pickupLat, pickupLng, dropoffLat, dropoffLng) => {
    //1. create ride
    const ride = await riderRepository.createRide(riderId, pickupLat, pickupLng, dropoffLat, dropoffLng);

    //2. find nearby available drivers
    const drivers = await driverService.findNearbyDrivers(pickupLat, pickupLng, 5);

    //3. try to reserver nearest drivers
    for (const driver of drivers) {
        const reserved = await driverService.reserverDriver(driver.driverId, ride.id);

        if (reserved) {
            //4. assign driver to ride
            const assignedRide = await riderRepository.assignDriver(ride.id, driver.driverId);
            return assignedRide;
        }
    }

    // no ride available
    return ride;
};

export default { createRide };