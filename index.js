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
        return res.status(422).send(errorList);
    }

    try {
        const participant = await db.collection("participants").findOne({ name });

        if (participant) {
            return res.status(409).send("Participante já cadastrado!");
        } else {
            await db.collection("participants").insertOne({ name, lastStatus: Date.now() });

            await db.collection("messages").insertOne({
                from: name, 
                to: "Todos", 
                text: "entra na sala...", 
                type: "status", 
                time: dayjs().format("HH:mm:ss")
            });

            return res.sendStatus(201);
        }
    } catch(error) {
        return res.status(500).send(error.message);
    }
});

app.get("/participants", async (req, res) => {
    try {
        const participantsList = await db.collection("participants").find().toArray();
        res.send(participantsList);
    } catch(error) {
        return res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const validation = messageSchema.validate({ to, text, type }, { abortEarly: false });

    if (validation.error) {
        const errorList = validation.error.details.map(error => error.message);
        return res.status(422).send(errorList);
    }

    try {
        const participantExist = await db.collection("participants").findOne({ name: user });

        if (!participantExist) {
            return res.status(422).send("Participante não encontrado!");
        } else {
            await db.collection("messages").insertOne({
                from: user, 
                to, 
                text, 
                type, 
                time: dayjs().format("HH:mm:ss")
            });

            return res.sendStatus(201);
        }
    } catch(error) {
        return res.status(500).send(error.message);
    }
});

app.get("/messages", async (req, res) => {
    const { user } = req.headers;
    const limit = parseInt(req.query.limit);

    try {
        const messagesList = await db.collection("messages").find().toArray();

        const messages = messagesList.filter(message => {
            if (message.type === "message" || message.type === "status" || message.from === user || message.to === user) {
                return true;
            }
        });

        if (limit) {
            res.send(messages.slice(-limit));
        } else {
            res.send(messages);
        }
    } catch(error) {
        return res.status(500).send(error.message);
    }
});

app.post("/status", async (req, res) => {
    const { user } = req.headers;

    try {
        const participantExist = await db.collection("participants").findOne({ name: user });

        if (!participantExist) {
            return res.sendStatus(404);
        } else {
            await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
        }

        return res.sendStatus(200);
    } catch(error) {
        return res.status(500).send(error.message);
    }
});

setInterval(async () => {
    try {
        const inactiveParticipants = await db.collection("participants").find({ lastStatus: { $lt: Date.now() - 10000 } }).toArray();
        
        if (inactiveParticipants.length > 0) {
            const leaveRoomMessages = inactiveParticipants.map(participant => {
                return {
                    from: participant.name, 
                    to: "Todos", 
                    text: "sai da sala...", 
                    type: "status", 
                    time: dayjs().format("HH:mm:ss")
                };
            });
            console.log(leaveRoomMessages);
            await db.collection("participants").deleteMany({ lastStatus: { $lt: Date.now() - 10000 } });
            await db.collection("messages").insertMany(leaveRoomMessages);
        }
        
    } catch(error) {
        console.log({ error });
    }
}, 15000);

app.listen(5000, () => console.log("Listening on port 5000"));