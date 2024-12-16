import * as varint from "varint";

export const serializePacket = (id: number, data: Buffer): Buffer => {
  const length = Buffer.from(varint.encode(data.length));
  const packetId = Buffer.from(varint.encode(id));

  return Buffer.concat([length, packetId, data]);
}