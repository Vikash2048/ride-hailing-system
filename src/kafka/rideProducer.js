import { producer } from "../config/kafka.js";

const publishRideCreated = async (ride) => {
    await producer.send({
        topic: "ride-events",
        messages: [
            {
                key: ride.id,
                value: JSON.stringify({
                    event: "RideCreated",
                    rideId: ride.id,
                    riderId: ride.rider_id,
                    pickupLat: ride.pickup_lat,
                    pickupLng: ride.pickup_lng,
                    dropffLat: ride.dropoff_lat,
                    dropoffLng: ride.dropoff_lng,
                    createdAt: ride.created_at
                })
            }
        ]
    });
}

export { publishRideCreated };