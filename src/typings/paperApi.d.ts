export type VersionsResponse = {
  versions: string[]
}

export type BuildsResponse = {
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