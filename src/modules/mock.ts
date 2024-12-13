import { join } from "path";
import { UUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import net from "net";

import { minecraft } from "./paths.js";
import { getOperators, getPlayerBans, getServerProperties, getWhitelist } from "./config.js";
import { OperatorEntry, PlayerBanEntry, WhitelistEntry } from "../typings/config.js";

function encodeIcon(path: string): string {
  if (!existsSync(path)) return "";
  return "data:image/png;base64," + readFileSync(path).toString("base64");
}

export class MockServer {
  serverIp: string;
  serverPort: number;
  motd: string;
  favicon: string;
  maxPlayers: number;
  version: string;
  whitelistEnabled: boolean;
  whitelist: Map<UUID, WhitelistEntry>;
  operators: Map<UUID, OperatorEntry>;
  playerBans: Map<UUID, PlayerBanEntry>;

  socket: net.Server;

  constructor(
    serverIp: string,
    serverPort: number,
    motd: string,
    favicon: string,
    maxPlayers: number,
    version: string,
    whitelistEnabled: boolean,
    whitelist: Map<UUID, WhitelistEntry>,
    operators: Map<UUID, OperatorEntry>,
    playerBans: Map<UUID, PlayerBanEntry>,
  ) {
    this.serverIp = serverIp;
    this.serverPort = serverPort;
    this.motd = motd;
    this.favicon = favicon;
    this.maxPlayers = maxPlayers;
    this.version = version;
    this.whitelistEnabled = whitelistEnabled;
    this.whitelist = whitelist;
    this.operators = operators;
    this.playerBans = playerBans;
  }

  start() {
    this.socket = net.createServer();

    this.socket.on("connection", this.handleConnection);

    // allow the operator to start the real server from the console
    process.stdin.on("data", (message) => {
      if (message.toString().trim() !== "start") return;
      this.close();
    });

    this.socket.listen(this.serverPort, this.serverIp);
  }

  // TODO: add ip bans too
  handleConnection(socket: net.Socket) {
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

export async function runMockServer(version: string) {
  const serverProperties = await getServerProperties();

  const mockServer = new MockServer(
    serverProperties.serverIp,
    serverProperties.serverPort,
    serverProperties.motd,
    encodeIcon(join(minecraft, "server-icon.png")),
    serverProperties.maxPlayers,
    version,
    serverProperties.whitelist,
    await getWhitelist(),
    await getOperators(),
    await getPlayerBans(),
  );

  mockServer.start();

  return mockServer;
}

export function handleMockServer(mockServer: MockServer) {
  return mockServer.waitForClose();
}
