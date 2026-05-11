.PHONY: install dev build start summary clean

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start: build
	npm run start

summary:
	curl -X POST http://localhost:3000/api/summary/today

clean:
	rm -rf .next node_modules
