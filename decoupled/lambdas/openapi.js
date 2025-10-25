exports.handler = async () => {
    const spec = {
        openapi: "3.0.0",
        info: {
            title: "Bitcoin Positions API (Serverless)",
            version: "1.0.0",
            description: "CRUD API for Bitcoin positions in DynamoDB.",
        },
        paths: {
            "/positions": {
                get: { summary: "List positions", responses: { 200: { description: "OK" } } },
                post: { summary: "Create position", responses: { 201: { description: "Created" } } },
            },
            "/positions/{id}": {
                get: { summary: "Get by ID", responses: { 200: { description: "OK" } } },
                put: { summary: "Update by ID", responses: { 200: { description: "Updated" } } },
                delete: { summary: "Delete by ID", responses: { 200: { description: "Deleted" } } },
            },
            "/health": { get: { summary: "Health check", responses: { 200: { description: "OK" } } } },
        },
    };

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(spec),
    };
};
