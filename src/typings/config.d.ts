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
  enableStatus: boolean,
  hideOnlinePlayers: boolean,
  maxPlayers: number,
  motd: string,
  onlineMode: boolean,
  serverIp: string,
  serverPort: number,
  whitelist: boolean,
}

export type WhitelistEntry = {
  uuid: UUID,
  name: string
}

export type OperatorEntry = {
  uuid: UUID,
  name: string
}

export type PlayerBanEntry = {
  uuid: UUID,
  name: string,
  created: string,
  source: string,
  expires: string,
  reason: string,
}

export type IpBanEntry = {
  ip: string,
  created: string,
  source: string,
  expires: string,
  reason: string,
}