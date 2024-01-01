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
const index_1 = require("../src/index");
const tools_1 = require("../utils/tools");
const snarkjs = require("snarkjs");
const path = require("path");
const wasm_tester = require('circom_tester').wasm;
const wasm_path_encrypt = "./circuits/artifacts/encrypt_test/encrypt.wasm";
const zkey_path_encrypt = "./circuits/artifacts/encrypt_test/encrypt.zkey";
const genCircuitInputs = () => {
    const keypair = (0, index_1.genKeypair)();
    const encryption = (0, index_1.encrypt)(keypair.pubKey);
    const encrypted_message = (0, tools_1.toStringArray)(encryption.encrypted_message);
    let input_encrypt = (0, tools_1.stringifyBigInts)({
        message: (0, tools_1.toBigIntArray)(encryption.message),
        nonceKey: encryption.nonce,
        publicKey: (0, tools_1.toBigIntArray)(keypair.pubKey),
    });
    return { input_encrypt, encrypted_message };
};
async function test_snarkjs() {
    const { input_encrypt, encrypted_message } = genCircuitInputs();
    const prove_encrypt = await snarkjs.groth16.fullProve(input_encrypt, wasm_path_encrypt, zkey_path_encrypt);
    const publicSignals_encrypt = prove_encrypt.publicSignals;
    const resX = (publicSignals_encrypt[2] == encrypted_message[0]);
    const resY = (publicSignals_encrypt[3] == encrypted_message[1]);
    return resX && resY;
}
async function test_circom_tester(circuit) {
    const { input_encrypt, encrypted_message } = genCircuitInputs();
    const witness = await circuit.calculateWitness(input_encrypt);
    await circuit.checkConstraints(witness);
    await circuit.loadSymbols();
    const resX = ((0, tools_1.getSignalByName)(circuit, witness, 'main.encryptedMessage[0]') == encrypted_message[0]);
    const resY = ((0, tools_1.getSignalByName)(circuit, witness, 'main.encryptedMessage[1]') == encrypted_message[1]);
    return resX && resY;
}
const { compare, run } = bench;
run(async () => {
    const circuit = await wasm_tester(path.resolve("./circuits/test_circuits/encrypt_test.circom"));
    await compare('Testing Circom Circuits', 50, {
        snarkjs: async () => await test_snarkjs(),
        circom_tester: async () => await test_circom_tester(circuit),
    });
    bench.utils.logMem(); // Log current RAM
    globalThis.curve_bn128.terminate();
    // console.log(bench.utils.getTime(), bench.utils.formatD(bench.utils.getTime())); // Get current time in nanoseconds
});
