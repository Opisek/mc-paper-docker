import { UUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import net from "net";

import { getOperators, getPlayerBans, getServerProperties, getWhitelist } from "./config.js";
import { OperatorEntry, PlayerBanEntry, ServerProperties, WhitelistEntry } from "../typings/config.js";
import { StatusResponse } from "src/typings/protocol.js";
import { parseHandshake, parseLoginStart, parsePacketHeader, serializePongResponse } from "./protocol.js";

function encodeIcon(path: string): string {
  if (!existsSync(path)) return "";
  return "data:image/png;base64," + readFileSync(path).toString("base64");
}

export class MockServer {
  serverProperties: ServerProperties;

  version: string;

  whitelist: Map<UUID, WhitelistEntry>;
  operators: Map<UUID, OperatorEntry>;
  playerBans: Map<UUID, PlayerBanEntry>;

  cachedStatusResponse: StatusResponse;

  socket: net.Server;

  clients: Map<net.Socket, ClientConnection> = new Map();

  constructor(
    serverProperties: ServerProperties,
    version: string,
    whitelist: Map<UUID, WhitelistEntry>,
    operators: Map<UUID, OperatorEntry>,
    playerBans: Map<UUID, PlayerBanEntry>,
    cachedStatusResponse: StatusResponse
  ) {
    this.serverProperties = serverProperties;
    this.version = version;
    this.whitelist = whitelist;
    this.operators = operators;
    this.playerBans = playerBans;
    this.cachedStatusResponse = cachedStatusResponse;
  }

  start() {
    this.socket = net.createServer();

    this.socket.on("connection", this.handleConnection.bind(this));

    // allow the operator to start the real server from the console
    process.stdin.on("data", (message) => {
      if (message.toString().trim() !== "start") return;
      this.close();
    });

    this.socket.listen(this.serverProperties.serverPort, this.serverProperties.serverIp);
  }

  // TODO: add ip bans too
  async handleConnection(socket: net.Socket) {
    console.log("Player connected to mock server.");

    const client = new ClientConnection(this, socket);
    this.clients.set(socket, client);
    await client.handleClient();

    console.log("Player disconnected from the mock server.");
    this.clients.delete(socket);
  }

  waitForClose() {
    return new Promise<void>((resolve) => {
      if (!this.socket) resolve();
      else this.socket.on("close", resolve);
    });
  }

  close() {
    this.socket.close();
    process.stdin.removeAllListeners();
    this.socket = null;
  }
}

class ClientConnection {
  server: MockServer;
  socket: net.Socket;

  state: number;

  bufferedData: Buffer;
  fullPackets: Buffer[];

  mutex: boolean;

  constructor(server: MockServer, socket: net.Socket) {
    this.server = server;
    this.socket = socket;
    this.state = 0;
    this.bufferedData = Buffer.alloc(0);
    this.fullPackets = [];
    this.mutex = false;
  }

  handleClient() {
    this.socket.on("data", (data) => {
      // Buffer the received data
      data = Buffer.concat([this.bufferedData, data]);

      let gotNewPacket = false;

      // Split the data back into packets
      while (true) {
        if (data.length == 0) break;

        // Break once an incomplete packet is found
        const { length } = parsePacketHeader(data);
        if (data.length < length + 1) {
          this.bufferedData = Buffer.concat([this.bufferedData, data]);
          break;
        }

        // Push a full packet into the queue and continue parsing
        this.fullPackets.push(data.subarray(0, length + 1));
        data = data.subarray(length + 1);

        gotNewPacket = true;
      }

      // Handle the data once enough is received
      if (!gotNewPacket || this.mutex) return;
      this.mutex = true;
      this.handleData();
    });

    return new Promise<void>((resolve, reject) => {
      this.socket.on("close", resolve);
      this.socket.on("error", reject);
    });
  }

  async handleData() {
    if (this.socket.closed) return;

    const { id, payload } = parsePacketHeader(this.fullPackets.shift());

    const response = this.createResponse(id, payload);

    await new Promise<void>((resolve) => {
      if (response.length == 0) resolve();
      else this.socket.write(response, () => resolve());
    })
    // TODO: rewrite from scratch

    //mockServer.on("login", (client: Client) => {
    //  const clientUUID = client.uuid as UUID;

    //  // check whitelist
    //  if (serverProperties.whitelist && !whitelist.has(clientUUID) && !operators.has(clientUUID)) {
    //    client.end("You are not whitelisted on this server!");
    //    return;
    //  }

    //  // check blacklist
    //  if (playerBans.has(clientUUID)) {
    //    const ban = playerBans.get(clientUUID);
    //    if (ban.expires === "forever" || Date.now() > new Date(ban.expires).getTime()) {
    //      client.end(`You are banned from this server.\nReason: ${ban.reason}`);
    //      return;
    //    }
    //  }

    //  // TODO: check if there's a way we could handle ipBans as well

    //  // kill the mock
    //  console.log(`Player ${client.username} attempted to join.`);
    //  client.end("The server will start shortly. Please join again in a few seconds.");
    //  stopServer();
    //});

    if (this.fullPackets.length != 0) this.handleData();
    else this.mutex = false;
  }

  createResponse(id: number, payload: Buffer): Buffer {
    switch (this.state) {
      // Initial state
      case 0:
        const { nextState } = parseHandshake(payload);
        this.state = nextState;
        return Buffer.alloc(0);
      
      // Status state
      case 1:
        switch (id) {
          // Status response
          case 0:
            return this.server.cachedStatusResponse.raw;

          // Pong response
          case 1:
            return serializePongResponse(payload);
        }
        break;

      // Login state
      case 2:
        switch (id) {
          case 0:
            const { name, uuid } = parseLoginStart(payload);
            console.log(name, uuid);
        }
        return Buffer.alloc(0);

      // Transfer state
      case 3:
        console.error("Unhandled state: 3");
        return Buffer.alloc(0);
    }
  }
}


export async function runMockServer(version: string, cachedStatusResponse: StatusResponse) {
  const serverProperties = await getServerProperties();

  const mockServer = new MockServer(
    serverProperties,
    version,
    await getWhitelist(),
    await getOperators(),
    await getPlayerBans(),
    cachedStatusResponse
  );

  mockServer.start();

  return mockServer;
}

export function handleMockServer(mockServer: MockServer) {
  return mockServer.waitForClose();
}
