const RS_M: number[][] = [
  [1, 26, 16, 0, 0, 0],
  [1, 44, 28, 0, 0, 0],
  [1, 70, 44, 0, 0, 0],
  [2, 50, 32, 0, 0, 0],
  [2, 67, 43, 0, 0, 0],
  [4, 43, 27, 0, 0, 0],
  [4, 49, 31, 0, 0, 0],
  [2, 60, 38, 2, 61, 39],
  [3, 58, 36, 2, 59, 37],
  [4, 69, 43, 1, 70, 44],
];

const ALIGN: number[][] = [
  [0, 0, 0, 0, 0],
  [6, 18, 0, 0, 0],
  [6, 22, 0, 0, 0],
  [6, 26, 0, 0, 0],
  [6, 30, 0, 0, 0],
  [6, 34, 0, 0, 0],
  [6, 22, 38, 0, 0],
  [6, 24, 42, 0, 0],
  [6, 26, 46, 0, 0],
  [6, 28, 50, 0, 0],
];

const CAP = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
const DCW = [16, 28, 44, 64, 86, 108, 124, 154, 182, 216];
const TCW = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

const gfExp = new Uint8Array(512);
const gfLog = new Uint8Array(256);
let gfReady = false;

function gfInit(): void {
  let i = 1;
  for (let j = 0; j < 255; j++) {
    gfExp[j] = i;
    gfLog[i] = j;
    i <<= 1;
    if (i & 0x100) i ^= 0x11d;
  }
  for (let j = 255; j < 512; j++) gfExp[j] = gfExp[j - 255];
  gfReady = true;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return gfExp[gfLog[a] + gfLog[b]];
}

function rsGen(degree: number): Uint8Array {
  const gen = new Uint8Array(degree + 1);
  const b = new Uint8Array(64);
  let len = 1;
  gen[0] = 1;
  for (let k = 0; k < degree; k++) {
    const root = gfExp[k];
    b.fill(0);
    for (let i = 0; i < len; i++) {
      b[i] ^= gen[i];
      b[i + 1] ^= gfMul(gen[i], root);
    }
    len++;
    gen.set(b.subarray(0, len));
  }
  return gen;
}

function rsRemainder(data: Uint8Array, dataLen: number, degree: number): Uint8Array {
  const gen = rsGen(degree);
  const work = new Uint8Array(dataLen + degree);
  work.set(data.subarray(0, dataLen));
  let wlen = dataLen + degree;
  while (wlen >= degree + 1) {
    const lead = work[0];
    if (lead !== 0) {
      for (let i = 0; i <= degree; i++) work[i] ^= gfMul(gen[i], lead);
    }
    work.copyWithin(0, 1, wlen);
    wlen--;
  }
  const rem = new Uint8Array(degree);
  rem.set(work.subarray(0, wlen), degree - wlen);
  return rem;
}

export function utf8Bytes(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let cp = text.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < text.length) {
      const lo = text.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
        i++;
      }
    }
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return new Uint8Array(out);
}

function buildCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const dataCw = DCW[version - 1];
  const totalCw = TCW[version - 1];
  const countBits = version <= 9 ? 8 : 16;
  const bits: number[] = [];
  const push = (v: number, n: number) => {
    for (let q = n - 1; q >= 0; q--) bits.push((v >> q) & 1);
  };
  push(4, 4);
  push(bytes.length, countBits);
  for (let i = 0; i < bytes.length; i++) push(bytes[i], 8);
  push(0, 4);
  while (bits.length % 8 !== 0) push(0, 1);
  const cw = new Uint8Array(totalCw);
  for (let i = 0; i < bits.length / 8; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i * 8 + j];
    cw[i] = v;
  }
  let pad = 0;
  for (let i = Math.floor(bits.length / 8); i < dataCw; i++) cw[i] = pad++ % 2 === 0 ? 0xec : 0x11;

  const nb1 = RS_M[version - 1][0];
  const d1 = RS_M[version - 1][2];
  const nb2 = RS_M[version - 1][3];
  const d2 = RS_M[version - 1][5];
  const ecLen = RS_M[version - 1][1] - d1;
  const nblocks = nb1 + nb2;
  const blocksData: Uint8Array[] = [];
  const blocksEc: Uint8Array[] = [];
  let off = 0;
  for (let i = 0; i < nblocks; i++) {
    const dlen = i < nb1 ? d1 : d2;
    blocksData.push(cw.slice(off, off + dlen));
    off += dlen;
  }
  for (let i = 0; i < nblocks; i++) {
    const dlen = i < nb1 ? d1 : d2;
    blocksEc.push(rsRemainder(blocksData[i], dlen, ecLen));
  }
  const out = new Uint8Array(totalCw);
  let pos = 0;
  const maxd = Math.max(d1, d2);
  for (let i = 0; i < maxd; i++) {
    for (let j = 0; j < nblocks; j++) {
      const dlen = j < nb1 ? d1 : d2;
      if (i < dlen) out[pos++] = blocksData[j][i];
    }
  }
  for (let i = 0; i < ecLen; i++) {
    for (let j = 0; j < nblocks; j++) out[pos++] = blocksEc[j][i];
  }
  return out;
}

