"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decode_1 = require("../utils/decode");
const chai_1 = require("chai");
const src_1 = require("../src");
const tools_1 = require("../utils/tools");
const b32 = 4294967296n;
describe("Testing ElGamal Scheme on EC points directly", () => {
    it("Check compliance of orignal and decrypted message as points", () => {
        const keypair = (0, src_1.genKeypair)();
        const encryption = (0, src_1.encrypt)(keypair.pubKey);
        const decrypted_message = (0, src_1.decrypt)(keypair.privKey, encryption.ephemeral_key, encryption.encrypted_message);
        (0, chai_1.expect)(encryption.message.toAffine(), "Decrypted message is different!").deep.equal(decrypted_message.toAffine());
    });
    it("Check unhappy compliance of orignal and decrypted message as points", () => {
        const keypair = (0, src_1.genKeypair)();
        let encryption = (0, src_1.encrypt)(keypair.pubKey);
        // we just need to modify any of the inputs
        const { randomized_ephemeralKey } = (0, src_1.rerandomize)(keypair.pubKey, encryption.ephemeral_key, encryption.encrypted_message);
        const decrypted_message = (0, src_1.decrypt)(keypair.privKey, randomized_ephemeralKey, encryption.encrypted_message);
        (0, chai_1.expect)(encryption.message.toAffine(), "Somehting went wrong!").to.not.deep.equal(decrypted_message.toAffine());
    });
    it("Check LOOPED compliance of orignal and decrypted message as points", () => {
        for (let i = 0; i < 100; i++) {
            let keypair = (0, src_1.genKeypair)();
            let encryption = (0, src_1.encrypt)(keypair.pubKey);
            let decrypted_message = (0, src_1.decrypt)(keypair.privKey, encryption.ephemeral_key, encryption.encrypted_message);
            (0, chai_1.expect)(encryption.message.toAffine(), "Decrypted message is different!").to.deep.equal(decrypted_message.toAffine());
        }
    });
    it("Check homomorphic properties of the Elgamal Scheme", () => {
        const keypair = (0, src_1.genKeypair)();
        const encryption1 = (0, src_1.encrypt)(keypair.pubKey);
        const encryption2 = (0, src_1.encrypt)(keypair.pubKey);
        // We want to prove that message3 is equal to decrypted(encryptedMessage3)
        const message3 = encryption1.message.add(encryption2.message);
        const encrypted_message3 = encryption1.encrypted_message.add(encryption2.encrypted_message);
        const ephemeral_key3 = encryption1.ephemeral_key.add(encryption2.ephemeral_key);
        const decrypted_message3 = (0, src_1.decrypt)(keypair.privKey, ephemeral_key3, encrypted_message3);
        (0, chai_1.expect)(decrypted_message3.toAffine(), "Invalid linear homomorphism!").to.deep.equal(message3.toAffine());
    });
    it("Check unhappy homomorphic properties for wrong inputs", () => {
        const keypair = (0, src_1.genKeypair)();
        const encryption1 = (0, src_1.encrypt)(keypair.pubKey);
        const encryption2 = (0, src_1.encrypt)(keypair.pubKey);
        const message3 = encryption1.message.add(encryption2.message);
        const encrypted_message3 = encryption1.encrypted_message.add(encryption2.encrypted_message);
        // we only modifiy ephemeral_key3 in this example
        const ephemeral_key3 = encryption1.ephemeral_key.add(src_1.babyJub.BASE);
        const decrypted_message3 = (0, src_1.decrypt)(keypair.privKey, ephemeral_key3, encrypted_message3);
        (0, chai_1.expect)(decrypted_message3.toAffine(), "Invalid linear homomorphism!").to.not.deep.equal(message3.toAffine());
    });
});
describe("Testing Encoding/Decoding for ElGamal Scheme", async () => {
    it("Check encoding a plain text bigger than 32 bits returns error", () => {
        const plaintext = 4294967297n;
        let expected = Error;
        const exercise = () => (0, decode_1.encode)(plaintext);
        chai_1.assert.throws(exercise, expected);
    });
    it("Check encoded value is a valid BabyJub point", () => {
        const plaintext = (0, tools_1.pruneTo32Bits)((0, src_1.genRandomSalt)());
        const encoded = (0, decode_1.encode)(plaintext);
        encoded.assertValidity();
    });
    it("Check compliance of orignal and decoded message as 32-bit numbers", async () => {
        const plaintext = (0, tools_1.pruneTo32Bits)((0, src_1.genRandomSalt)());
        const encoded = (0, decode_1.encode)(plaintext);
        const decoded = (0, decode_1.decode)(encoded, 19);
        (0, chai_1.assert)(plaintext === decoded, "Decoded number is different!");
    });
    it.skip("Check unhappy compliance of orignal and decoded message for a different random input", async () => {
        const plaintext = (0, tools_1.pruneTo32Bits)((0, src_1.genRandomSalt)());
        const encoded = (0, decode_1.encode)(plaintext);
        const rand = (0, src_1.genRandomPoint)();
        const decoded = (0, decode_1.decode)(encoded, 19);
        const decoded_rand = (0, decode_1.decode)(rand, 19);
        (0, chai_1.assert)(plaintext === decoded && decoded !== decoded_rand, "Something went different!");
    });
    it("Check LOOPED compliance of orignal and decoded message as 32-bit numbers", async () => {
        for (let i = 0; i < 15; i++) {
            let plaintext = (0, tools_1.pruneTo32Bits)((0, src_1.genRandomSalt)());
            let encoded = (0, decode_1.encode)(plaintext);
            let decoded = (0, decode_1.decode)(encoded, 19);
            (0, chai_1.assert)(plaintext === decoded, "Decoded number is different!");
        }
    });
    it("Check decoding preserves Elgamal linear homomorphism", async () => {
        // The input should be a 64-bit number
        const plaintext = (0, tools_1.pruneTo64Bits)((0, src_1.genRandomSalt)());
        // the initial input is split into two 32-bit numbers for faster decoding
        const [xlo, xhi] = (0, decode_1.split64)(plaintext);
        const M1 = (0, decode_1.encode)(xlo);
        const M2 = (0, decode_1.encode)(xhi);
        const keypair = (0, src_1.genKeypair)();
        const encryption1 = (0, src_1.encrypt_s)(M1, keypair.pubKey);
        const encryption2 = (0, src_1.encrypt_s)(M2, keypair.pubKey);
        const decrypted_message1 = (0, src_1.decrypt)(keypair.privKey, encryption1.ephemeral_key, encryption1.encrypted_message);
        const decrypted_message2 = (0, src_1.decrypt)(keypair.privKey, encryption2.ephemeral_key, encryption2.encrypted_message);
        const dlo = (0, decode_1.decode)(decrypted_message1, 19);
        const dhi = (0, decode_1.decode)(decrypted_message2, 19);
        const decoded_input = dlo + b32 * dhi;
        (0, chai_1.assert)(decoded_input === plaintext, "decoding led to different result!");
    });
    it("Check unhappy decoding breaks Elgamal linear homomorphism", async () => {
        // The input should be a 64-bit number
        const input = (0, tools_1.pruneTo64Bits)((0, src_1.genRandomSalt)());
        // the initial input is split into two 32-bit numbers for faster decoding
        const [xlo, xhi] = (0, decode_1.split64)(input);
        // we swap xlo and xhi to mess with the decoding
        const M1 = (0, decode_1.encode)(xhi);
        const M2 = (0, decode_1.encode)(xlo);
        const keypair = (0, src_1.genKeypair)();
        const encryption1 = (0, src_1.encrypt_s)(M1, keypair.pubKey);
        const encryption2 = (0, src_1.encrypt_s)(M2, keypair.pubKey);
        const decrypted_message1 = (0, src_1.decrypt)(keypair.privKey, encryption1.ephemeral_key, encryption1.encrypted_message);
        const decrypted_message2 = (0, src_1.decrypt)(keypair.privKey, encryption2.ephemeral_key, encryption2.encrypted_message);
        const dlo = (0, decode_1.decode)(decrypted_message1, 19);
        const dhi = (0, decode_1.decode)(decrypted_message2, 19);
        const decoded_input = dlo + b32 * dhi;
        (0, chai_1.assert)(decoded_input !== input, "decoding led to different result!");
    });
    it("Check LOOPED decoding preserves Elgamal linear homomorphism", async () => {
        for (let i = 0; i < 10; i++) {
            // The input should be a 64-bit number
            const input = (0, tools_1.pruneTo64Bits)((0, src_1.genRandomSalt)());
            // the initial input is split into two 32-bit numbers for faster decoding
            let [xlo, xhi] = (0, decode_1.split64)(input);
            let M1 = (0, decode_1.encode)(xlo);
            let M2 = (0, decode_1.encode)(xhi);
            let keypair = (0, src_1.genKeypair)();
            const encryption1 = (0, src_1.encrypt_s)(M1, keypair.pubKey);
            const encryption2 = (0, src_1.encrypt_s)(M2, keypair.pubKey);
            const decrypted_message1 = (0, src_1.decrypt)(keypair.privKey, encryption1.ephemeral_key, encryption1.encrypted_message);
            const decrypted_message2 = (0, src_1.decrypt)(keypair.privKey, encryption2.ephemeral_key, encryption2.encrypted_message);
            const dlo = (0, decode_1.decode)(decrypted_message1, 19);
            const dhi = (0, decode_1.decode)(decrypted_message2, 19);
            const decoded_input = dlo + b32 * dhi;
            (0, chai_1.assert)(decoded_input === input, "decoding led to different result!");
        }
    });
});
