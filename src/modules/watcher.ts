import { ChildProcessWithoutNullStreams } from "child_process";

import { getServerProperties } from "./config.js";

import { Environmental } from "../typings/config.js";
import { pingServer } from "./ping.js";
import { StatusResponse } from "src/typings/protocol.js";

const playerCountRegex = /.*(^|\n)\[[^\]]+\]: There are (\d+) of a max of \d+ players online:.+/;

export default async function watchServer(
  environmental: Environmental,
  serverInstance: ChildProcessWithoutNullStreams
): Promise<StatusResponse> {
  const serverProperties = await getServerProperties();
  let cachedStatusResponse: StatusResponse;

  return new Promise((resolve) => {
    let lastOnline = Date.now();

    const updateOnline = function (playerCount: number) {
      if (playerCount != 0) lastOnline = Date.now();
      else if ((Date.now() - lastOnline) / 1000 >= environmental.gracePeriod) {
        console.log("Shutting the server down due to inactivity.");
        serverInstance.stdin.write("stop\n");
      }
    };

    const queryPlayerCountByConsole = async function () {
      const responsePromise = new Promise<number>((resolve) => {
        serverInstance.stdout.on("data", function callback (message: Buffer) {
          const playerCountMatch = message.toString().match(playerCountRegex);
          if (!playerCountMatch) return;
          serverInstance.stdout.removeListener("data", callback);
          resolve(Number.parseInt(playerCountMatch[1]));
        });
      });
      serverInstance.stdin.write("list\n");
      updateOnline(await responsePromise);
    };

    const queryPlayerCountByPing = function () {
      pingServer(
        serverProperties.serverIp || "127.0.0.1",
        serverProperties.serverPort
      ).then((response) => {
        // Save the latest ping response (preferably with 0 players online) for replay later
        if (!cachedStatusResponse || response.players.online == 0) cachedStatusResponse = response;
        updateOnline(response.players.online);
      }).catch(() => {
        queryPlayerCountByConsole();
      });
    };

    const interval = setInterval(
      !serverProperties.enableStatus || serverProperties.hideOnlinePlayers
        ? queryPlayerCountByConsole
        : queryPlayerCountByPing
      , 10000);

    serverInstance.on("close", () => {
      clearInterval(interval);
      process.stdin.removeAllListeners();
      resolve(cachedStatusResponse);
    });
  });
}