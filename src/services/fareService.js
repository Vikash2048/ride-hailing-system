import { calculateDistanceKm } from "./distanceService.js";

const calculateFare = (ride, surgeMultiplier = 1) => {
    const distanceKm = calculateDistanceKm(
        ride.pickup_lat,
        ride.pickup_lng,
        ride.dropoff_lat,
        ride.dropoff_lng
    );

    const baseFare = 50;
    const perKm = 15;
    const perMinute = 2;

    const estimatedMinutes = Math.ceil(distanceKm / 0.5);

    const distanceFare = distanceKm * perKm;
    const timeFare = estimatedMinutes * perMinute;

    const normalFare =
        baseFare +
        distanceFare +
        timeFare;

    const fare = normalFare * surgeMultiplier;

    return {
        distanceKm: Number(distanceKm.toFixed(2)),
        estimatedMinutes,
        surgeMultiplier,
        fare: Number(fare.toFixed(2))
    };
};
;

export default { calculateFare };