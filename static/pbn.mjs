/**
 * Polytopia Board Notation: encode and decode a market-calculator map.
 *
 * Format (semicolons separate records; commas separate fields):
 *   rows,cols;
 *   <rows of tile codes>;
 *   cityCount;
 *   captureAndGrowthOrder;
 *
 * Tile codes are ABC = base, resource, improvement:
 *   base 0 unplacable, 1 city, 2 village, 3 field, 4 water, 5 mountain
 *   resource 0 none, 1 crop
 *   improvement 0 none, 1 farm, 2 windmill, 3 market
 *
 * Cities are numbered in row-major order among city tiles. Each city id appears
 * once (capture / 3x3) or twice (then border growth / 5x5) in the action order.
 */

export const UI_TILE = Object.freeze({
  FIELD: 0,
  VILLAGE: 1,
  MOUNTAIN: 2,
  CROP: 3,
  WINDMILL: 4,
  MARKET: 5,
  FARM: 6,
  WATER: 7,
  SMALL_CITY: 8,
  BIG_CITY: 9,
});

const CITY_TILES = new Set([UI_TILE.SMALL_CITY, UI_TILE.BIG_CITY]);

/**
 * @param {number} tile - A UI tile code from the editor.
 * @returns {number} Three-digit PBN code.
 */
export function uiTileToPbnCode(tile) {
  switch (tile) {
    case UI_TILE.VILLAGE: return 200;
    case UI_TILE.MOUNTAIN: return 500;
    case UI_TILE.CROP: return 310;
    case UI_TILE.WINDMILL: return 302;
    case UI_TILE.MARKET: return 303;
    case UI_TILE.FARM: return 311;
    case UI_TILE.WATER: return 400;
    case UI_TILE.SMALL_CITY:
    case UI_TILE.BIG_CITY: return 100;
    default: return 300;
  }
}

/**
 * @param {number} code - Integer tile code; digits are base, resource, improvement.
 * @returns {{base: number, resource: number, improvement: number}}
 */
export function pbnCodeToParts(code) {
  const n = Number(code);
  if (!Number.isFinite(n) || n < 0 || n > 999) {
    throw new Error(`Invalid tile code: ${code}`);
  }
  const int = Math.trunc(n);
  return {
    base: Math.floor(int / 100),
    resource: Math.floor(int / 10) % 10,
    improvement: int % 10,
  };
}

/**
 * @param {{base: number, resource: number, improvement: number}} parts
 * @param {number} [cityTile=8] - SMALL_CITY or BIG_CITY when base is city.
 * @returns {number} UI tile code.
 */
export function pbnPartsToUiTile(parts, cityTile = UI_TILE.SMALL_CITY) {
  if (parts.base === 1) return cityTile;
  if (parts.base === 2) return UI_TILE.VILLAGE;
  if (parts.base === 4) return UI_TILE.WATER;
  if (parts.base === 0 || parts.base === 5) return UI_TILE.MOUNTAIN;
  if (parts.improvement === 3) return UI_TILE.MARKET;
  if (parts.improvement === 2) return UI_TILE.WINDMILL;
  if (parts.improvement === 1) return UI_TILE.FARM;
  if (parts.resource === 1) return UI_TILE.CROP;
  return UI_TILE.FIELD;
}

/**
 * @param {number[][]} grid
 * @returns {{r: number, c: number, tile: number}[]}
 */
export function collectCitiesRowMajor(grid) {
  const cities = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (CITY_TILES.has(grid[r][c])) cities.push({ r, c, tile: grid[r][c] });
    }
  }
  return cities;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('PBN is empty.');
  const parts = trimmed.includes(';')
    ? trimmed.split(';')
    : trimmed.split(/\r?\n/);
  return parts.map((s) => s.replace(/\s+/g, '')).filter(Boolean);
}

/**
 * @param {string} field
 * @returns {number[]}
 */
function parseIntList(field) {
  if (!field) return [];
  return field.split(',').filter(Boolean).map((n) => {
    const v = Number(n);
    if (!Number.isInteger(v)) throw new Error(`Expected integers, got "${field}"`);
    return v;
  });
}

/**
 * Encode an editor map as PBN. City ids in `actionOrder` are remapped to
 * row-major city numbering. Missing captures/growths are appended so every
 * city appears once, or twice if its tile is a big city.
 *
 * @param {number[][]} grid
 * @param {{r: number, c: number}[]} cityCenters
 * @param {number[]} actionOrder
 * @returns {string}
 */
