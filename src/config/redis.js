import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redis = createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

redis.on("error", (error) => {
    console.error("Redis error: ", error);
});

export { redis };