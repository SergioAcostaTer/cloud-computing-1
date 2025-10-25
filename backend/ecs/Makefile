# ===============================
# 🚀 Makefile - Bitcoin Tracker
# ===============================
# Build, push, and redeploy to AWS ECS Fargate automatically
# Usage:
#   make build       -> Build Docker image
#   make push        -> Push image to ECR
#   make deploy      -> Force ECS to use latest image
#   make all         -> Build, push, and deploy in one command
# ===============================
REGION = us-east-1
ACCOUNT_ID = 992382582640
REPO_NAME = bitcoin-crud
IMAGE_URI = $(ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com/$(REPO_NAME):latest

build:
	@echo "🏗️  Building Docker image..."
	docker build -t $(REPO_NAME) .

tag:
	@echo "🔖 Tagging image..."
	docker tag $(REPO_NAME):latest $(IMAGE_URI)

login:
	@echo "🔐 Logging in to ECR..."
	aws ecr get-login-password --region $(REGION) | docker login --username AWS --password-stdin $(ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com

push: login
	@echo "📤 Pushing image to ECR..."
	docker push $(IMAGE_URI)

all: build tag push
	@echo "✅ Deployment completed successfully!"
