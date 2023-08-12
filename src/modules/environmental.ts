export type Configuration = {
  eula: boolean,
  version: string,
  channel: string,
  xms: string,
  xmx: string,
  gracePeriod: number,
}

export function getConfiguration(): Configuration {
  return {
    eula: process.env.EULA === "true",
    version: process.env.VERSION || "latest",
    channel: process.env.CHANNEL || "default",
    xms: process.env.XMX || "4G",
    xmx: process.env.XMX || "4G",
    gracePeriod: Number.parseInt(process.env.GRACE) || 180,
  };
}