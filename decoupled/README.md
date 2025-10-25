# Bitcoin Positions API (Serverless Decoupled Version)

This project deploys a **serverless REST API** using **AWS Lambda**, **API Gateway**, and **DynamoDB** to manage Bitcoin trading positions.

---

## 📁 Project Structure

```

decoupled/
│
├── deploy.yml              # AWS CloudFormation template
├── lambda-code.zip         # (Generated during deployment)
└── lambdas/
├── crud.js             # Create, Update, Delete handlers
├── read.js             # Read all / Read by ID handler
├── openapi.js          # OpenAPI (Swagger) specification
└── root.js             # Root endpoint handler

````

---

## ⚙️ Prerequisites

Before deploying, make sure you have:

- AWS CLI installed and configured (`aws configure`)
- An AWS account with permissions for:
  - CloudFormation
  - Lambda
  - API Gateway
  - DynamoDB
  - S3
- Node.js 18+ (for local testing, optional)

---

## 🚀 Deployment Steps

### 1️⃣ Create a ZIP with all Lambda functions

From the `decoupled` directory:

```bash
cd lambdas
Compress-Archive -Path * -DestinationPath ..\lambda-code.zip -Force
cd ..
````

---

### 2️⃣ Create an S3 bucket

```bash
aws s3 mb s3://my-decoupled-lambda-bucket
```

---

### 3️⃣ Upload the Lambda code to S3

```bash
aws s3 cp lambda-code.zip s3://my-decoupled-lambda-bucket/
```

---

### 4️⃣ Deploy the CloudFormation stack

```bash
aws cloudformation deploy ^
  --template-file deploy.yml ^
  --stack-name bitcoin-decoupled ^
  --parameter-overrides LambdaCodeBucket=my-decoupled-lambda-bucket ^
  --capabilities CAPABILITY_NAMED_IAM
```

> ⚠️ Replace `my-decoupled-lambda-bucket` with your actual bucket name.

---

### 5️⃣ Verify Deployment

Get the API Gateway URL and API key:

```bash
aws cloudformation describe-stacks --stack-name bitcoin-decoupled
```

Outputs will include:

* `ApiUrl` – the base URL of your API
* `ApiKey` – required for all requests

---

## 🌐 Testing the API

Example request (PowerShell):

```bash
$URL = "https://abcd1234.execute-api.us-east-1.amazonaws.com/prod/positions"
$KEY = "YOUR_API_KEY"

Invoke-RestMethod -Uri $URL -Headers @{ "x-api-key" = $KEY } -Method GET
```

---

## 🧩 Endpoints

| Endpoint          | Method | Description               |
| ----------------- | ------ | ------------------------- |
| `/`               | GET    | Root information          |
| `/positions`      | GET    | List all positions        |
| `/positions`      | POST   | Create a new position     |
| `/positions/{id}` | GET    | Retrieve a position by ID |
| `/positions/{id}` | PUT    | Update a position         |
| `/positions/{id}` | DELETE | Delete a position         |
| `/openapi.json`   | GET    | OpenAPI documentation     |
| `/health`         | GET    | Health check endpoint     |

---

## 🧹 Clean Up

To remove all AWS resources:

```bash
aws cloudformation delete-stack --stack-name bitcoin-decoupled
```

---

## 📖 Notes

* DynamoDB table is created automatically by CloudFormation.
* All endpoints require an API key for access.

---
