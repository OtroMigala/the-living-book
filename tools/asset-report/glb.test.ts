import { describe, expect, it } from 'vitest';
import {
  imageSize,
  localMatrix,
  parseGlb,
  report,
  textureGpuBytes,
  transformPoint,
} from './glb.ts';

/** Builds a GLB in memory: header, JSON chunk (padded with spaces), BIN chunk (padded with 0). */
function makeGlb(json: object, bin: Uint8Array): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(text.length / 4) * 4;
  const binLength = Math.ceil(bin.length / 4) * 4;
  const total = 12 + 8 + jsonLength + 8 + binLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + jsonLength);
  const binStart = 20 + jsonLength;
  view.setUint32(binStart, binLength, true);
  view.setUint32(binStart + 4, 0x004e4942, true);
  out.set(bin, binStart + 8);
  return out;
}

/** The first 24 bytes of a PNG: signature, then the IHDR chunk's length, type, width and height. */
function pngHeader(width: number, height: number): Uint8Array {
  const out = new Uint8Array(24);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(out.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return out;
}

/** A JPEG start: SOI, a 4-byte APP0 segment, then SOF0 with height and width. */
function jpegHeader(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0,
    0,
    0,
    0,
  ]);
}

describe('imageSize', () => {
  it('reads PNG and JPEG headers', () => {
    expect(imageSize(pngHeader(4096, 2048))).toEqual({ width: 4096, height: 2048 });
    expect(imageSize(jpegHeader(1024, 512))).toEqual({ width: 1024, height: 512 });
  });

  it('returns null for anything else', () => {
    expect(imageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});

describe('textureGpuBytes', () => {
  it('is 4 bytes per pixel, plus a third for the mipmap chain', () => {
    expect(textureGpuBytes(1024, 1024, false)).toBe(4 * 1024 * 1024);
    expect(textureGpuBytes(1024, 1024)).toBe(Math.round((4 * 1024 * 1024 * 4) / 3));
  });
});

describe('localMatrix', () => {
  it('rotates +90° about Y: +X goes to −Z (right-handed, counter-clockwise seen from +Y)', () => {
    const s = Math.SQRT1_2; // sin 45° = cos 45°: the half angle of a 90° rotation
    const p = transformPoint(localMatrix({ rotation: [0, s, 0, s] }), [1, 0, 0]);
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(0);
    expect(p[2]).toBeCloseTo(-1);
  });
});

describe('parseGlb', () => {
  it('rejects a file that is not a GLB', () => {
    expect(() => parseGlb(new Uint8Array(24))).toThrow('bad magic');
  });
});

describe('report', () => {
  const png = pngHeader(64, 32);
  const jpeg = jpegHeader(16, 8);
  const bin = new Uint8Array(png.length + jpeg.length);
  bin.set(png, 0);
  bin.set(jpeg, png.length);
  const json = {
    asset: { version: '2.0', generator: 'test' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: 'Root', translation: [10, 0, 0], scale: [2, 2, 2], children: [1] },
      { name: 'Page', mesh: 0 },
    ],
    meshes: [
      { name: 'PageMesh', primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] },
    ],
    materials: [
      {
        name: 'Paper',
        pbrMetallicRoughness: { baseColorTexture: { index: 0 } },
        normalTexture: { index: 1 },
      },
    ],
    textures: [{ source: 0 }, { source: 1 }],
    images: [
      { mimeType: 'image/png', bufferView: 0 },
      { mimeType: 'image/jpeg', bufferView: 1 },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: png.length },
      { buffer: 0, byteOffset: png.length, byteLength: jpeg.length },
    ],
    accessors: [
      { componentType: 5126, count: 4, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 1] },
      { componentType: 5123, count: 6, type: 'SCALAR' },
    ],
  };
  const r = report(parseGlb(makeGlb(json, bin)));

  it('counts draw calls, vertices, triangles and geometry bytes', () => {
    expect(r.drawCalls).toBe(1);
    expect(r.vertices).toBe(4);
    expect(r.triangles).toBe(2);
    expect(r.geometryGpuBytes).toBe(4 * 3 * 4 + 6 * 2); // float32 VEC3 positions + uint16 indices
  });

  it('applies parent transforms to the bounds', () => {
    expect(r.meshNodes[0]?.path).toBe('Root / Page');
    expect(r.sceneBounds).toEqual({ min: [10, 0, 0], max: [12, 2, 2] });
  });

  it('reads image sizes from the binary chunk and lists their uses', () => {
    expect(r.images.map((i) => [i.width, i.height, i.usedAs])).toEqual([
      [64, 32, ['Paper.baseColor']],
      [16, 8, ['Paper.normal']],
    ]);
    expect(r.textureGpuBytes).toBe(textureGpuBytes(64, 32) + textureGpuBytes(16, 8));
  });
});
