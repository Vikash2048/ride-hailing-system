
import { pool } from "../config/db.js";
import { producer } from "../config/kafka.js";

const publishEvents = async () => {
    const result = await pool.query(
        `SELECT *
         FROM outbox_events
         WHERE published_at IS NULL
         ORDER BY id
         LIMIT 100`
    );

    console.log("publish Event result : ", result.rows)

    for (const event of result.rows) {
        try {
            await producer.send({
                topic: "ride-events",
                messages: [
                    {
                        key: event.aggregate_id,
                        value: JSON.stringify({
                            eventId: event.id,  // to unique identify the events
                            event: event.event_type,
                            ...event.payload
                        })
                    }
                ]
            });

            await pool.query(
                `UPDATE outbox_events
                 SET published_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [event.id]
            );

            console.log(
                `Published event ${event.id} (${event.event_type})`
            );

        } catch (error) {
            console.error(
                `Failed to publish event ${event.id}:`,
                error.message
            );
        }
    }
};

const startWorker = async () => {
    await producer.connect();

    console.log("Outbox worker started");

    setInterval(publishEvents, 2000);
};

startWorker().catch(console.error);