# install dependencies and compile typescript
FROM node:18-alpine as build

WORKDIR /app

COPY package.json .
RUN npm i --production
RUN cp -r node_modules /tmp/node_modules_prod
RUN npm i

COPY tsconfig.json .
COPY src .
RUN npm run build

# run the runtime
FROM node:18-alpine as runtime

WORKDIR /app

RUN apk add --no-cache openjdk17-jre-headless
RUN apk add --no-cache su-exec

COPY --from=build /tmp/node_modules_prod ./node_modules
COPY --from=build /app/build ./build
COPY package.json .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
ENTRYPOINT [ "sh", "entrypoint.sh" ]