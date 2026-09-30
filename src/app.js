import express from "express";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { redis } from "./config/redis.js";
import { producer } from "./config/kafka.js";
import userRouter from "./routes/userRoutes.js";
import driverRouter from "./routes/driverRoutes.js";
import rideRouter from "./routes/rideRoutes.js";
import http from "http";
import { initializeSocket } from "./socket/socket.js";
import fareService from "./services/fareService.js";

dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || "v1";

app.use(express.json());

const server = http.createServer(app);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/drivers", driverRouter);
app.use("/api/v1/rides", rideRouter);

const ride = {
    pickup_lat: 28.6139,
    pickup_lng: 77.2090,
    dropoff_lat: 28.4595,
    dropoff_lng: 77.0266
};

console.log(fareService.calculateFare(ride));

const startServer = async () => {
    try {
        console.log("Starting server...")
        
        await redis.connect();
        console.log("Redis connected");
        
        await pool.query("select now()");
        console.log("Postgres connected");
        
        await producer.connect();
        console.log("Kafka producer connected");
        
        await initializeSocket(server);
        
        server.listen(PORT, () => {
            console.log(`Server is running on port: ${process.env.APP_PORT||PORT}, app version: ${APP_VERSION}`)
        })

    } catch (error) {
        console.error("Server startup failed: ", error);
    }
};

startServer();

