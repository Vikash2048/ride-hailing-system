import { producer } from "../config/kafka.js";

const test = async () => {
    await producer.connect();

    console.log("Kafka is connected");

    await producer.send({
        topic: "ride-events",
        messages: [
            {
                key: "test",
                value: JSON.stringify({
                    event: "RideCreated",
                    rideId: "123"
                })
            }
        ]
    });

    console.log("Event sent");
    await producer.disconnect();
};

test();