import { join } from "path";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import { minecraft } from "./paths.js";

import { Environmental } from "../typings/config.js";
import { StartupError } from "../typings/server.js";

const doneRegex = /^\[[^\]]+\]: Done \([^)]+\)! For help, type "help"\n$/;

export async function runServer(config: Environmental, file: string): Promise<ChildProcessWithoutNullStreams> {
  const serverInstance = spawn(
    "java",
    [
      `-Xmx${config.xmx}`,
      `-Xms${config.xms}`,
      "-jar",
      join(minecraft, file),
      "nogui",
    ],
    {
      cwd: minecraft,
    }
  );

  serverInstance.stdout.on("data", (message: Buffer) => process.stdout.write(message.toString()));
  serverInstance.stderr.on("data", (message: Buffer) => process.stderr.write(message.toString()));

  return new Promise((resolve, reject) => {
    serverInstance.stdout.on("data", (message: Buffer) => {
      if (doneRegex.test(message.toString())) resolve(serverInstance);
    });
    serverInstance.on("close", () => {
      reject(StartupError.Other);
    });
  });
}