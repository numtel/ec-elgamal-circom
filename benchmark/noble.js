"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bench = __importStar(require("micro-bmark"));
const src_1 = require("../src");
const babyjub_noble_1 = require("../utils/babyjub-noble");
const tools_1 = require("../utils/tools");
const buildBabyjub = require("circomlibjs").buildBabyjub;
const babyJub = babyjub_noble_1.babyJub.ExtendedPoint;
function circomlib_baby_mul(babyjub, F) {
    const randomScalar = (0, src_1.genRandomSalt)();
    const idenPoint = babyjub.mulPointEscalar(babyjub.Base8, randomScalar);
    return idenPoint.map((x) => F.toString(x));
}
function noble_baby_mul() {
    const randomScalar = (0, src_1.genRandomSalt)();
    const noblePoint = babyJub.BASE.multiply(randomScalar).toAffine();
    return noblePoint;
}
function circomlib_baby_add(babyjub, F) {
    const point1 = (0, src_1.genRandomPoint)();
    const point2 = (0, src_1.genRandomPoint)();
    const point1_e = (0, tools_1.toBigIntArray)(point1).map(x => F.e(x));
    const point2_e = (0, tools_1.toBigIntArray)(point2).map(x => F.e(x));
    const added = babyjub.addPoint(point1_e, point2_e).map(x => F.toString(x));
    return added;
}
function noble_baby_add() {
    const point1 = (0, src_1.genRandomPoint)();
    const point2 = (0, src_1.genRandomPoint)();
    const added = point1.add(point2).toAffine();
    return added;
}
const { compare, run } = bench;
run(async () => {
    const babyjub = await buildBabyjub();
    const F = babyjub.F;
    await compare('BabyJub EC Multiplication', 1000, {
        circomlibjs: () => circomlib_baby_mul(babyjub, F),
        noble: () => noble_baby_mul(),
    });
    await compare('BabyJub EC Addition', 10000, {
        circomlibjs: () => circomlib_baby_add(babyjub, F),
        noble: () => noble_baby_add(),
    });
    bench.utils.logMem(); // Log current RAM
});
