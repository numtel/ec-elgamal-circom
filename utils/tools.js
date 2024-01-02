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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pruneTo32Bits = exports.pruneTo64Bits = exports.coordinatesToExtPoint = exports.formatPrivKeyForBabyJub = exports.toBigIntArray = exports.toStringArray = exports.unstringifyBigInts = exports.stringifyBigInts = exports.getSignalByName = exports.bigInt2Buffer = exports.prv2pub = exports.pruneBuffer = void 0;
const blake_hash_1 = __importDefault(require("blake-hash"));
const ff = __importStar(require("ffjavascript"));
const ffjavascript_1 = require("ffjavascript");
const babyjub_noble_1 = require("./babyjub-noble");
const stringifyBigInts = ff.utils.stringifyBigInts;
exports.stringifyBigInts = stringifyBigInts;
const unstringifyBigInts = ff.utils.unstringifyBigInts;
exports.unstringifyBigInts = unstringifyBigInts;
const babyJub = babyjub_noble_1.babyJub.ExtendedPoint;
// Taken from https://github.com/iden3/circomlibjs/blob/main/src/eddsa.js
function pruneBuffer(buff) {
    buff[0] = buff[0] & 0xf8;
    buff[31] = buff[31] & 0x7f;
    buff[31] = buff[31] | 0x40;
    return buff;
}
exports.pruneBuffer = pruneBuffer;
// Taken from https://github.com/iden3/circomlibjs/blob/main/src/eddsa.js
function prv2pub(prv) {
    const sBuff = pruneBuffer((0, blake_hash_1.default)("blake512").update(Buffer.from(prv)).digest());
    let s = ffjavascript_1.Scalar.fromRprLE(sBuff, 0, 32);
    const A = babyJub.BASE.multiply(BigInt(ffjavascript_1.Scalar.shr(s, 3)));
    return A;
}
exports.prv2pub = prv2pub;
/**
 * An internal function which formats a random private key to be compatible
 * with the BabyJub curve. This is the format which should be passed into the
 * PubKey and other circuits.
 */
function formatPrivKeyForBabyJub(privKey) {
    const sBuff = pruneBuffer((0, blake_hash_1.default)("blake512").update(bigInt2Buffer(privKey)).digest().slice(0, 32));
    const s = ff.utils.leBuff2int(sBuff);
    return ff.Scalar.shr(s, 3);
}
exports.formatPrivKeyForBabyJub = formatPrivKeyForBabyJub;
/**
 * Convert a BigInt to a Buffer
 */
const bigInt2Buffer = (i) => {
    return Buffer.from(i.toString(16), "hex");
};
exports.bigInt2Buffer = bigInt2Buffer;
/**
 * Convert an EC extended point into an array of two bigints
 */
function toBigIntArray(point) {
    const point_affine = point.toAffine();
    const x = point_affine.x;
    const y = point_affine.y;
    return [x, y];
}
exports.toBigIntArray = toBigIntArray;
/**
 * Convert an EC extended point into an array of two strings
 */
function toStringArray(point) {
    const point_affine = point.toAffine();
    const x = point_affine.x.toString();
    const y = point_affine.y.toString();
    return [x, y];
}
exports.toStringArray = toStringArray;
/**
 * Convert two strings x and y into an EC extended point
 */
function coordinatesToExtPoint(x, y) {
    const x_bigint = BigInt(x);
    const y_bigint = BigInt(y);
    const affine_point = { x: x_bigint, y: y_bigint };
    return babyJub.fromAffine(affine_point);
}
exports.coordinatesToExtPoint = coordinatesToExtPoint;
function pruneTo64Bits(originalValue) {
    return originalValue & BigInt("0xFFFFFFFFFFFFFFFF");
}
exports.pruneTo64Bits = pruneTo64Bits;
// Prune the 253-bit BigInt to 32 bits
function pruneTo32Bits(bigInt253Bit) {
    // Create a mask for 32 bits (all bits set to 1)
    const mask32Bit = (1n << 32n) - 1n;
    // Prune to 32 bits using the mask
    const pruned32BitBigInt = bigInt253Bit & mask32Bit;
    return pruned32BitBigInt;
}
exports.pruneTo32Bits = pruneTo32Bits;
/**
 * - Returns a signal value similar to the "callGetSignalByName" function from the "circom-helper" package.
 * - This function depends on the "circom_tester" package.
 *
 * Example usage:
 *
 * ```typescript
 * const wasm_tester = require('circom_tester').wasm;
 *
 * /// the circuit is loaded only once and it is available for use across multiple test cases.
 * const circuit = await wasm_tester(path.resolve("./circuit/path"));
 * const witness = await circuit.calculateWitness(inputsObject);
 * await circuit.checkConstraints(witness);
 * await circuit.loadSymbols();
 *
 * /// You can check signal names by printing "circuit.symbols".
 * /// You will mostly need circuit inputs and outputs.
 * const singalName = 'main.out'
 * const signalValue = getSignalByName(circuit, witness, SignalName)
 * ```
 */
const getSignalByName = (circuit, witness, signalName) => {
    return witness[circuit.symbols[signalName].varIdx].toString();
};
exports.getSignalByName = getSignalByName;
