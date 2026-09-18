import { encodePbn, decodePbn, UI_TILE } from '../static/pbn.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function sameGrid(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const grid = [
  [UI_TILE.WATER, UI_TILE.FARM, UI_TILE.WATER, UI_TILE.WATER, UI_TILE.FIELD],
  [UI_TILE.WINDMILL, UI_TILE.SMALL_CITY, UI_TILE.CROP, UI_TILE.FIELD, UI_TILE.SMALL_CITY],
  [UI_TILE.WATER, UI_TILE.FARM, UI_TILE.WATER, UI_TILE.WATER, UI_TILE.WATER],
  [UI_TILE.FIELD, UI_TILE.FIELD, UI_TILE.FIELD, UI_TILE.MOUNTAIN, UI_TILE.FIELD],
];
const cityCenters = [{ r: 1, c: 4 }, { r: 1, c: 1 }];
const actionOrder = [0, 1];

const text = encodePbn(grid, cityCenters, actionOrder);
const decoded = decodePbn(text);

assert(decoded.cityCenters.length === 2, 'two cities');
assert(decoded.cityCenters[0].r === 1 && decoded.cityCenters[0].c === 1, 'row-major first city');
assert(decoded.cityCenters[1].r === 1 && decoded.cityCenters[1].c === 4, 'row-major second city');
assert(JSON.stringify(decoded.actionOrder) === JSON.stringify([1, 0]), `remap action order, got ${decoded.actionOrder}`);
assert(sameGrid(decoded.grid, grid), `round-trip grid\n${JSON.stringify(decoded.grid)}\n${JSON.stringify(grid)}`);

const sample = `4,5;
400,311,400,400,300;
302,100,310,300,100;
400,311,400,400,400;
300,300,300,500,300;
2;
0,1;`;
const fromSample = decodePbn(sample);
assert(fromSample.grid[0][1] === UI_TILE.FARM, '311 is farm');
assert(fromSample.grid[1][1] === UI_TILE.SMALL_CITY, 'city with one action is small');
assert(fromSample.actionOrder.join(',') === '0,1', 'sample action order');

const big = decodePbn(`3,3;
300,300,300;
300,100,300;
300,300,300;
1;
0,0;`);
assert(big.grid[1][1] === UI_TILE.BIG_CITY, 'two actions make a big city');

let failed = false;
try {
  decodePbn(`3,3;
300,300,300;
300,100,300;
300,300,300;
1;
;`);
} catch {
  failed = true;
}
assert(failed, 'city missing from action order is an error');

console.log('pbn-test: ok');
