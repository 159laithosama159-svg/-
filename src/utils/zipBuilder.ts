/**
 * Zero-dependency standards-compliant ZIP archive builder (Store method, UTF-8 filenames).
 * Works identically in Node.js (for unit tests) and in the browser (for downloading .zip Godot projects).
 */

export interface ZipEntryInput {
  path: string;
  content: string | Uint8Array;
}

const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function sanitizeZipPath(rawPath: string): string {
  return rawPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .join('/');
}

function getDosDateTime(date = new Date()): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

/**
 * Builds a valid ZIP binary (Uint8Array) from a list of text or binary files.
 */
export function buildZipArchive(entries: ZipEntryInput[], date = new Date()): Uint8Array {
  const { dosTime, dosDate } = getDosDateTime(date);
  const prepared: Array<{
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }> = [];

  const seen = new Set<string>();
  let localSectionSize = 0;
  let centralSectionSize = 0;

  for (const entry of entries) {
    const cleanPath = sanitizeZipPath(entry.path);
    if (!cleanPath || seen.has(cleanPath)) continue;
    seen.add(cleanPath);

    const nameBytes = encodeUtf8(cleanPath);
    const dataBytes =
      typeof entry.content === 'string' ? encodeUtf8(entry.content) : entry.content;
    const crc = computeCrc32(dataBytes);

    prepared.push({
      nameBytes,
      dataBytes,
      crc,
      offset: localSectionSize,
    });

    localSectionSize += 30 + nameBytes.length + dataBytes.length;
    centralSectionSize += 46 + nameBytes.length;
  }

  const totalSize = localSectionSize + centralSectionSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let pos = 0;

  // 1. Local file headers + raw file data
  for (const item of prepared) {
    view.setUint32(pos, 0x04034b50, true); // Local file header signature
    view.setUint16(pos + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(pos + 6, 0x0800, true); // General purpose bit flag: UTF-8 filename
    view.setUint16(pos + 8, 0, true); // Compression method: 0 (STORE)
    view.setUint16(pos + 10, dosTime, true);
    view.setUint16(pos + 12, dosDate, true);
    view.setUint32(pos + 14, item.crc, true);
    view.setUint32(pos + 18, item.dataBytes.length, true); // Compressed size
    view.setUint32(pos + 22, item.dataBytes.length, true); // Uncompressed size
    view.setUint16(pos + 26, item.nameBytes.length, true);
    view.setUint16(pos + 28, 0, true); // Extra field length
    pos += 30;

    out.set(item.nameBytes, pos);
    pos += item.nameBytes.length;

    out.set(item.dataBytes, pos);
    pos += item.dataBytes.length;
  }

  const centralDirOffset = pos;

  // 2. Central directory headers
  for (const item of prepared) {
    view.setUint32(pos, 0x02014b50, true); // Central file header signature
    view.setUint16(pos + 4, 20, true); // Version made by
    view.setUint16(pos + 6, 20, true); // Version needed
    view.setUint16(pos + 8, 0x0800, true); // UTF-8 flag
    view.setUint16(pos + 10, 0, true); // Compression method: STORE
    view.setUint16(pos + 12, dosTime, true);
    view.setUint16(pos + 14, dosDate, true);
    view.setUint32(pos + 16, item.crc, true);
    view.setUint32(pos + 20, item.dataBytes.length, true);
    view.setUint32(pos + 24, item.dataBytes.length, true);
    view.setUint16(pos + 28, item.nameBytes.length, true);
    view.setUint16(pos + 30, 0, true); // Extra length
    view.setUint16(pos + 32, 0, true); // File comment length
    view.setUint16(pos + 34, 0, true); // Disk number start
    view.setUint16(pos + 36, 0, true); // Internal file attributes
    view.setUint32(pos + 38, 0, true); // External file attributes
    view.setUint32(pos + 42, item.offset, true); // Relative offset of local header
    pos += 46;

    out.set(item.nameBytes, pos);
    pos += item.nameBytes.length;
  }

  // 3. End of central directory record (EOCD)
  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 4, 0, true); // Disk number
  view.setUint16(pos + 6, 0, true); // Start disk
  view.setUint16(pos + 8, prepared.length, true); // Entries on disk
  view.setUint16(pos + 10, prepared.length, true); // Total entries
  view.setUint32(pos + 12, centralSectionSize, true); // Size of central dir
  view.setUint32(pos + 16, centralDirOffset, true); // Offset of central dir
  view.setUint16(pos + 20, 0, true); // Comment length

  return out;
}
