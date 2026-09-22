import { kafka } from "../config/kafka.js";

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
        }
    });
};

startConsumer().catch(console.error);