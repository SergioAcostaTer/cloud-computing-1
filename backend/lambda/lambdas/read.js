const { DynamoDBClient, GetItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const id = event.pathParameters?.id;

    try {
        if (id) {
            const data = await client.send(
                new GetItemCommand({
                    TableName: TABLE_NAME,
                    Key: { id: { S: id } },
                })
            );
            if (!data.Item) return res(404, { message: "Not found" });
            return res(200, unmarshall(data.Item));
        } else {
            const data = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
            const items = data.Items ? data.Items.map(unmarshall) : [];
            return res(200, items);
        }
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
