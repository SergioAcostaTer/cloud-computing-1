const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    const id = event.pathParameters?.id;

    try {
        if (method === "POST") {
            // Create
            const { symbol, quantity, type, entry, date } = body;
            if (!symbol || !quantity || !type || !date)
                return res(400, { error: "Missing required fields" });
            const item = { id: uuidv4(), symbol, quantity, type, entry, date };
            await dynamo.put({ TableName: TABLE_NAME, Item: item }).promise();
            return res(201, item);
        }

        if (method === "PUT" && id) {
            // Update
            const { symbol, quantity, type, entry, date } = body;
            const params = {
                TableName: TABLE_NAME,
                Key: { id },
                UpdateExpression:
                    "set symbol=:s, quantity=:q, #t=:t, entry=:e, #d=:d",
                ExpressionAttributeNames: { "#t": "type", "#d": "date" },
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
            return res(200, result.Attributes);
        }

        if (method === "DELETE" && id) {
            await dynamo.delete({ TableName: TABLE_NAME, Key: { id } }).promise();
            return res(200, { deleted: id });
        }

        return res(405, { error: "Method not allowed" });
    } catch (err) {
        return res(500, { error: err.message });
    }
};

function res(status, body) {
    return {
        statusCode: status,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(body),
    };
}
