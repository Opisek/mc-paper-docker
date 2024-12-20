import { UUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import net from "net";

import { getOperators, getPlayerBans, getServerProperties, getWhitelist } from "./config.js";
import { OperatorEntry, PlayerBanEntry, ServerProperties, WhitelistEntry } from "../typings/config.js";
import { StatusResponse } from "../typings/protocol.js";
import { offlineUUID, parseHandshake, parseLoginStart, parsePacketHeader, serializeLoginDisconnect, serializePongResponse } from "./protocol.js";
import * as uuidlib from "uuid";

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

    // Allow the operator to start the real server from the console
    process.stdin.on("data", (message) => {
      if (message.toString().trim() !== "start") return;
      this.close();
    });

    this.socket.listen(this.serverProperties.serverPort, this.serverProperties.serverIp);
  }

  async handleConnection(socket: net.Socket) {
    // Create a new client connection
    const client = new ClientConnection(this, socket);
    this.clients.set(socket, client);

    // Handle the client
    const startRealServer = await client.handleClient();
    this.clients.delete(socket);

    // Close the mock server on successful request
    if (startRealServer) this.close();
  }

  waitForClose() {
    return new Promise<void>((resolve) => {
      if (!this.socket) resolve();
      else this.socket.on("close", resolve);
    });
  }

  close() {
    for (const client of this.clients.values()) {
      client.success = false;
      client.socket.end();
    }
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

  success: boolean;

  constructor(server: MockServer, socket: net.Socket) {
    this.server = server;
    this.socket = socket;
    this.state = 0;
    this.bufferedData = Buffer.alloc(0);
    this.fullPackets = [];
    this.mutex = false;
    this.success = false;
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

    return new Promise<boolean>((resolve, reject) => {
      this.socket.on("close", () => resolve(this.success));
      this.socket.on("error", reject);
    });
  }

  async handleData() {
    if (this.socket.closed) return;

    // Parse the packet header
    const { id, payload } = parsePacketHeader(this.fullPackets.shift());

    // Change state and create a response
    const response = this.createResponse(id, payload);

    // Send a response to the client
    await new Promise<void>((resolve) => {
      if (response.response.length == 0) resolve();
      else this.socket.write(response.response, () => resolve());
    })

    // Close the connection if needed
    if (response.disconnect) this.socket.end();

    // Parse next packet in the queue
    if (this.fullPackets.length != 0) this.handleData();
    else this.mutex = false;
  }

  createResponse(id: number, payload: Buffer): { response: Buffer, disconnect: boolean } {
    switch (this.state) {
      // Initial state
      case 0:
        const { nextState } = parseHandshake(payload);
        this.state = nextState;
        return { response: Buffer.alloc(0), disconnect: false };
      
      // Status state
      case 1:
        switch (id) {
          // Status response
          case 0:
            return { response: this.server.cachedStatusResponse.raw, disconnect: false };

          // Pong response
          case 1:
            return { response: serializePongResponse(payload), disconnect: false };
        }
        break;

      // Login state
      case 2:
        switch (id) {
          case 0:
            // IMPORTANT:
            // User authentication is NOT a responsibility of the mock server.
            // A manipulated client will be able to start the real server by faking their UUID.
            // Such a client will be rejected by the the real server later on.
            // This is a known limitation and there are no plans to address it.

            const { name, uuid: rawUuid } = parseLoginStart(payload);
            const uuid = uuidlib.stringify((
              this.server.serverProperties.onlineMode ?
              rawUuid :
              offlineUUID(name)
            ) as Uint8Array) as UUID;

            // Check whitelist
            if (
              this.server.serverProperties.whitelist &&
              !this.server.whitelist.has(uuid) &&
              !this.server.operators.has(uuid)
            ) return {
              response: serializeLoginDisconnect("You are not whitelisted on this server!"),
              disconnect: false
            };

            // Check blacklist
            if (this.server.playerBans.has(uuid)) {
              const ban = this.server.playerBans.get(uuid);
              if (ban.expires === "forever" || Date.now() > new Date(ban.expires).getTime()) {
                return {
                  response: serializeLoginDisconnect(`You are banned from this server.\nReason: ${ban.reason}`),
                  disconnect: false
                };
              }
            }

            // TODO: Check IP bans

            console.log(`Player ${name} attempted to join.`);
            this.success = true;
            return {
              response: serializeLoginDisconnect("The server will start shortly. Please join again in a few seconds."),
              disconnect: false
            };
        }
      break;

      // Transfer state
      case 3:
        console.error("Unhandled state: 3");
      break;
    }

    return { response: Buffer.alloc(0), disconnect: false };
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