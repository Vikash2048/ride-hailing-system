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

dotenv.config();

const app = express();
const PORT = 3000;
const APP_VERSION = process.env.APP_VERSION || "v1";

app.use(express.json());

const server = http.createServer(app);
initializeSocket(server);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/drivers", driverRouter);
app.use("/api/v1/rides", rideRouter);

const startServer = async () => {
    try {
        console.log("Starting server...")

        await redis.connect();
        console.log("Redis connected");

        await pool.query("select now()");
        console.log("Postgres connected");

        await producer.connect();
        console.log("Kafka producer connected");

        server.listen(process.env.APP_PORT||PORT, () => {
            console.log(`Server is running on port: ${process.env.APP_PORT||PORT}, app version: ${APP_VERSION}`)
        })

    } catch (error) {
        console.error("Server startup failed: ", error);
    }
};

startServer();

