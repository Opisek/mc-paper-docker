import { ChildProcessWithoutNullStreams } from "child_process";

import { Environmental } from "../typings/config.js";
import { getServerProperties } from "./config.js";
import { ping, NewPingResult, OldPingResult } from "minecraft-protocol";
import * as minecraftProtocol from "minecraft-protocol"; // https://github.com/PrismarineJS/node-minecraft-protocol/issues/1253

const playerCountRegex = /\[[^\]]+\]: There are (\d+) of a max of \d+ players online:.+/;

export default async function watchServer(
  environmental: Environmental,
  serverInstance: ChildProcessWithoutNullStreams
): Promise<void> {
  const serverProperties = await getServerProperties();
  const pingOptions = {
    host: serverProperties.serverIp === "" ? "127.0.0.1" : serverProperties.serverIp,
  };

  return new Promise((resolve) => {
    let lastOnline = Date.now();

    const updateOnline = function (playerCount: number) {
      if (playerCount != 0) lastOnline = Date.now();
      else if ((Date.now() - lastOnline) / 1000 >= environmental.gracePeriod) {
        console.log("Shutting the server down due to inactivity.");
        serverInstance.stdin.write("stop\n");
      }
    };

    const queryPlayerCountByConsole = function () {
      serverInstance.stdin.write("list\n");
    };

    const queryPlayerCountByPing = function () {
      minecraftProtocol.default.ping(pingOptions, (error, result) => {
        if (error)
          queryPlayerCountByConsole();
        else if ((result as NewPingResult).players)
          updateOnline((result as NewPingResult).players.online);
        else
          updateOnline((result as OldPingResult).playerCount);
      }); 
    };

    setInterval(() => {
      if (serverProperties.hideOnlinePlayers) queryPlayerCountByConsole();
      else queryPlayerCountByPing();
    }, 10000);

    serverInstance.stdout.on("data", (message: Buffer) => {
      const playerCountMatch = message.toString().match(playerCountRegex);
      if (!playerCountMatch) return;

      const playerCount = Number.parseInt(playerCountMatch[1]);

      updateOnline(playerCount);
    });

    serverInstance.on("close", resolve);
  });
}