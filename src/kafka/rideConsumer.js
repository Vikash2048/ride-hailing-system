import { kafka } from "../config/kafka.js";
import { pool } from "../config/db.js";

const consumer = kafka.consumer({
    groupId: "ride-notification-service"
});

const startConsumer = async () => {
    await consumer.connect();

    await consumer.subscribe({
        topic: "ride-events",
        fromBeginning: true
    });

    console.log("Kafka consumer connected");

    await consumer.run({
        eachMessage: async ({ message }) => {
            const event = JSON.parse(message.value.toString());

            console.log("Received event:", event);

            // check if already processed
            const result = await pool.query(
                `INSERT INTO processed_events (event_id)
                VALUES ($1)
                ON CONFLICT (event_id) DO NOTHING
                RETURING event_id`,
                [event.eventId]
            );

            if (result.rows.length === 0) {
                console.log(`Duplicate event ${event.eventId}, skipping..`);
                return;
            }

            // actual event processing
            console.log(`Processing ${event.event} for ride ${event.rideId}`);

            // mark event as processed
            await pool.query(
                `INSERT INTO processed_events (event_id)
                VALUES ($1)
                ON CONFLITCT (event_id) DO NOTHING
                RETURNING event_id`,
                [event.eventId]
            );

            console.log(`Event ${event.eventId} processed`);
        }
    });
};

startConsumer().catch(console.error);