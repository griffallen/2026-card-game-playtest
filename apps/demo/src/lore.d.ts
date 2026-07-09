/// <reference types="vite/client" />

// Design docs are bundled into the demo as raw markdown (the repo is private; the demo is standalone).
declare module '@docs/*?raw' {
  const content: string
  export default content
}
