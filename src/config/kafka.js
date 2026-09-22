import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "ride-hailing-service",
    brokers: ["127.0.0.1:9092"],
    connectionTimeout: 10000,
    requestTimeout: 30000
});

const producer = kafka.producer();

export { kafka, producer}