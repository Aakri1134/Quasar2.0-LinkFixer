include .env
export

RABBITMQ_IMAGE=rabbitmq:4-management
RABBITMQ_CONTAINER=rabbitmq
REDIS_IMAGE=redis:8-alpine
REDIS_CONTAINER=redis

run-dev:
	docker compose -f docker-compose.local.yaml down
	docker compose -f docker-compose.local.yaml up --build -d

run-deploy:
	docker compose -f docker-compose.prod.yaml up

start-dev:
	-docker rm -f $(REDIS_CONTAINER)
	-docker rm -f $(RABBITMQ_CONTAINER)
	docker run -d --name $(REDIS_CONTAINER) -p 6379:6379 $(REDIS_IMAGE)
	docker run -d --name $(RABBITMQ_CONTAINER) -e RABBITMQ_DEFAULT_USER=$(RABBITMQ_DEFAULT_USER) -e RABBITMQ_DEFAULT_PASS=$(RABBITMQ_DEFAULT_PASS) -p 5672:5672 -p 15672:15672 rabbitmq:4-management
	npm run dev