import AWS from "aws-sdk";
const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    const id = event.pathParameters?.id;
    try {
        if (id) {
            const data = await dynamo
                .get({ TableName: TABLE_NAME, Key: { id } })
                .promise();
            if (!data.Item) return res(404, { message: "Not found" });
            return res(200, data.Item);
        } else {
            const data = await dynamo.scan({ TableName: TABLE_NAME }).promise();
            return res(200, data.Items || []);
        }
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
