# install dependencies and compile typescript
FROM node:20-bullseye as build

WORKDIR /app

COPY package.json .
RUN npm i --production
RUN cp -r node_modules /tmp/node_modules_prod
RUN npm i

COPY tsconfig.json .
COPY src .
RUN npm run build

# run the runtime
FROM node:20-bullseye as runtime

WORKDIR /app

RUN apt-get update
RUN apt-get install -y ca-certificates-java
RUN apt-get install -y openjdk-17-jre-headless
RUN apt-get install -y gosu

COPY --from=build /tmp/node_modules_prod ./node_modules
COPY --from=build /app/build ./build
RUN ls
COPY package.json .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
ENTRYPOINT [ "sh", "entrypoint.sh" ]
