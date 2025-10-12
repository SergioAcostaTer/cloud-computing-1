import AWS from "aws-sdk";
import bodyParser from "body-parser";
import express from "express";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });
const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "BitcoinPositions";

// 📘 --- Swagger configuration ---
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Bitcoin Positions API",
            version: "1.0.0",
            description:
                "Simple CRUD API for managing Bitcoin positions (buy/sell operations) stored in DynamoDB.",
        },
        servers: [
            {
                url: "http://localhost:80",
                description: "Local development server",
            }
        ],
    },
    apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API CRUD ---

/**
 * @swagger
 * components:
 *   schemas:
 *     Position:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "a1b2c3d4"
 *         symbol:
 *           type: string
 *           example: "BTCUSDT"
 *         quantity:
 *           type: number
 *           example: 0.5
 *         type:
 *           type: string
 *           enum: [buy, sell]
 *           example: buy
 *         date:
 *           type: string
 *           example: "2025-10-12"
 */

/**
 * @swagger
 * /items:
 *   get:
 *     summary: Get all Bitcoin positions
 *     tags: [Positions]
 *     responses:
 *       200:
 *         description: List of all positions
 */
app.get("/items", async (req, res) => {
    try {
        const data = await dynamo.scan({ TableName: TABLE_NAME }).promise();
        res.json(data.Items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get a position by ID
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Found item
 */
app.get("/items/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const data = await dynamo.get({ TableName: TABLE_NAME, Key: { id } }).promise();
        res.json(data.Item || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Position:
 *       type: object
 *       properties:
 *         id: { type: string, example: "a1b2c3d4" }
 *         symbol: { type: string, example: "BTCUSDT" }
 *         quantity: { type: number, example: 0.5 }
 *         type: { type: string, enum: [buy, sell], example: buy }
 *         entry: { type: number, example: 26500.25 }
 *         date: { type: string, example: "2025-10-12" }
 */

app.post("/items", async (req, res) => {
    try {
        const { symbol, quantity, type, entry, date } = req.body;
        const item = { id: uuidv4(), symbol, quantity, type, entry, date };
        await dynamo.put({ TableName: TABLE_NAME, Item: item }).promise();
        res.status(201).json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/items/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { symbol, quantity, type, entry, date } = req.body;
        const params = {
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression:
                "set symbol=:s, quantity=:q, type=:t, entry=:e, date=:d",
            ExpressionAttributeValues: {
                ":s": symbol,
                ":q": quantity,
                ":t": type,
                ":e": entry,
                ":d": date,
            },
            ReturnValues: "ALL_NEW",
        };
        const result = await dynamo.update(params).promise();
        res.json(result.Attributes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: Delete a position
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
app.delete("/items/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await dynamo.delete({ TableName: TABLE_NAME, Key: { id } }).promise();
        res.json({ deleted: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Fallback for SPA (Single Page Application)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`✅ App running on port ${PORT} (Docs: http://localhost:${PORT}/docs)  🚀`));
