export type StatusResponse = {
  version: {
    name: string,
    protocol: number
  },
  players: {
    max: number,
    online: number,
    sample: {
      name: string,
      id: string
    }[]
  },
  description: {
    text: string
  },
  favicon: string,
  raw: Buffer
}