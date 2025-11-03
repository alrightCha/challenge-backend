# Bear Challenge 

Challenge can be found under CHALLENGE.md

# Client 

Client Flutter app can be found under the following github repository: 

https://github.com/alrightCha/challenge-flutter-client

# Running the app

- 1. Pre-requisite: Running the db (on a docker container)

Command to run db: 

docker run --name bears-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -d postgres:16

- 2. Create TABLES colors, bear_colors and bears. 

SQL prompts can be found under src/migrations. 

- 3. Populate the DB with sample Data. 

Commands can be found under src/sample-data


- 4. npm install 

- 5. npm run start:dev 

# App Logic 

TODO.md covers the steps taken into making the app (more or less).

The app (for now), exposes REST APIs for colors and bears to be consumed by the client. 
A middleware is in place for throttling as well as logging. 

The tests are not implemented yet, as well as redis to have a producer/consumer and a queue using redis as well as caching the latest bear entities we have for faster queries and better request management for a scalable approach. 
