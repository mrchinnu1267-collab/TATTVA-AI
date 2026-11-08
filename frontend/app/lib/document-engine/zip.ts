import zlib from "zlib";

export interface ZipEntry {
  name: string;
  data: Buffer | string;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Builds a 100% compliant PKZip (ZIP) binary archive in pure Node.js
 * Compatible with OpenXML (DOCX, XLSX, PPTX), Windows Explorer, macOS Archive Utility, Android Unzip
 */
export function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const filenameBuf = Buffer.from(entry.name, "utf8");
    const uncompressedBuf = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data, "utf8");

    const compressedBuf = zlib.deflateRawSync(uncompressedBuf, { level: 6 });
    const crc = crc32(uncompressedBuf);

    // Local file header (30 bytes + filename + compressed data)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); // Local header signature 'PK\x03\x04'
    lh.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    lh.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8 filename bit 11)
    lh.writeUInt16LE(8, 8); // Compression method: 8 (Deflate)
    lh.writeUInt16LE(0x4a21, 10); // Last mod file time (approx 09:17:02)
    lh.writeUInt16LE(0x5ca8, 12); // Last mod file date (approx 2026-05-08)
    lh.writeUInt32LE(crc, 14); // CRC-32
    lh.writeUInt32LE(compressedBuf.length, 18); // Compressed size
    lh.writeUInt32LE(uncompressedBuf.length, 22); // Uncompressed size
    lh.writeUInt16LE(filenameBuf.length, 26); // Filename length
    lh.writeUInt16LE(0, 28); // Extra field length

    localParts.push(lh, filenameBuf, compressedBuf);

    // Central directory file header (46 bytes + filename)
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); // Central header signature 'PK\x01\x02'
    ch.writeUInt16LE(20, 4); // Version made by
    ch.writeUInt16LE(20, 6); // Version needed to extract
    ch.writeUInt16LE(0x0800, 8); // General purpose bit flag (UTF-8 filename)
    ch.writeUInt16LE(8, 10); // Compression method: Deflate
    ch.writeUInt16LE(0x4a21, 12); // Mod time
    ch.writeUInt16LE(0x5ca8, 14); // Mod date
    ch.writeUInt32LE(crc, 16); // CRC-32
    ch.writeUInt32LE(compressedBuf.length, 20); // Compressed size
    ch.writeUInt32LE(uncompressedBuf.length, 24); // Uncompressed size
    ch.writeUInt16LE(filenameBuf.length, 28); // Filename length
    ch.writeUInt16LE(0, 30); // Extra field length
    ch.writeUInt16LE(0, 32); // File comment length
    ch.writeUInt16LE(0, 34); // Disk number start
    ch.writeUInt16LE(0, 36); // Internal file attributes
    ch.writeUInt32LE(0x20, 38); // External file attributes (0x20 = DOS Archive flag for normal file)
    ch.writeUInt32LE(offset, 42); // Relative offset of local header

    centralParts.push(ch, filenameBuf);
    offset += lh.length + filenameBuf.length + compressedBuf.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const part of centralParts) {
    centralDirSize += part.length;
  }

  // End of central directory record (EOCD - 22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature 'PK\x05\x06'
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // ZIP comment length

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

/**
 * Extracts all files from a standard ZIP buffer (e.g. DOCX, XLSX, PPTX)
 */
export function readZip(buffer: Buffer): Map<string, Buffer> {
  const result = new Map<string, Buffer>();
  if (buffer.length < 22) return result;

  // Find End of Central Directory Record (EOCD) from the end
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) return result;

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let currentCdOffset = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (currentCdOffset + 46 > buffer.length) break;
    if (buffer.readUInt32LE(currentCdOffset) !== 0x02014b50) break;

    const compression = buffer.readUInt16LE(currentCdOffset + 10);
    const compressedSize = buffer.readUInt32LE(currentCdOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(currentCdOffset + 24);
    const nameLen = buffer.readUInt16LE(currentCdOffset + 28);
    const extraLen = buffer.readUInt16LE(currentCdOffset + 30);
    const commentLen = buffer.readUInt16LE(currentCdOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(currentCdOffset + 42);

    const filename = buffer.toString("utf8", currentCdOffset + 46, currentCdOffset + 46 + nameLen);
    currentCdOffset += 46 + nameLen + extraLen + commentLen;

    if (localHeaderOffset + 30 > buffer.length) continue;
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;

    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > buffer.length) continue;
    const rawCompressed = buffer.subarray(dataStart, dataEnd);

    let uncompressedData: Buffer;
    if (compression === 0) {
      uncompressedData = Buffer.from(rawCompressed);
    } else if (compression === 8) {
      try {
        uncompressedData = zlib.inflateRawSync(rawCompressed);
      } catch {
        continue;
      }
    } else {
      continue;
    }

    result.set(filename, uncompressedData);
  }

  return result;
}

