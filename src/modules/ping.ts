import net from "net";
import { parsePacketHeader, parseStatusResponse, serializeHandshake, serializeStatusRequest } from "./protocol.js";
import { StatusResponse } from "src/typings/protocol.js";

export const pingServer = async (address: string, port: number): Promise<StatusResponse> => {
  const socket = net.createConnection(port, address);

  await new Promise((resolve) => {
    socket.on("connect", resolve);
  });

  socket.write(serializeHandshake(769, address, port, 0x01));
  socket.write(serializeStatusRequest());

  let parseTimeout: NodeJS.Timeout = null;
  let allData = Buffer.alloc(0);

  return new Promise((resolve, reject) => {
    socket.on("data", async (data) => {
      clearTimeout(parseTimeout);
      allData = Buffer.concat([allData, data]);

      parseTimeout = setTimeout(async () => {
        const { payload } = parsePacketHeader(allData);
        const response = parseStatusResponse(payload);
        response.raw = data;
        resolve(response);
        socket.destroy();
      }, 100);
    });

    socket.on("error", (error) => {
      console.log(error);
      reject(error);
      socket.destroy();
    });
  });
}