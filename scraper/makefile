run-dev-1:
	docker build -t scraper .
	docker run --env-file .env.dev -v ./logs:/app/logs -e INSTANCE_ID=scraper-1 -m 512m --network backend_default scraper

run-dev-2:
	docker build -t scraper .
	docker run --env-file .env.dev -v ./logs:/app/logs -e INSTANCE_ID=scraper-2 -m 512m --network backend_default scraper

run-dev-local:
	docker build -t scraper .
	docker run --env-file .env.local -e INSTANCE_ID=scraper-1 --network backend_default scraper