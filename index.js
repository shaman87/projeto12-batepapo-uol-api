import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("chat-uol");
});

const participantSchema = joi.object({
    name: joi.string().empty(" ").required()
});

const messageSchema = joi.object({
    to: joi.string().empty(" ").required(), 
    text: joi.string().empty(" ").required(), 
    type: joi.string().valid("message", "private_message").required()
});

app.post("/participants", async (req, res) => {
    const { name } = req.body;

    const validation = participantSchema.validate({ name }, { abortEarly: false });

    if (validation.error) {
        const errorList = validation.error.details.map(error => error.message);
        res.status(422).send(errorList);
    };

    try {
        const participantsList = await db.collection("participants").findOne({ name });

        if (participantsList) {
            res.status(409).send("Participante já cadastrado!");
        } else {
            await db.collection("participants").insertOne({ name, lastStatus: Date.now() });

            await db.collection("messages").insertOne({
                from: name, 
                to: "Todos", 
                text: "entra na sala", 
                type: "status", 
                time: dayjs().format("HH:mm:ss")
            });

            res.sendStatus(201);
        }
    } catch(error) {
        res.status(500).send(error.message);
    };
});

app.get("/participants", async (req, res) => {
    try {
        const participantsList = await db.collection("participants").find().toArray();
        res.send(participantsList);
    } catch(error) {
        res.sendStatus(500);
    };
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const validation = messageSchema.validate({ to, text, type }, { abortEarly: false });

    if (validation.error) {
        const errorList = validation.error.details.map(error => error.message);
        res.status(422).send(errorList);
    };

    try {
        const participantExist = await db.collection("participants").findOne({ name: user });

        if (!participantExist) {
            res.status(422).send("Participante não não encontrado!");
        } else {
            await db.collection("messages").insertOne({
                from: user, 
                to, 
                text, 
                type, 
                time: dayjs().format("HH:mm:ss")
            });

            res.sendStatus(201);
        }
    } catch(error) {
        res.status(500).send(error.message);
    };
});

app.listen(5000, () => console.log("Listening on port 5000"));