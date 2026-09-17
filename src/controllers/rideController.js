import rideService from "../services/rideService.js";

const createRide = async (req, res) => {
    try {
        const { riderId, pickup, dropoff } = req.body;
        const idempotencyKey = req.headers["idempotency-key"];

        if (!riderId || !pickup?.latitude || !pickup?.longitude || !dropoff?.latitude || !dropoff?.longitude ) {
            return res.status(400).json({
                error: "Invalid ride request"
            });
        }

        if (!idempotencyKey) {
            return res.status(400).json({
                error: "Idempotency-key header is required"
            });
        }

        console.log("creating ride...")

        const ride = await rideService.createRide(
            riderId,
            pickup.latitude,
            pickup.longitude,
            dropoff.latitude,
            dropoff.longitude,
            idempotencyKey
        );

        res.status(201).json(ride)

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

const rejectRide = async (req, res) => {
    try {
        const { rideId } = req. params;
        const { driverId } = req.body;

        const ride = await rideService.rejectRide(rideId, driverId);

        if (!ride) {
            return res.status(400).json({
                error: "Ride connot be rejected"
            });
        }

        res.json(ride);
    } catch (error) {
        console.log(error);

        res.status(500).json({
            error: "Failed to reject ride"
        })
    }
}

const driverArriving = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { driverId } = req.body;

        console.log("driverArriving: ", rideId, driverId)

        const ride = await rideService.driverArriving(rideId, driverId);

        console.log("ride:", ride)

        if (!ride) {
            return res.status(409).json({
                error: "Ride cannot be marked as arriving"
            });
        }

        res.json(ride);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to update ride status"
        });
    }
}

const startRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { driverId } = req.body;

        const ride = await rideService.startRide(rideId, driverId);

        if (!ride) {
            res.status(409).json({
                error: "Ride cannot be started"
            });
        }

        res.json(ride);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to start ride"
        });
    }
}

const compeleteRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { driverId } = req.body;

        const ride = await rideService.completeRide(rideId, driverId);

        if (!ride) {
            return res.status(409).json({
                error: "Ride cannot be completed"
            });
        }

        res.json(ride);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Failed to complete ride"
        })
    }
}

const cancelRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { riderId } = req.body;

        const ride = await rideService.cancelRide(rideId, riderId);

        if (!ride) {
            return res.status(409).json({
                error: "Ride cannot be cancelled"
            })
        }

        res.json(ride);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to cancel ride"
        })
    }
}

const getRidesByRider = async (req, res) => {
    try {
        const { riderId } = req.params;

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const rides = await rideService.getRidesByRider(riderId, page, limit);
        res.json(rides);
    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: "Failed to fetch the ride history"
        });
    }
}

export default { createRide, acceptRide, rejectRide, driverArriving, startRide, compeleteRide, cancelRide, getRidesByRider };