export function encodePbn(grid, cityCenters, actionOrder) {
  if (!grid?.length || !grid[0]?.length) throw new Error('Grid is empty.');
  const rows = grid.length;
  const cols = grid[0].length;
  if (grid.some((row) => row.length !== cols)) {
    throw new Error('Grid rows are not the same length.');
  }

  const cities = collectCitiesRowMajor(grid);
  const editorToPbn = new Map();
  cityCenters.forEach((cc, editorIdx) => {
    const pbnIdx = cities.findIndex((city) => city.r === cc.r && city.c === cc.c);
    if (pbnIdx >= 0) editorToPbn.set(editorIdx, pbnIdx);
  });

  const remapped = [];
  const seenCount = new Map();
  for (const editorId of actionOrder) {
    const pbnId = editorToPbn.get(editorId);
    if (pbnId === undefined) continue;
    const count = seenCount.get(pbnId) ?? 0;
    if (count >= 2) continue;
    remapped.push(pbnId);
    seenCount.set(pbnId, count + 1);
  }
  cities.forEach((city, pbnId) => {
    const needed = city.tile === UI_TILE.BIG_CITY ? 2 : 1;
    let count = seenCount.get(pbnId) ?? 0;
    while (count < needed) {
      remapped.push(pbnId);
      count += 1;
      seenCount.set(pbnId, count);
    }
  });

  const lines = [
    `${rows},${cols}`,
    ...grid.map((row) => row.map(uiTileToPbnCode).join(',')),
    String(cities.length),
    remapped.join(','),
  ];
  return `${lines.join(';\n')};`;
}

/**
 * Decode PBN into editor tile codes, row-major city centers, and action order.
 *
 * @param {string} text
 * @returns {{grid: number[][], cityCenters: {r: number, c: number}[], actionOrder: number[]}}
 */
export function decodePbn(text) {
  const tokens = tokenize(text);
  if (tokens.length < 2) throw new Error('PBN is missing the board size or tiles.');

  const size = parseIntList(tokens[0]);
  if (size.length !== 2 || size[0] < 1 || size[1] < 1) {
    throw new Error('First record must be rows,cols.');
  }
  const [rows, cols] = size;
  if (tokens.length < 1 + rows) {
    throw new Error(`Expected ${rows} board rows after the size.`);
  }

  const rawGrid = [];
  for (let r = 0; r < rows; r++) {
    const codes = parseIntList(tokens[1 + r]);
    if (codes.length !== cols) {
      throw new Error(`Row ${r + 1} has ${codes.length} tiles, expected ${cols}.`);
    }
    rawGrid.push(codes.map(pbnCodeToParts));
  }

  const cityCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rawGrid[r][c].base === 1) cityCells.push({ r, c });
    }
  }

  const rest = tokens.slice(1 + rows);
  if (rest.length === 0) throw new Error('PBN is missing the city count.');
  const cityCountParsed = parseIntList(rest[0]);
  if (cityCountParsed.length !== 1 || cityCountParsed[0] < 0) {
    throw new Error('City count must be a single non-negative integer.');
  }
  if (cityCountParsed[0] !== cityCells.length) {
    throw new Error(`City count is ${cityCountParsed[0]} but the board has ${cityCells.length} city tiles.`);
  }

  const actionOrder = rest.length > 1 ? parseIntList(rest[1]) : [];
  const seen = new Map();
  for (const id of actionOrder) {
    if (!Number.isInteger(id) || id < 0 || id >= cityCells.length) {
      throw new Error(`Action order has invalid city id ${id}.`);
    }
    const count = (seen.get(id) ?? 0) + 1;
    if (count > 2) throw new Error(`City ${id} appears more than twice in the action order.`);
    seen.set(id, count);
  }
  for (let id = 0; id < cityCells.length; id++) {
    if ((seen.get(id) ?? 0) === 0) {
      throw new Error(`City ${id} is on the board but missing from the action order.`);
    }
  }

  const cityTileOf = cityCells.map((_, id) => (
    (seen.get(id) ?? 1) >= 2 ? UI_TILE.BIG_CITY : UI_TILE.SMALL_CITY
  ));
  const cityIndexAt = new Map(cityCells.map((cell, id) => [`${cell.r},${cell.c}`, id]));

  const grid = rawGrid.map((row, r) => row.map((parts, c) => {
    const cityId = cityIndexAt.get(`${r},${c}`);
    const cityTile = cityId === undefined ? UI_TILE.SMALL_CITY : cityTileOf[cityId];
    return pbnPartsToUiTile(parts, cityTile);
  }));

  return {
    grid,
    cityCenters: cityCells.map((cell) => ({ r: cell.r, c: cell.c })),
    actionOrder,
  };
}
