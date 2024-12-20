import { ChildProcessWithoutNullStreams, exec } from "child_process";
import { join } from "path";
import { writeFileSync } from "fs";

import { minecraft } from "./paths.js";

import { Environmental } from "../typings/config.js";

export enum StartupError {
  Corrupted,
  Other,
}

const doneRegex = /.*(^|\n)\[[^\]]+\]: Done \([^)]+\)! For help, type "help"\r?\n.*/;

export async function runServer(config: Environmental, file: string): Promise<ChildProcessWithoutNullStreams> {
  writeFileSync(
    join(minecraft, "startup.sh"),
    `#!/bin/sh\njava -Xmx${config.xmx} -Xms${config.xms} -jar ${join(minecraft, file)} nogui`
  );

  const serverInstance = exec(
    "sh startup.sh",
    {
      cwd: minecraft,
    }
  );

  serverInstance.stdout.on("data", (message: Buffer) => process.stdout.write(message.toString()));
  serverInstance.stderr.on("data", (message: Buffer) => process.stderr.write(message.toString()));
  process.stdin.on("data", (message) => serverInstance.stdin.write(message));

  return new Promise((resolve, reject) => {
    serverInstance.stdout.on("data", function callback (message: Buffer) {
      if (!doneRegex.test(message.toString())) return;

      serverInstance.stdout.removeListener("data", callback);
      serverInstance.removeAllListeners("close");

      resolve(serverInstance);
    });
    serverInstance.on("close", () => {
      serverInstance.stdout.removeAllListeners();
      serverInstance.stderr.removeAllListeners();
      serverInstance.removeAllListeners();

      reject(StartupError.Other);
    });
  });
}