"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.babyJub = void 0;
const edwards_1 = require("@noble/curves/abstract/edwards");
const modular_1 = require("@noble/curves/abstract/modular");
const sha512_1 = require("@noble/hashes/sha512");
const utils_1 = require("@noble/hashes/utils");
const Fp = (0, modular_1.Field)(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
exports.babyJub = (0, edwards_1.twistedEdwards)({
    a: Fp.create(168700n),
    d: Fp.create(168696n),
    Fp: Fp,
    n: 21888242871839275222246405745257275088614511777268538073601725287587578984328n,
    h: 8n,
    Gx: 5299619240641551281634865583518297030282874472190772894086521144482721001553n,
    Gy: 16950150798460657717958625567821834550301663161624707787222815936182638968203n,
    hash: sha512_1.sha512,
    randomBytes: utils_1.randomBytes,
});
