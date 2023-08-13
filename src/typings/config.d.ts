import { UUID } from "crypto";

export type Environmental = {
  eula: boolean,
  version: string,
  channel: string,
  xms: string,
  xmx: string,
  gracePeriod: number,
}

export type ServerProperties = {
  motd: string,
  maxPlayers: number,
  enableStatus: boolean,
  serverIp: string,
  serverPort: number,
  hideOnlinePlayers: boolean,
  whiteList: boolean,
}

export type WhitelistEntry = {
  uuid: UUID,
  name: string
}

export type PlayerBanEntry = {
  uuid: UUID,
  name: string,
  created: Date,
  source: string,
  expires: Date,
  reason: string,
}

export type IpBanEntry = {
  ip: string,
  created: Date,
  source: string,
  expires: Date,
  reason: string,
}