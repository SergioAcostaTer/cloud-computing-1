// ============================================================
//  Bitcoin Positions API (Express + DynamoDB + Swagger)
//  Public /docs endpoint with CORS and ECS-friendly configuration
// ============================================================

import AWS from "aws-sdk";
import bodyParser from "body-parser";
import express from "express";
import { dirname } from "path";
import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.json());

// ------------------------------------------------------------
// 🔒 Global CORS middleware (safe across API Gateway + browsers)
// ------------------------------------------------------------
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,x-api-key");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// ------------------------------------------------------------
// 💾 DynamoDB setup
// ------------------------------------------------------------
AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });
const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || "BitcoinPositions";

// ------------------------------------------------------------
// 📘 Swagger configuration
// ------------------------------------------------------------
const swaggerBase =
    process.env.SWAGGER_BASE_URL ||
    `https://${process.env.API_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/prod`;

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Bitcoin Positions API",
            version: "1.0.0",
            description: "Manage Bitcoin positions in DynamoDB. CRUD requires API key.",
        },
        servers: [{ url: swaggerBase }],
    },
    apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * @swagger
 * components:
 *   schemas:
 *     Position:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "a1b2c3d4-5678-90ab-cdef-1234567890ab"
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
 *         entry:
 *           type: number
 *           example: 26500.25
 *         date:
 *           type: string
 *           example: "2025-10-12"
 */

// ------------------------------------------------------------
// 🟢 CRUD: Positions
// ------------------------------------------------------------

/**
 * @swagger
 * /positions:
 *   get:
 *     summary: Get all Bitcoin positions
 *     tags: [Positions]
 *     responses:
 *       200:
 *         description: List of positions
 */
app.get("/positions", async (_, res) => {
    try {
        const data = await dynamo.scan({ TableName: TABLE_NAME }).promise();
        res.json(data.Items || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /positions/{id}:
 *   get:
 *     summary: Get a position by ID
 *     tags: [Positions]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Found position
 *       404:
 *         description: Not found
 */
app.get("/positions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const data = await dynamo.get({ TableName: TABLE_NAME, Key: { id } }).promise();
        if (!data.Item) return res.status(404).json({ message: "Not found" });
        res.json(data.Item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /positions:
 *   post:
 *     summary: Create a new position
 *     tags: [Positions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Position'
 *     responses:
 *       201:
 *         description: Created successfully
 */
app.post("/positions", async (req, res) => {
    try {
        const { symbol, quantity, type, entry, date } = req.body;
        if (!symbol || !quantity || !type || !date)
            return res.status(400).json({ error: "Missing required fields" });

        const item = { id: uuidv4(), symbol, quantity, type, entry, date };
        await dynamo.put({ TableName: TABLE_NAME, Item: item }).promise();
        res.status(201).json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /positions/{id}:
 *   put:
 *     summary: Update a position
 *     tags: [Positions]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Position'
 *     responses:
 *       200:
 *         description: Updated successfully
 */
app.put("/positions/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { symbol, quantity, type, entry, date } = req.body;
        const params = {
            TableName: TABLE_NAME,
            Key: { id },
            UpdateExpression: "set symbol = :s, quantity = :q, #t = :t, entry = :e, #d = :d",
            ExpressionAttributeNames: {
                "#t": "type",
                "#d": "date",
            },
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
 * /positions/{id}:
 *   delete:
 *     summary: Delete a position
 *     tags: [Positions]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
app.delete("/positions/:id", async (req, res) => {
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
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Uptime in seconds
 */
app.get("/health", (_, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.get("/openapi.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

app.get("/", (_, res) =>
    res.json({
        message: "Bitcoin Positions API — see /openapi.json for spec",
        status: "running",
    })
);

const PORT = process.env.PORT || 80;
app.listen(PORT, () =>
    console.log(`✅ Bitcoin API running on port ${PORT} (Docs: /) 🚀`)
);
