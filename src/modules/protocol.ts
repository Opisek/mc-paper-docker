import varint from "varint";
import { StatusResponse } from "../typings/protocol.js";

export const serializePacket = (id: number, data: Buffer): Buffer => {
  const length = Buffer.from(varint.encode(data.length + 1));
  const packetId = Buffer.from(varint.encode(id));

  return Buffer.concat([length, packetId, data]);
}

export const serializeStatusRequest = (): Buffer => {
  return Buffer.from([0x01, 0x00]);
}

export const parseStatusResponse = async (data: Buffer): Promise<StatusResponse> => {
  const len = varint.decode(data);
  data = data.subarray(varint.encodingLength(len) + 1); // skip length and packet id
  const strlen = varint.decode(data);
  data = data.subarray(varint.encodingLength(strlen)); // skip string length
  const json = JSON.parse(data.toString());
  return json;
}

export const serializeHandshake = (protocolVersion: number, serverAddress: string, serverPort: number, nextState: number): Buffer => {
  const protocolVersionBuffer = Buffer.from(varint.encode(protocolVersion));

  const serverAddressBuffer = Buffer.from(serverAddress);
  const serverAddressSize = Buffer.from(varint.encode(serverAddress.length));

  const serverPortBuffer = Buffer.alloc(2);
  serverPortBuffer.writeUInt16BE(serverPort);
  
  const nextStateBuffer = Buffer.from(varint.encode(nextState));

  return serializePacket(0x00, Buffer.concat([
    protocolVersionBuffer,
    serverAddressSize,
    serverAddressBuffer,
    serverPortBuffer,
    nextStateBuffer
  ]));
}