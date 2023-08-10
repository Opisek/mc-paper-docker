import { createWriteStream, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import * as paths from "../paths.js";
import { exit } from "process";
import fetch from "node-fetch";
import { join } from "path";

type PaperApiVersionsResponse = {
  versions: string[]
}
type PaperApiBuildsResponse = {
  builds: {
    build: number,
    channel: string,
    downloads: {
      application: {
        name: string
      }
    }
  }[]
}

function getInstalledVersion(): string {
  try {
    return readFileSync(paths.versionFile).toString();
  } catch (_) {
    return null;
  }
}

function getInstalledBuild(): number {
  try {
    return Number.parseInt(readFileSync(paths.buildFile).toString());
  } catch (_) {
    return null;
  }
}

async function getPaperVersions() {
  try {
    const response = await (await fetch("https://api.papermc.io/v2/projects/paper")).json() as PaperApiVersionsResponse;
    return response.versions;
  } catch (error) {
    return null;
  }
}

async function getPaperBuilds(version: string, experimental: boolean) {
  try {
    const response = await (await fetch(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds`)).json() as PaperApiBuildsResponse;
    return response.builds.filter((x) => x.channel == "default" || experimental);
  } catch (error) {
    return null;
  }
}

function getPaperDownloadUrl(version: string, build: number, fileName: string) {
  return `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/${fileName}`;
}

async function downloadFile(url: string, fileName: string) {
  const res = await fetch(url);
  await new Promise<void>((resolve, reject) => {
    const fileStream = createWriteStream(join(paths.minecraft, fileName));
    res.body.pipe(fileStream);
    res!.body!.on("error", (err) => {
      reject(err);
    });
    fileStream.on("finish", function() {
      resolve();
    });
  });
}

export default async function installServer() {
  // Check Version
  let requestedVersion = process.env.VERSION || "latest";
  const currentVersion = getInstalledVersion();
  const availableVersions = await getPaperVersions();
  let isInstalled = requestedVersion == currentVersion;
  
  if (!availableVersions) {
    if (isInstalled) return;
    console.error("Could not contact PaperMC website.");
    exit(1);
  }

  if (requestedVersion == "latest") {
    requestedVersion = availableVersions[availableVersions.length - 1];
    isInstalled = requestedVersion == currentVersion;
  } else if (!availableVersions.includes(requestedVersion)) {
    console.error(`There doesn't exist a PaperMC server for version "${requestedVersion}".`);
    exit(1);
  }

  // Check Build
  const currentBuild = getInstalledBuild();
  const availableBuilds = await getPaperBuilds(requestedVersion, process.env.CHANNEL == "experimental");

  if (!availableBuilds) {
    if (isInstalled) return;
    console.error("Could not contact PaperMC website.");
    exit(1);
  }

  const latestBuild = Math.max(...(availableBuilds.map((x) => x.build)));

  if (isInstalled) {
    if (currentBuild >= latestBuild) {
      console.log("Latest build already installed.");
      return;
    }

    console.log("New build found.");
  }

  // Install
  console.log(`Installing ${requestedVersion} build ${latestBuild}`);

  const fileName = availableBuilds.filter((x) => x.build == latestBuild)[0].downloads.application.name;
  readdirSync(paths.minecraft).filter((x) => x.endsWith(".jar")).forEach((x) => unlinkSync(join(paths.minecraft, x)));

  const downloadUrl = getPaperDownloadUrl(requestedVersion, latestBuild, fileName);
  await downloadFile(downloadUrl, fileName);

  writeFileSync(paths.versionFile, requestedVersion);
  writeFileSync(paths.buildFile, latestBuild.toString());
}