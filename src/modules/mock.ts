import { join } from "path";
import { UUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import { Client, createServer } from "minecraft-protocol";

import { minecraft } from "./paths.js";
import { getOperators, getPlayerBans, getServerProperties, getWhitelist } from "./config.js";

function encodeIcon(path: string): string {
  if (!existsSync(path)) return "";
  return "data:image/png;base64," + readFileSync(path).toString("base64");
}

export default async function runMockServer(version: string) {
  const serverProperties = await getServerProperties();
  const whitelist = await getWhitelist();
  const operators = await getOperators();
  const playerBans = await getPlayerBans();
  //const ipBans = await getIpBans();

  const mockServerOptions = {
    favicon: encodeIcon(join(minecraft, "server-icon.png")),
    host: serverProperties.serverIp,
    motd: serverProperties.motd,
    "online-mode": serverProperties.onlineMode,
    port: serverProperties.serverPort,
    maxPlayers: serverProperties.maxPlayers,
    version: version,
  };

  // TODO: check if we can respect "enableStatus"
  const mockServer = createServer(mockServerOptions);

  return new Promise<void>((resolve) => {
    mockServer.on("login", (client: Client) => {
      // TODO: explore how whitelist and bans work on servers not in online mode
      const clientUUID = client.uuid as UUID;

      // check whitelist
      if (serverProperties.whitelist && !whitelist.has(clientUUID) && !operators.has(clientUUID)) {
        client.end("You are not whitelisted on this server!");
        return;
      }

      // check blacklist
      if (playerBans.has(clientUUID)) {
        const ban = playerBans.get(clientUUID);
        if (ban.expires === "forever" || Date.now() > new Date(ban.expires).getTime()) {
          client.end(`You are banned from this server.\nReason: ${ban.reason}`);
          return;
        }
      }

      // TODO: handle ipBans as well

      // kill the mock
      console.log(`Player ${client.username} attempted to join.`);
      client.end("The server will start shortly. Please join again in a few seconds.");
      mockServer.close();
      resolve();
    });
  });
}