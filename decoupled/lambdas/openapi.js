exports.handler = async () => {
    const spec = {
        openapi: "3.0.0",
        info: {
            title: "Bitcoin Positions API (Serverless)",
            version: "1.0.0",
            description: "A fully serverless CRUD API for managing Bitcoin trading positions in DynamoDB.",
        },
        servers: [
            {
                url: "https://{apiId}.execute-api.{region}.amazonaws.com/{stage}",
                variables: {
                    apiId: { default: "your-api-id" },
                    region: { default: "us-east-1" },
                    stage: { default: "prod" },
                },
            },
        ],
        components: {
            schemas: {
                Position: {
                    type: "object",
                    properties: {
                        id: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
                        symbol: { type: "string", example: "BTC/USD" },
                        quantity: { type: "number", example: 0.5 },
                        type: { type: "string", example: "long" },
                        entry: { type: "number", example: 30000 },
                        date: { type: "string", format: "date-time", example: "2025-10-25T10:00:00Z" },
                    },
                    required: ["symbol", "quantity", "type", "date"],
                },
                Health: {
                    type: "object",
                    properties: {
                        status: { type: "string", example: "healthy" },
                        uptime: { type: "number", example: 123.45 },
                        timestamp: { type: "string", format: "date-time" },
                    },
                },
                Error: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                    },
                },
            },
        },
        paths: {
            "/positions": {
                get: {
                    summary: "List all positions",
                    description: "Retrieve all Bitcoin trading positions from DynamoDB.",
                    responses: {
                        200: {
                            description: "List of positions",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "array",
                                        items: { $ref: "#/components/schemas/Position" },
                                    },
                                },
                            },
                        },
                        500: { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    },
                },
                post: {
                    summary: "Create a new position",
                    description: "Insert a new Bitcoin position into DynamoDB.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Position" },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: "Position created successfully",
                            content: { "application/json": { schema: { $ref: "#/components/schemas/Position" } } },
                        },
                        400: { description: "Missing required fields", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                        500: { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    },
                },
            },
            "/positions/{id}": {
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Unique position ID",
                    },
                ],
                get: {
                    summary: "Get position by ID",
                    description: "Fetch a single position record from DynamoDB by its ID.",
                    responses: {
                        200: { description: "Position found", content: { "application/json": { schema: { $ref: "#/components/schemas/Position" } } } },
                        404: { description: "Position not found" },
                        500: { description: "Server error" },
                    },
                },
                put: {
                    summary: "Update position by ID",
                    description: "Update an existing Bitcoin position in DynamoDB.",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Position" },
                            },
                        },
                    },
                    responses: {
                        200: { description: "Position updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Position" } } } },
                        400: { description: "Invalid request body" },
                        404: { description: "Position not found" },
                        500: { description: "Server error" },
                    },
                },
                delete: {
                    summary: "Delete position by ID",
                    description: "Remove a Bitcoin position record from DynamoDB.",
                    responses: {
                        200: {
                            description: "Position deleted",
                            content: { "application/json": { schema: { type: "object", properties: { deleted: { type: "string" } } } } },
                        },
                        404: { description: "Position not found" },
                        500: { description: "Server error" },
                    },
                },
            },
            "/health": {
                get: {
                    summary: "Health check",
                    description: "Check API health and uptime.",
                    responses: {
                        200: { description: "API is healthy", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } },
                    },
                },
            },
        },
    };

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(spec, null, 2),
    };
};
