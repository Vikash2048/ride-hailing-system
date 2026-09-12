import express from "express";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { redis } from "./config/redis.js";
import userRouter from "./routes/userRoutes.js";
import driverRouter from "./routes/driverRoutes.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/drivers", driverRouter);

const startServer = async () => {
    try {
        console.log("Starting server...")

        await redis.connect();
        console.log("Redis connected");

        await pool.query("select now()");
        console.log("Postgres connected");

        app.listen(process.env.APP_PORT||PORT, () => {
            console.log(`Server is running on port: ${process.env.APP_PORT||PORT}`)
        })

    } catch (error) {
        console.error("Server startup failed: ", error);
    }
};

startServer();

