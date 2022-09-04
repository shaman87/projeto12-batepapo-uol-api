import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect()
    .then(() => {
        db = mongoClient.db("chat-uol");
    })
    .catch((error) => {
        console.error(error);
    });

app.listen(5000, () => console.log("Listening on port 5000"));