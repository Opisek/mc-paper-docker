import { join } from "path";
import { UUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import net from "net";

import { minecraft } from "./paths.js";
import { getOperators, getPlayerBans, getServerProperties, getWhitelist } from "./config.js";
import { OperatorEntry, PlayerBanEntry, ServerProperties, WhitelistEntry } from "../typings/config.js";
import { StatusResponse } from "src/typings/protocol.js";

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
  handleConnection(socket: net.Socket) {
    console.log("Player connected to mock server.");
    socket.on("data", (data) => {
      console.log(data);
    });
    socket.write(this.cachedStatusResponse.raw);
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
