import { Environmental } from "../typings/config.js";

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