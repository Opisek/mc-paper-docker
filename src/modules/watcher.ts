import { ChildProcessWithoutNullStreams } from "child_process";

import { getServerProperties } from "./config.js";

import { Environmental } from "../typings/config.js";

const playerCountRegex = /.*(^|\n)\[[^\]]+\]: There are (\d+) of a max of \d+ players online:.+/;

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
      queryPlayerCountByConsole();
      //minecraftProtocol.default.ping(pingOptions, (error, result) => {
      //  if (error)
      //    queryPlayerCountByConsole();
      //  else if ((result as NewPingResult).players)
      //    updateOnline((result as NewPingResult).players.online);
      //  else
      //    updateOnline((result as OldPingResult).playerCount);
      //}); 
    };

    const interval = setInterval(
      !serverProperties.enableStatus || serverProperties.hideOnlinePlayers
        ? queryPlayerCountByConsole
        : queryPlayerCountByPing
      , 10000);

    serverInstance.on("close", () => {
      clearInterval(interval);
      process.stdin.removeAllListeners();
      resolve();
    });
  });
}