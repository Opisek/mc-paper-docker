# install dependencies and compile typescript
FROM node:20.10-bookworm as build

WORKDIR /app

COPY package.json .
RUN npm i --production
RUN cp -r node_modules /tmp/node_modules_prod
RUN npm i

COPY tsconfig.json .
COPY src .
RUN npm run build

# run the runtime
FROM node:20.10-bookworm as runtime

WORKDIR /app

RUN apt-get update
RUN apt-get install -y ca-certificates-java
RUN apt-get install -y gosu

# https://adoptium.net/en-GB/installation/linux/
RUN apt-get install -y wget apt-transport-https gpg
RUN wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null
RUN echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list
RUN apt-get update
RUN apt-get install -y temurin-21-jre
RUN apt-get remove -y wget apt-transport-https gpg

COPY --from=build /tmp/node_modules_prod ./node_modules
COPY --from=build /app/build ./build
COPY package.json .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
ENTRYPOINT [ "sh", "entrypoint.sh" ]
