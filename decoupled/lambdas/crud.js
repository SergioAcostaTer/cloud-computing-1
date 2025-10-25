const { DynamoDBClient, PutItemCommand, UpdateItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const method = event.httpMethod;
    const body = event.body ? JSON.parse(event.body) : {};
    const id = event.pathParameters?.id;

    try {
        if (method === "POST") {
            const { symbol, quantity, type, entry, date } = body;
            if (!symbol || !quantity || !type || !date)
                return res(400, { error: "Missing required fields" });

            const item = { id: uuidv4(), symbol, quantity, type, entry, date };
            await client.send(new PutItemCommand({ TableName: TABLE_NAME, Item: marshall(item) }));
            return res(201, item);
        }

        if (method === "PUT" && id) {
            const { symbol, quantity, type, entry, date } = body;
            const update = new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: marshall({ id }),
                UpdateExpression: "SET #s = :s, quantity = :q, #t = :t, entry = :e, #d = :d",
                ExpressionAttributeNames: { "#s": "symbol", "#t": "type", "#d": "date" },
                ExpressionAttributeValues: marshall({
                    ":s": symbol,
                    ":q": quantity,
                    ":t": type,
                    ":e": entry,
                    ":d": date,
                }),
                ReturnValues: "ALL_NEW",
            });
            const result = await client.send(update);
            return res(200, result.Attributes ? result.Attributes : {});
        }

        if (method === "DELETE" && id) {
            await client.send(new DeleteItemCommand({ TableName: TABLE_NAME, Key: marshall({ id }) }));
            return res(200, { deleted: id });
        }

        return res(405, { error: "Method not allowed" });
    } catch (err) {
        console.error("Error:", err);
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
