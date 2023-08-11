import { spawn } from "child_process";
import { join } from "path";
import { minecraft } from "../paths.js";

export default function runServer(
  file: string,
  stdoutCallback: (chunk: string) => void,
  stderrCallback: (chunk: string) => void,
  closeCallback: (chunk: string) => void
) {
  const serverInstance = spawn(
    "java",
    [
      "-Xmx8G",
      "-Xms8G",
      "-jar",
      join(minecraft, file),
      "nogui",
    ],
    {
      "cwd": minecraft,
    }
  );

  serverInstance.stdout.on("data", stdoutCallback);
  serverInstance.stderr.on("data", stderrCallback);
  serverInstance.on("close", closeCallback);
}