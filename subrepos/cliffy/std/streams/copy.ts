// https://deno.land/std@0.196.0/streams/_common.ts
var DEFAULT_BUFFER_SIZE = 32 * 1024;

// https://deno.land/std@0.196.0/streams/copy.ts
async function copy(src, dst, options) {
  let n = 0;
  const bufSize = options?.bufSize ?? DEFAULT_BUFFER_SIZE;
  const b = new Uint8Array(bufSize);
  let gotEOF = false;
  while (gotEOF === false) {
    const result = await src.read(b);
    if (result === null) {
      gotEOF = true;
    } else {
      let nwritten = 0;
      while (nwritten < result) {
        nwritten += await dst.write(b.subarray(nwritten, result));
      }
      n += nwritten;
    }
  }
  return n;
}
export {
  copy
};
