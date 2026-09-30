import z from "zod";

const lngCoordinate = z.number().min(-180).max(180);
const latCoordinate = z.number().min(-90).max(90);

const rideSchema = z.object({
    pickup: z.object({
        latitude: latCoordinate,
        longitude: lngCoordinate
    }),

    dropoff: z.object({
        latitude: latCoordinate,
        longitude: lngCoordinate
    })
});

export { rideSchema };