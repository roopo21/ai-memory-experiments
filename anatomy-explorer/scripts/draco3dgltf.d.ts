declare module 'draco3dgltf' {
  const draco: {
    createEncoderModule: () => Promise<unknown>
    createDecoderModule: () => Promise<unknown>
  }
  export default draco
}
