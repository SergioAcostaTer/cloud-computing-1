# ===============================
# Bitcoin API – Deployment Script
# ===============================

Write-Host "🚀 Starting Bitcoin API Deployment..." -ForegroundColor Cyan

# 1️⃣ Move into Lambda directory
cd "$PSScriptRoot\lambdas"

# 2️⃣ Clean up old builds
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue

# 3️⃣ Install only production dependencies
npm install --omit=dev

# 4️⃣ Move back to root
cd "$PSScriptRoot"

# 5️⃣ Create zip for Lambda code
Compress-Archive -Path ".\lambdas\*" -DestinationPath ".\lambda-code.zip" -Force

# 6️⃣ Upload zip to S3
$Bucket = "lambda-decoupled-api-bucket"
aws s3 cp .\lambda-code.zip s3://$Bucket/ --region us-east-1

# 7️⃣ Deploy stack
$StackName = "bitcoin-decoupled"
aws cloudformation deploy `
    --template-file .\deploy.yml `
    --stack-name $StackName `
    --parameter-overrides LambdaCodeBucket=$Bucket `
    --capabilities CAPABILITY_NAMED_IAM `
    --region us-east-1

# 8️⃣ Fetch CloudFormation outputs
Write-Host "`n✅ Deployment complete. Fetching outputs..." -ForegroundColor Green
$Outputs = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region us-east-1 `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

# 9️⃣ Extract API URL and API Key ID
$ApiUrl = ($Outputs | Where-Object { $_.OutputKey -match "ApiEndpoint|ApiUrl|ApiGatewayUrl" }).OutputValue
$ApiKeyId = ($Outputs | Where-Object { $_.OutputKey -match "ApiKey|ApiKeyId" }).OutputValue

# 🔟 Get the actual API Key value (if exists)
$ApiKeyValue = ""
if ($ApiKeyId) {
    try {
        $ApiKeyValue = aws apigateway get-api-key `
            --api-key $ApiKeyId `
            --include-value `
            --region us-east-1 `
            --query "value" `
            --output text
    } catch {
        Write-Host "⚠️  Unable to fetch API key value (permissions or key not found)." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No API Key ID found in stack outputs." -ForegroundColor Yellow
}

# 💬 Display results neatly
Write-Host "`n=====================================" -ForegroundColor DarkGray
Write-Host "✅ Bitcoin API Deployment Completed!" -ForegroundColor Green
Write-Host "🌐 API URL: $ApiUrl" -ForegroundColor Cyan
Write-Host "🔑 API Key: $ApiKeyValue" -ForegroundColor Yellow
Write-Host "=====================================`n" -ForegroundColor DarkGray
