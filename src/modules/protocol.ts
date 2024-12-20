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

export const parsePacketHeader = (data: Buffer): { length: number, id: number, payload: Buffer } => {
  const length = varint.decode(data);
  data = data.subarray(varint.encodingLength(length)); // skip length field
  return { length, id: data[0], payload: data.subarray(1) };
}

export const parseStatusResponse = (data: Buffer): StatusResponse => {
  const strlen = varint.decode(data);
  const str = data.subarray(varint.encodingLength(strlen)); // skip string length
  const json = JSON.parse(str.toString());
  return json;
}

export const serializePongResponse = (pingData: Buffer): Buffer => {
  return serializePacket(0x01, pingData);
}

export const parseHandshake = (data: Buffer): { version: number, address: string, port: number, nextState: number } => {
  const version = varint.decode(data);
  data = data.subarray(varint.encodingLength(version));

  const addressLength = varint.decode(data);
  data = data.subarray(varint.encodingLength(addressLength));
  const address = data.subarray(0, addressLength).toString();
  data = data.subarray(addressLength);

  const port = data.readUInt16BE();
  data = data.subarray(2);

  const nextState = varint.decode(data);

  return { version, address, port, nextState };
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