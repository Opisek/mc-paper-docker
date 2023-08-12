import { ChildProcessWithoutNullStreams } from "child_process";
import { Configuration } from "./environmental.js";

const playerCountRegex = /\[[^\]]+\]: There are (\d+) of a max of \d+ players online:.+/;

export default function watchServer(
  config: Configuration,
  serverInstance: ChildProcessWithoutNullStreams
): Promise<void> {
  return new Promise((resolve) => {
    let lastOnline = Date.now();

    setInterval(() => {
      serverInstance.stdin.write("list\n");
    }, 10000);

    serverInstance.stdout.on("data", (message: Buffer) => {
      const playerCountMatch = message.toString().match(playerCountRegex);
      if (!playerCountMatch) return;

      const playerCount = Number.parseInt(playerCountMatch[1]);
      if (playerCount != 0) lastOnline = Date.now();
      else if ((Date.now() - lastOnline) / 1000 >= config.gracePeriod) {
        console.log("Shutting the server down due to inactivity.");
        serverInstance.stdin.write("stop\n");
      }
    });

    serverInstance.on("close", resolve);
  });
}