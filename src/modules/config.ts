import { join } from "path";
import { UUID } from "crypto";
import { createReadStream } from "fs";
import { readFile } from "fs/promises";
import { createInterface } from "readline";

import { minecraft } from "./paths.js";

import { Environmental, IpBanEntry, OperatorEntry, PlayerBanEntry, ServerProperties, WhitelistEntry } from "../typings/config.js";

const serverPropertiesRegex = /^([^=]+)=(.*)$/;

export function getEnvironmental(): Environmental {
  return {
    eula: process.env.EULA === "true",
    version: process.env.VERSION || "latest",
    channel: process.env.CHANNEL || "default",
    xms: process.env.XMS || "4G",
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
    enableStatus: parsedFile.get("enable-status") === "true" || true,
    hideOnlinePlayers: parsedFile.get("hide-online-players") === "true" || false,
    maxPlayers: Number.parseInt(parsedFile.get("max-players")) || 20,
    motd: parsedFile.get("motd") || "A Minecraft Server",
    onlineMode: parsedFile.get("online-mode") === "true" || true,
    serverIp: parsedFile.get("server-ip") || undefined,
    serverPort: Number.parseInt(parsedFile.get("server-port")) || 25565,
    whitelist: parsedFile.get("white-list") === "true" || false,
  };
}

export async function getWhitelist(): Promise<Map<UUID, WhitelistEntry>> {
  const fileBody = await readFile(join(minecraft, "whitelist.json"));
  const list: WhitelistEntry[] = JSON.parse(fileBody.toString());
  return new Map(list.map((x) => [ x.uuid, x ]));
}

export async function getOperators(): Promise<Map<UUID, OperatorEntry>> {
  const fileBody = await readFile(join(minecraft, "ops.json"));
  const list: OperatorEntry[] = JSON.parse(fileBody.toString());
  return new Map(list.map((x) => [ x.uuid, x ]));
}

export async function getPlayerBans(): Promise<Map<UUID, PlayerBanEntry>> {
  const fileBody = await readFile(join(minecraft, "banned-players.json"));
  const list: PlayerBanEntry[] = JSON.parse(fileBody.toString());
  return new Map(list.map((x) => [ x.uuid, x ]));
}

export async function getIpBans(): Promise<Map<string, IpBanEntry>> {
  const fileBody = await readFile(join(minecraft, "banned-ips.json"));
  const list: IpBanEntry[] = JSON.parse(fileBody.toString());
  return new Map(list.map((x) => [ x.ip, x ]));
}