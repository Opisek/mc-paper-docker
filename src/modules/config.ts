import { join } from "path";
import { readFile } from "fs/promises";

import { minecraft } from "./paths.js";

import { Environmental, IpBanEntry, PlayerBanEntry, ServerProperties, WhitelistEntry } from "../typings/config.js";
import { createInterface } from "readline";
import { createReadStream } from "fs";

const serverPropertiesRegex = /^([^=]+)=(.*)$/;

export function getEnvironmental(): Environmental {
  return {
    eula: process.env.EULA === "true",
    version: process.env.VERSION || "latest",
    channel: process.env.CHANNEL || "default",
    xms: process.env.XMX || "4G",
    xmx: process.env.XMX || "4G",
    gracePeriod: Number.parseInt(process.env.GRACE) || 180,
  };
}

async function parseServerPropertiesFile(path: string): Promise<Map<string, string>> {
  const res = new Map<string, string>();

  const readInterface = createInterface({
    input: createReadStream(path),
  });

  for await (const line of readInterface) {
    if (line.startsWith("#")) continue;
    const match = line.match(serverPropertiesRegex);
    if (!match) continue;
    res.set(match[1], match[2]);
  }

  return res;
}

export async function getServerProperties(): Promise<ServerProperties> {
  const parsedFile = await parseServerPropertiesFile(join(minecraft, "server.properties"));

  return {
    motd: parsedFile.get("motd") || "A Minecraft Server",
    maxPlayers: Number.parseInt(parsedFile.get("max-players")) || 20,
    enableStatus: parsedFile.get("enable-status") === "true" || true,
    serverIp: parsedFile.get("server-ip")|| "127.0.0.1",
    serverPort: Number.parseInt(parsedFile.get("server-port")) || 25565,
    hideOnlinePlayers: parsedFile.get("hide-online-players") === "true" || false,
    whiteList: parsedFile.get("white-list") === "true" || false,
  };
}

export async function getWhitelist(): Promise<WhitelistEntry[]> {
  const fileBody = await readFile(join(minecraft, "whitelist.json"));
  return JSON.parse(fileBody.toString());
}

export async function getPlayerBans(): Promise<PlayerBanEntry[]> {
  const fileBody = await readFile(join(minecraft, "banned-players.json"));
  return JSON.parse(fileBody.toString());
}

export async function getIpBans(): Promise<IpBanEntry[]> {
  const fileBody = await readFile(join(minecraft, "banned-ips.json"));
  return JSON.parse(fileBody.toString());
}