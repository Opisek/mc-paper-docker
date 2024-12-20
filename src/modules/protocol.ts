import crypto from "crypto";
import varint from "varint";
import { UUIDTypes } from "uuid";

import { StatusResponse } from "../typings/protocol.js";

export const offlineUUID = (name: string): Buffer => {
  const hash = crypto.createHash('md5')
  hash.update(`OfflinePlayer:${name}`, 'utf8')
  const buffer = hash.digest()
  buffer[6] = (buffer[6] & 0x0f) | 0x30
  buffer[8] = (buffer[8] & 0x3f) | 0x80
  return buffer
}

export const readLen = (data: Buffer): { length: number, data: Buffer } => {
  const length = varint.decode(data);
  data = data.subarray(varint.encodingLength(length));
  return { length, data };
}

export const encodeWithLen = (data: Buffer): Buffer => {
  const length = Buffer.from(varint.encode(data.length));
  return Buffer.concat([length, data]);
}

export const parsePacketHeader = (data: Buffer): { length: number, id: number, payload: Buffer } => {
  const { length, data: rest } = readLen(data);
  return { length, id: rest[0], payload: rest.subarray(1) };
}

export const serializePacket = (id: number, data: Buffer): Buffer => {
  const length = Buffer.from(varint.encode(data.length + 1));
  const packetId = Buffer.from(varint.encode(id));

  return Buffer.concat([length, packetId, data]);
}

export const parseHandshake = (data: Buffer): { version: number, address: string, port: number, nextState: number } => {
  const version = varint.decode(data);
  data = data.subarray(varint.encodingLength(version));

  const { length: addressLength, data: rest } = readLen(data);
  data = rest;
  const address = data.subarray(0, addressLength).toString();
  data = data.subarray(addressLength);

  const port = data.readUInt16BE();
  data = data.subarray(2);

  const nextState = varint.decode(data);

  return { version, address, port, nextState };
}

export const serializeHandshake = (protocolVersion: number, serverAddress: string, serverPort: number, nextState: number): Buffer => {
  const protocolVersionBuffer = Buffer.from(varint.encode(protocolVersion));

  const serverAddressBuffer = encodeWithLen(Buffer.from(serverAddress));

  const serverPortBuffer = Buffer.alloc(2);
  serverPortBuffer.writeUInt16BE(serverPort);
  
  const nextStateBuffer = Buffer.from(varint.encode(nextState));

  return serializePacket(0x00, Buffer.concat([
    protocolVersionBuffer,
    serverAddressBuffer,
    serverPortBuffer,
    nextStateBuffer
  ]));
}

export const serializeStatusRequest = (): Buffer => {
  return Buffer.from([0x01, 0x00]);
}

export const parseStatusResponse = (data: Buffer): StatusResponse => {
  const { data: str } = readLen(data);
  const json = JSON.parse(str.toString());
  return json;
}

export const serializePongResponse = (pingData: Buffer): Buffer => {
  return serializePacket(0x01, pingData);
}

export const parseLoginStart = (data: Buffer): { name: string, uuid: UUIDTypes } => {
  let { length: nameLength, data: rest } = readLen(data);
  const name = rest.subarray(0, nameLength).toString();
  rest = rest.subarray(nameLength);

  const uuid = rest.subarray(0, 16);

  return { name, uuid };
}

export const serializeLoginDisconnect = (reason: string): Buffer => {
  const reasonJson = { text: reason };
  const buffer = encodeWithLen(Buffer.from(JSON.stringify(reasonJson)));
  return serializePacket(0x00, buffer);
}