import { join } from "path";
import { exit } from "process";
import fetch from "node-fetch";
import { createWriteStream, existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";

import * as paths from "./paths.js";

import { BuildsResponse, VersionsResponse } from "../typings/paperApi.js";

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

function getInstalledBinaries(): string {
  try {
    return readFileSync(paths.binariesFile).toString();
  } catch (_) {
    return null;
  }
}

async function getPaperVersions() {
  try {
    const response = await (await fetch("https://api.papermc.io/v2/projects/paper")).json() as VersionsResponse;
    return response.versions;
  } catch (error) {
    return null;
  }
}

async function getPaperBuilds(version: string, experimental: boolean) {
  try {
    const response = await (await fetch(`https://api.papermc.io/v2/projects/paper/versions/${version}/builds`)).json() as BuildsResponse;
    return response.builds.filter((x) => x.channel == "default" || experimental);
  } catch (error) {
    return null;
  }
}

async function findMatchingLatestBuild(experimental: boolean) {

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

export const clearBinariesData = () => {
  unlinkSync(paths.versionFile);
  unlinkSync(paths.buildFile);
  unlinkSync(paths.binariesFile);
};

export async function installServer(): Promise<[string, string]> {
  // Check Version
  let requestedVersion = process.env.VERSION || "latest";
  const wantLatest = requestedVersion === "latest";
  const currentVersion = getInstalledVersion();
  const availableVersions = await getPaperVersions();
  let versionMatches = requestedVersion == currentVersion;

  const currentBinaries = getInstalledBinaries();
  const isInstalled = currentBinaries && existsSync(join(paths.minecraft, currentBinaries));
  
  if (!availableVersions) {
    if (versionMatches && isInstalled) return [ currentBinaries, requestedVersion ];
    console.error("Could not contact PaperMC website.");
    exit(1);
  }

  const currentBuild = getInstalledBuild();
  let availableBuilds;

  while (true) {
    if (wantLatest) {
      requestedVersion = availableVersions.pop()
      versionMatches = requestedVersion == currentVersion;
    } else if (!availableVersions.includes(requestedVersion)) {
      console.error(`There doesn't exist a PaperMC server for version "${requestedVersion}".`);
      exit(1);
    }

    // Check Build
    availableBuilds = await getPaperBuilds(requestedVersion, process.env.CHANNEL == "experimental");

    if (!availableBuilds) {
      if (versionMatches && isInstalled) return [ currentBinaries, requestedVersion ];
      console.error("Could not contact PaperMC website.");
      exit(1);
    }

    if (availableBuilds.length === 0) {
      console.error(`There are no builds for version ${requestedVersion} on channel ${process.env.CHANNEL || "default"} yet.`);
      if (wantLatest) {
        continue; // In case only experimental builds are available for the latest version, but default channel is selected, go back one version.
      } else {
        exit(1);
      }
    }

    break;
  }

  const latestBuild = Math.max(...(availableBuilds.map((x) => x.build)));

  if (versionMatches && isInstalled) {
    if (currentBuild >= latestBuild) {
      console.log("Latest build already installed.");
      return [ currentBinaries, requestedVersion ];
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
  writeFileSync(paths.binariesFile, fileName);

  return [ fileName, requestedVersion ];
}
