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
exports.split64 = exports.encode = exports.decode = void 0;
const fs = __importStar(require("fs"));
const index_1 = require("../src/index");
const lookupTable_1 = require("./lookupTable");
function fetch_table(precomputeSize) {
    try {
        return JSON.parse(fs.readFileSync(`./lookupTables/x${precomputeSize}xlookupTable.json`));
    }
    catch (error) {
        // Generate it now if not cached
        return (0, lookupTable_1.compute)(precomputeSize);
    }
}
let lookupTable;
function decode(encoded, precomputeSize) {
    /* The first time decode is called, it will call fetch_table() and store the lookupTable variable.
       Subsequent calls to fetchTable() will use the table stored in the lookupTable variable, rather than calling functionA again.
       This will save the time from reading the lookupTable whenever decode is called again
     */
    if (!lookupTable || Object.keys(lookupTable).length != 2 ** precomputeSize) {
        lookupTable = fetch_table(precomputeSize);
    }
    const range = 32 - precomputeSize;
    const rangeBound = BigInt(2) ** BigInt(range);
    for (let xlo = BigInt(0); xlo < rangeBound; xlo++) {
        let loBase = index_1.babyJub.BASE.multiplyUnsafe(xlo);
        let key = encoded.subtract(loBase).toAffine().x.toString();
        if (lookupTable.hasOwnProperty(key)) {
            return xlo + rangeBound * BigInt("0x" + lookupTable[key]);
        }
    }
    throw new Error("Not Found!");
}
exports.decode = decode;
function encode(plaintext) {
    if (plaintext <= BigInt(2) ** BigInt(32)) {
        return index_1.babyJub.BASE.multiplyUnsafe(plaintext);
    }
    else
        throw new Error("The input should be 32-bit bigint");
}
exports.encode = encode;
// xlo and xhi merging  verification
function split64(x) {
    function padBin(x) {
        return "0".repeat(64 - x.length) + x;
    }
    const limit = BigInt(2) ** BigInt(64n);
    if (x <= limit) {
        const bin64 = padBin(x.toString(2));
        // the first 32 bits
        const xhi = "0b" + bin64.substring(0, 32);
        // the last 32 bits
        const xlo = "0b" + bin64.substring(32, 64);
        return [BigInt(xlo), BigInt(xhi)];
    }
    else
        throw new Error("The input should be 64-bit bigint");
}
exports.split64 = split64;
