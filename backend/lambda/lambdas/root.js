exports.handler = async () => ({
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
        message: "Bitcoin Positions API — Serverless version",
        docs: "/openapi.json",
        health: "/health",
    }),
});
