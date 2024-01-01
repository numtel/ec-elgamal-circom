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
const bench = __importStar(require("micro-bmark"));
const assert_1 = __importDefault(require("assert"));
const decode_1 = require("../utils/decode");
const src_1 = require("../src");
const tools_1 = require("../utils/tools");
const { compare, run } = bench;
async function decode_noble(precomputeSize) {
    const salt = (0, tools_1.pruneTo32Bits)((0, src_1.genRandomSalt)());
    const encoded = (0, decode_1.encode)(salt);
    const decoded = (0, decode_1.decode)(encoded, precomputeSize);
    (0, assert_1.default)(salt === decoded);
    return decoded;
}
run(async () => {
    await compare('decode-noble', 25, {
        precomputed19: () => decode_noble(19),
        precomputed18: () => decode_noble(18),
        precomputed17: () => decode_noble(17),
        precomputed16: () => decode_noble(16),
    });
    bench.utils.logMem(); // Log current RAM
});