function maskBit(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function getBit(x: number, i: number): number {
  return (x >> i) & 1;
}

export type QrCode = { size: number; modules: Uint8Array };

export function qrEncode(text: string): QrCode | null {
  if (!gfReady) gfInit();
  const bytes = utf8Bytes(text);
  let version = 1;
  while (version <= 10 && CAP[version - 1] < bytes.length) version++;
  if (version > 10) return null;
  const cw = buildCodewords(bytes, version);
  const size = 17 + 4 * version;
  const m = new Uint8Array(size * size);
  const fn = new Uint8Array(size * size);
  const set = (row: number, col: number, v: number) => {
    m[row * size + col] = v ? 1 : 0;
    fn[row * size + col] = 1;
  };
  const drawFinder = (row: number, col: number) => {
    for (let dr = -4; dr <= 4; dr++) {
      for (let dc = -4; dc <= 4; dc++) {
        const r = row + dr;
        const c = col + dc;
        const d = Math.max(Math.abs(dr), Math.abs(dc));
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        set(r, c, d <= 1 || d === 3 ? 1 : 0);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(3, size - 4);
  drawFinder(size - 4, 3);
  for (let i = 8; i < size - 8; i++) {
    set(6, i, (i + 1) % 2);
    set(i, 6, (i + 1) % 2);
  }
  if (version >= 2) {
    const centers = ALIGN[version - 1].filter((x) => x !== 0);
    const n = centers.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        const cr = centers[i];
        const cc = centers[j];
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const d = Math.max(Math.abs(dr), Math.abs(dc));
            set(cr + dr, cc + dc, d !== 1 ? 1 : 0);
          }
        }
      }
    }
  }
  const drawVersion = () => {
    if (version < 7) return;
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(b, a, bit);
      set(a, b, bit);
    }
  };
  drawVersion();
  const drawFormat = (mask: number) => {
    const data = (0 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = ((rem << 1) ^ ((rem >> 9) * 0x537)) & 0x7ff;
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i < 6; i++) set(i, 8, getBit(bits, i));
    set(7, 8, getBit(bits, 6));
    set(8, 8, getBit(bits, 7));
    set(8, 7, getBit(bits, 8));
    for (let i = 9; i < 15; i++) set(8, 14 - i, getBit(bits, i));
    for (let i = 0; i < 8; i++) set(8, size - 1 - i, getBit(bits, i));
    for (let i = 8; i < 15; i++) set(size - 15 + i, 8, getBit(bits, i));
    set(size - 8, 8, 1);
  };
  drawFormat(0);
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    let c0 = col;
    if (c0 <= 6) c0 -= 1;
    for (;;) {
      for (let c = c0; c >= c0 - 1; c--) {
        if (!fn[row * size + c]) {
          const dark = byteIndex < cw.length ? (cw[byteIndex] >> bitIndex) & 1 : 0;
          m[row * size + c] = dark;
          bitIndex--;
          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }
      row += inc;
      if (row < 0 || row >= size) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
  const applyMask = (mask: number) => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!fn[r * size + c] && maskBit(mask, r, c)) m[r * size + c] ^= 1;
      }
    }
  };
  const penalty = (): number => {
    let pen = 0;
    let dark = 0;
    for (let i = 0; i < size * size; i++) dark += m[i];
    for (let r = 0; r < size; r++) {
      let run = 1;
      for (let c = 1; c <= size; c++) {
        if (c < size && m[r * size + c] === m[r * size + c - 1]) run++;
        else {
          if (run >= 5) pen += 3 + (run - 5);
          run = 1;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      let run = 1;
      for (let r = 1; r <= size; r++) {
        if (r < size && m[r * size + c] === m[(r - 1) * size + c]) run++;
        else {
          if (run >= 5) pen += 3 + (run - 5);
          run = 1;
        }
      }
    }
    for (let r = 0; r + 1 < size; r++) {
      for (let c = 0; c + 1 < size; c++) {
        const v = m[r * size + c];
        if (v === m[r * size + c + 1] && v === m[(r + 1) * size + c] && v === m[(r + 1) * size + c + 1]) pen += 3;
      }
    }
    const patternOk = (idx: number): boolean => {
      for (let i = 0; i < 7; i++) {
        if ((i === 1 || i === 3 || i === 5) ? m[idx + i] !== 0 : m[idx + i] === 0) return false;
      }
      return true;
    };
    for (let r = 0; r < size; r++) {
      for (let c = 0; c + 6 < size; c++) {
        if (patternOk(r * size + c)) {
          let before = true;
          let after = true;
          for (let i = 1; i <= 4; i++) {
            if (c - i >= 0 && m[r * size + c - i]) before = false;
            if (c + 6 + i < size && m[r * size + c + 6 + i]) after = false;
          }
          if (before || after) pen += 40;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      for (let r = 0; r + 6 < size; r++) {
        let ok = true;
        for (let i = 0; i < 7; i++) {
          const v = m[(r + i) * size + c];
          if ((i === 1 || i === 3 || i === 5) ? v !== 0 : v === 0) {
            ok = false;
            break;
          }
        }
        if (ok) {
          let before = true;
          let after = true;
          for (let i = 1; i <= 4; i++) {
            if (r - i >= 0 && m[(r - i) * size + c]) before = false;
            if (r + 6 + i < size && m[(r + 6 + i) * size + c]) after = false;
          }
          if (before || after) pen += 40;
        }
      }
    }
    const total = size * size;
    const percent = Math.floor((dark * 200 + total) / (2 * total));
    const k = Math.abs(percent - 50);
    pen += 10 * Math.floor(k / 5);
    return pen;
  };
  let bestMask = 0;
  let bestPen = -1;
  for (let mk = 0; mk < 8; mk++) {
    applyMask(mk);
    drawFormat(mk);
    const p = penalty();
    if (bestPen < 0 || p < bestPen) {
      bestPen = p;
      bestMask = mk;
    }
    applyMask(mk);
    drawFormat(0);
  }
  applyMask(bestMask);
  drawFormat(bestMask);
  return { size, modules: m };
}
