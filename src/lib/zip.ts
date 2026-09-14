/**
 * Минимальный ZIP-писатель (метод STORE, без сжатия) — чтобы отдавать
 * «пак картинок» без единой внешней зависимости и без сервера.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

class Writer {
  chunks: Uint8Array[] = [];
  private length = 0;

  push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  pushUint16(value: number) {
    const out = new Uint8Array(2);
    out[0] = value & 0xff;
    out[1] = (value >>> 8) & 0xff;
    this.push(out);
  }

  pushUint32(value: number) {
    const out = new Uint8Array(4);
    out[0] = value & 0xff;
    out[1] = (value >>> 8) & 0xff;
    out[2] = (value >>> 16) & 0xff;
    out[3] = (value >>> 24) & 0xff;
    this.push(out);
  }

  toBlob(type: string): Blob {
    return new Blob(this.chunks as BlobPart[], { type });
  }

  get byteLength() {
    return this.length;
  }
}

const encode = (text: string) => new TextEncoder().encode(text);

export type ZipEntry = { name: string; blob: Blob };

export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const files: Array<{ name: Uint8Array; data: Uint8Array; crc: number; offset: number }> = [];
  const writer = new Writer();
  const chunks: Uint8Array[] = [];
  let offset = 0;

  const write = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  for (const entry of entries) {
    const name = encode(entry.name);
    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const crc = crc32(data);
    const localOffset = offset;

    write(new Uint8Array([0x50, 0x4b, 0x03, 0x04])); // local file header signature
    const header = new Writer();
    header.pushUint16(20); // version needed
    header.pushUint16(0); // flags
    header.pushUint16(0); // method: store
    header.pushUint16(0); // mod time
    header.pushUint16(0x21); // mod date (1980-01-01)
    header.pushUint32(crc);
    header.pushUint32(data.length);
    header.pushUint32(data.length);
    header.pushUint16(name.length);
    header.pushUint16(0); // extra length
    header.chunks.forEach(write);
    write(name);
    write(data);

    files.push({ name, data, crc, offset: localOffset });
  }

  const centralStart = offset;
  for (const file of files) {
    write(new Uint8Array([0x50, 0x4b, 0x01, 0x02])); // central directory signature
    const central = new Writer();
    central.pushUint16(20); // version made by
    central.pushUint16(20); // version needed
    central.pushUint16(0); // flags
    central.pushUint16(0); // method
    central.pushUint16(0); // mod time
    central.pushUint16(0x21); // mod date
    central.pushUint32(file.crc);
    central.pushUint32(file.data.length);
    central.pushUint32(file.data.length);
    central.pushUint16(file.name.length);
    central.pushUint16(0); // extra
    central.pushUint16(0); // comment
    central.pushUint16(0); // disk start
    central.pushUint16(0); // internal attrs
    central.pushUint32(0); // external attrs
    central.pushUint32(file.offset);
    central.chunks.forEach(write);
    write(file.name);
  }
  const centralSize = offset - centralStart;

  write(new Uint8Array([0x50, 0x4b, 0x05, 0x06])); // EOCD
  const eocd = new Writer();
  eocd.pushUint16(0);
  eocd.pushUint16(0);
  eocd.pushUint16(files.length);
  eocd.pushUint16(files.length);
  eocd.pushUint32(centralSize);
  eocd.pushUint32(centralStart);
  eocd.pushUint16(0);
  eocd.chunks.forEach(write);

  return new Blob(chunks as BlobPart[], { type: "application/zip" });
}
