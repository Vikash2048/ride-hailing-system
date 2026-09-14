import rideService from "../services/rideService.js";

const createRide = async (req, res) => {
    try {
        const { riderId, pickup, dropoff } = req.body;

        if (!riderId || !pickup?.latitude || !pickup?.longitude || !dropoff?.latitude || !dropoff?.longitude ) {
            return res.status(400).json({
                error: "Invalid ride request"
            });
        }

        const ride = await rideService.createRide(
            riderId,
            pickup.latitude,
            pickup.longitude,
            dropoff.latitude,
            dropoff.longitude
        );

        res.status(201).json(ride);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to create ride"
        });
    }
};

const acceptRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { driverId }  = req.body;

        const ride = await rideService.acceptRide(rideId, driverId);

        if (!ride) {
            return res.status(409).json({
                error: "Ride cannot be accepted"
            });
        }

        res.json(ride);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to accept ride"
        });
    }
}

export default { createRide, acceptRide };