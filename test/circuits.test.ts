const snarkjs = require("snarkjs");
const fs = require("fs");
const expect = require("chai").expect;
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
// Load chai-as-promised support
chai.use(chaiAsPromised);

import { ExtPointType } from "@noble/curves/abstract/edwards";
import {
    genKeypair,
    genRandomSalt,
    encrypt,
    decrypt,
    genRandomPoint,
    babyJub,
    Keypair,
    BabyJubExtPoint,
} from "../src";
import {
    toStringArray,
    stringifyBigInts,
    toBigIntArray,
    formatPrivKeyForBabyJub,
    coordinatesToExtPoint,
} from "../utils/tools";
import { decode, encode, split64 } from "../utils/decode";

type EncryptCircuitInputs = {
    message: string[];
    nonceKey: string;
    publicKey: string[];
};

type DecryptCircuitInputs = {
    encryptedMessage: string[];
    ephemeralKey: string[];
    privateKey: string;
};

const wasm_path_encode = "./circuits/artifacts/encode_test/encode.wasm";
const zkey_path_encode = "./circuits/artifacts/encode_test/encode.zkey";

const wasm_path_encrypt = "./circuits/artifacts/encrypt_test/encrypt.wasm";
const zkey_path_encrypt = "./circuits/artifacts/encrypt_test/encrypt.zkey";

const wasm_path_decrypt = "./circuits/artifacts/decrypt_test/decrypt.wasm";
const zkey_path_decrypt = "./circuits/artifacts/decrypt_test/decrypt.zkey";

const genCircuitInputs = (
    keypair: Keypair,
    encodedMessage?: BabyJubExtPoint,
): {
    input_encrypt: EncryptCircuitInputs;
    ephemeral_key: string[];
    encrypted_message: string[];
} => {
    const encryption = encrypt(keypair.pubKey, encodedMessage);

    let input_encrypt: EncryptCircuitInputs = stringifyBigInts({
        message: toBigIntArray(encryption.message),
        nonceKey: encryption.nonce,
        publicKey: toBigIntArray(keypair.pubKey),
    });

    const ephemeral_key = toStringArray(encryption.ephemeral_key);
    const encrypted_message = toStringArray(encryption.encrypted_message);
    return { input_encrypt, ephemeral_key, encrypted_message };
};

describe("Testing ElGamal Scheme Circuits\n", () => {
    context("Testing Encode Circuit", () => {

        it("Encode/decode is same", async () => {
            const plaintext = 12345n;
            const encoded = encode(plaintext);
            const decoded = decode(encoded, 19);
            expect(decoded).to.equal(plaintext);

            const input_encode = {
              plaintext: plaintext.toString(),
            };

            const prove_encode = await snarkjs.groth16.fullProve(
                input_encode,
                wasm_path_encode,
                zkey_path_encode,
            );

            console.log(decoded, encoded, prove_encode);

            expect(prove_encode.publicSignals[0]).to.equal(encoded.ex);
            expect(prove_encode.publicSignals[1]).to.equal(encoded.ey);
        });
    });

    context("Testing Encrypt Circuit", () => {
        let input_encrypt: EncryptCircuitInputs;
        let keypair: Keypair;
        let ephemeral_key: string[];
        let encrypted_message: string[];

        before(() => {
            keypair = genKeypair();
            const object = genCircuitInputs(keypair);
            input_encrypt = object.input_encrypt;
            ephemeral_key = object.ephemeral_key;
            encrypted_message = object.encrypted_message;
        });

        it("Verify Encrypt circuit", async () => {
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input_encrypt,
                wasm_path_encrypt,
                zkey_path_encrypt,
            );
            const vKey = JSON.parse(
                fs.readFileSync("./circuits/artifacts/encrypt_test/encrypt.vkey.json"),
            );

            const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            expect(res).to.equal(true);
        });

        it("Verify circuit is resistant to invalid curve attacks: Invalid Public Key: not on curve", async () => {
            const invalid_input = {
                message: input_encrypt.message,
                nonceKey: input_encrypt.nonceKey,
                publicKey: ["1", "0"],
            }
            try {
                await snarkjs.groth16.fullProve(
                    invalid_input,
                    wasm_path_encrypt,
                    zkey_path_encrypt,
                );
                throw new Error('Expected to throw an error');
            } catch (error) {
                expect(error.message).to.contain("Error: Assert Failed. Error in template BabyCheck_2 line: 82\nError in template Encrypt_19 line: 59")
            }
        });

        it("Verify circuit is resistant to invalid curve attacks: Invalid Public Key: identity", async () => {
            const invalid_input = {
                message: input_encrypt.message,
                nonceKey: input_encrypt.nonceKey,
                publicKey: ["0", "1"],
            }
            try {
                await snarkjs.groth16.fullProve(
                    invalid_input,
                    wasm_path_encrypt,
                    zkey_path_encrypt,
                );
                throw new Error('Expected to throw an error');
            } catch (error) {
                expect(error.message).to.contain("Error: Assert Failed. Error in template Encrypt_19 line: 52")
            }
        });

        it("Verify Message assertion to be a point on curve", async () => {
            const invalid_input = {
                message: ["1", "0"],
                nonceKey: input_encrypt.nonceKey,
                publicKey: input_encrypt.publicKey,
            }
            try {
                await snarkjs.groth16.fullProve(
                    invalid_input,
                    wasm_path_encrypt,
                    zkey_path_encrypt,
                );
                throw new Error('Expected to throw an error');
            } catch (error) {
                expect(error.message).to.contain("Error: Assert Failed. Error in template BabyCheck_2 line: 82\nError in template Encrypt_19 line: 64")
            }
        });

        it("Verify compliant encrypt output", async () => {
            const { publicSignals } = await snarkjs.groth16.fullProve(
                input_encrypt,
                wasm_path_encrypt,
                zkey_path_encrypt,
            );
            // Verify compliant encryption output for the ephemeral key
            expect(publicSignals[0]).to.equals(ephemeral_key[0]);
            expect(publicSignals[1]).to.equals(ephemeral_key[1]);
            // Verify compliant encryption output for the encrypted message
            expect(publicSignals[2]).to.equals(encrypted_message[0]);
            expect(publicSignals[3]).to.equals(encrypted_message[1]);
        });

        it("Verify false encrypt output is invalid", async () => {
            input_encrypt.nonceKey = formatPrivKeyForBabyJub(genRandomSalt());
            const { publicSignals } = await snarkjs.groth16.fullProve(
                input_encrypt,
                wasm_path_encrypt,
                zkey_path_encrypt,
            );

            // Verify compliant encryption output for the ephemeral key
            expect(publicSignals[0]).to.not.equals(ephemeral_key[0]);
            expect(publicSignals[1]).to.not.equals(ephemeral_key[1]);
            // Verify compliant encryption output for the encrypted message
            expect(publicSignals[2]).to.not.equals(encrypted_message[0]);
            expect(publicSignals[3]).to.not.equals(encrypted_message[1]);
        });

        it("Looped: Verify compliant encrypt output for random inputs", async () => {
            for (let i = 0; i < 5; i++) {
                keypair = genKeypair();
                let { input_encrypt, ephemeral_key, encrypted_message } = genCircuitInputs(keypair);
                const { publicSignals } = await snarkjs.groth16.fullProve(
                    input_encrypt,
                    wasm_path_encrypt,
                    zkey_path_encrypt,
                );
                // Verify compliant encryption output for the ephemeral key
                expect(publicSignals[0]).to.equals(ephemeral_key[0]);
                expect(publicSignals[1]).to.equals(ephemeral_key[1]);
                // Verify compliant encryption output for the encrypted message
                expect(publicSignals[2]).to.equals(encrypted_message[0]);
                expect(publicSignals[3]).to.equals(encrypted_message[1]);
            }
        });
    });

    context("Testing Decrypt Circuit", () => {
        let input_encrypt: EncryptCircuitInputs;
        let input_decrypt: DecryptCircuitInputs;
        let keypair: Keypair;
        let ephemeral_key: string[];
        let encrypted_message: string[];
        let decrypted_message: string[];
        let message: string[];
        let encodedMessage: ExtPointType;

        before(() => {
            keypair = genKeypair();
            encodedMessage = genRandomPoint();
            message = toStringArray(encodedMessage);

            const encryption = genCircuitInputs(keypair, encodedMessage);
            input_encrypt = encryption.input_encrypt;
            ephemeral_key = encryption.ephemeral_key;
            encrypted_message = encryption.encrypted_message;

            input_decrypt = {
                encryptedMessage: encrypted_message,
                ephemeralKey: ephemeral_key,
                privateKey: formatPrivKeyForBabyJub(keypair.privKey),
            };
        });

        it("Verify Decrypt circuit", async () => {
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input_decrypt,
                wasm_path_decrypt,
                zkey_path_decrypt,
            );
            const vKey = JSON.parse(
                fs.readFileSync("./circuits/artifacts/decrypt_test/decrypt.vkey.json"),
            );

            const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            expect(res).to.equal(true);
        });

        it("Verify encryptedMessage assertion to be a point on curve", async () => {
            const invalid_input = {
                encryptedMessage: ["1", "0"],
                ephemeralKey: input_decrypt.ephemeralKey,
                privateKey: input_decrypt.privateKey,
            }
            try {
                await snarkjs.groth16.fullProve(
                    invalid_input,
                    wasm_path_decrypt,
                    zkey_path_decrypt,
                );
                throw new Error('Expected to throw an error');
            } catch (error) {
                expect(error.message).to.contain("Error: Assert Failed. Error in template BabyCheck_0 line: 82\nError in template Decrypt_13 line: 23")
            }
        });

        it("Verify ephemeralKey assertion to be a point on curve", async () => {
            const invalid_input = {
                encryptedMessage: input_decrypt.encryptedMessage,
                ephemeralKey: ["1", "0"],
                privateKey: input_decrypt.privateKey,
            }
            try {
                await snarkjs.groth16.fullProve(
                    invalid_input,
                    wasm_path_decrypt,
                    zkey_path_decrypt,
                );
                throw new Error('Expected to throw an error');
            } catch (error) {
                expect(error.message).to.contain("Error: Assert Failed. Error in template BabyCheck_0 line: 82\nError in template Decrypt_13 line: 27")
            }
        });

        it("Verify compliant decrypt output", async () => {
            const { publicSignals } = await snarkjs.groth16.fullProve(
                input_decrypt,
                wasm_path_decrypt,
                zkey_path_decrypt,
            );

            // Verify compliant decryption output of the decrypted message
            expect(publicSignals[0]).to.equals(message[0]);
            expect(publicSignals[1]).to.equals(message[1]);

            // Verify compliant decryption input for the encrypted message
            expect(publicSignals[2]).to.equals(encrypted_message[0]);
            expect(publicSignals[3]).to.equals(encrypted_message[1]);
        });

        it("Verify false decrypt output is invalid", async () => {
            // only modify the private key
            input_decrypt.privateKey = formatPrivKeyForBabyJub(genRandomSalt());
            const { publicSignals } = await snarkjs.groth16.fullProve(
                input_decrypt,
                wasm_path_decrypt,
                zkey_path_decrypt,
            );

            // Verify compliant decryption output of the decrypted message
            expect(publicSignals[0]).to.not.equals(message[0]);
            expect(publicSignals[1]).to.not.equals(message[1]);

            // Verify compliant decryption input for the encrypted message
            expect(publicSignals[2]).to.equals(encrypted_message[0]);
            expect(publicSignals[3]).to.equals(encrypted_message[1]);
        });

        it("Looped: Verify compliant decrypt output for random inputs", async () => {
            for (let i = 0; i < 5; i++) {
                keypair = genKeypair();
                encodedMessage = genRandomPoint();
                message = toStringArray(encodedMessage);

                const object = genCircuitInputs(keypair, encodedMessage);
                input_encrypt = object.input_encrypt;
                ephemeral_key = object.ephemeral_key;
                encrypted_message = object.encrypted_message;

                input_decrypt = {
                    encryptedMessage: encrypted_message,
                    ephemeralKey: ephemeral_key,
                    privateKey: formatPrivKeyForBabyJub(keypair.privKey),
                };

                const { publicSignals } = await snarkjs.groth16.fullProve(
                    input_decrypt,
                    wasm_path_decrypt,
                    zkey_path_decrypt,
                );

                // Verify compliant decryption output of the decrypted message
                expect(publicSignals[0]).to.equals(message[0]);
                expect(publicSignals[1]).to.equals(message[1]);

                // Verify compliant decryption input for the encrypted message
                expect(publicSignals[2]).to.equals(encrypted_message[0]);
                expect(publicSignals[3]).to.equals(encrypted_message[1]);
            }
        });
    });

    context("Testing compliance of Encrypt/Decrypt circuits: circuit to circuit", () => {
        let input_encrypt: EncryptCircuitInputs;
        let input_decrypt: DecryptCircuitInputs;
        let keypair: Keypair;
        let ephemeral_key: string[];
        let encrypted_message: string[];
        let decrypted_message: string[];
        let message: string[];
        let encodedMessage: ExtPointType;

        before(() => {
            keypair = genKeypair();
            encodedMessage = genRandomPoint();
            message = toStringArray(encodedMessage);

            let encryption = genCircuitInputs(keypair, encodedMessage);
            input_encrypt = encryption.input_encrypt;
            ephemeral_key = encryption.ephemeral_key;
            encrypted_message = encryption.encrypted_message;
        });

        it("Verify the message input is the same as decrypted message", async () => {
            const prove_encrypt = await snarkjs.groth16.fullProve(
                input_encrypt,
                wasm_path_encrypt,
                zkey_path_encrypt,
            );
            const publicSignals_encrypt = prove_encrypt.publicSignals;

            const input_decrypt = {
                encryptedMessage: [publicSignals_encrypt[2], publicSignals_encrypt[3]],
                ephemeralKey: [publicSignals_encrypt[0], publicSignals_encrypt[1]],
                privateKey: formatPrivKeyForBabyJub(keypair.privKey),
            };

            const prove_decrypt = await snarkjs.groth16.fullProve(
                input_decrypt,
                wasm_path_decrypt,
                zkey_path_decrypt,
            );
            const publicSignals_decrypt = prove_decrypt.publicSignals;

            expect(publicSignals_decrypt[0]).to.equals(message[0]);
            expect(publicSignals_decrypt[1]).to.equals(message[1]);
        });

        it("Looped Verify the circuits given random inputs", async () => {
            for (let i = 0; i < 10; i++) {
                message = toStringArray(encodedMessage);
                keypair = genKeypair();

                const object = genCircuitInputs(keypair, encodedMessage);
                input_encrypt = object.input_encrypt;
                ephemeral_key = object.ephemeral_key;
                encrypted_message = object.encrypted_message;

                const prove_encrypt = await snarkjs.groth16.fullProve(
                    input_encrypt,
                    wasm_path_encrypt,
                    zkey_path_encrypt,
                );
                const publicSignals_encrypt = prove_encrypt.publicSignals;

                // The input of the decrypt circuit is given by the output of the encrypt circuit
                let input_decrypt = {
                    encryptedMessage: [publicSignals_encrypt[2], publicSignals_encrypt[3]],
                    ephemeralKey: [publicSignals_encrypt[0], publicSignals_encrypt[1]],
                    privateKey: formatPrivKeyForBabyJub(keypair.privKey),
                };

                const prove_decrypt = await snarkjs.groth16.fullProve(
                    input_decrypt,
                    wasm_path_decrypt,
                    zkey_path_decrypt,
                );
                const publicSignals_decrypt = prove_decrypt.publicSignals;

                expect(publicSignals_decrypt[0]).to.equals(message[0]);
                expect(publicSignals_decrypt[1]).to.equals(message[1]);
            }
        });

        it("Verify the ElGamal homomorphic property of two random messages", async () => {
            const keypair = genKeypair();

            const encodedMessage1 = genRandomPoint();
            const encryption1 = genCircuitInputs(keypair, encodedMessage1);
            const input_encrypt1 = encryption1.input_encrypt;

            const encodedMessage2 = genRandomPoint();
            const encryption2 = genCircuitInputs(keypair, encodedMessage2);
            const input_encrypt2 = encryption2.input_encrypt;

            const prove_encrypt1 = await snarkjs.groth16.fullProve(
                input_encrypt1,
                wasm_path_encrypt,
                zkey_path_encrypt,
            );
            const publicSignals_encrypt1 = prove_encrypt1.publicSignals;

            const prove_encrypt2 = await snarkjs.groth16.fullProve(
                input_encrypt2,
                wasm_path_encrypt,
                zkey_path_encrypt,
            );
            const publicSignals_encrypt2 = prove_encrypt2.publicSignals;

            // Take the first encrypted message from the circuit output
            const encrypted_message1 = coordinatesToExtPoint(
                publicSignals_encrypt1[2],
                publicSignals_encrypt1[3],
            );
            // Take the second encrypted message from the circuit output
            const encrypted_message2 = coordinatesToExtPoint(
                publicSignals_encrypt2[2],
                publicSignals_encrypt2[3],
            );

            // Add both encrypted messages to verify the homomorphic property
            const encrypted_message3 = encrypted_message1.add(encrypted_message2);
            // Proving message is equal to the decrypted(encrypted_message3) => will prove the homomorphic property
            let message3 = encodedMessage1.add(encodedMessage2);

            // Take the first ephemeral key from the circuit output
            const ephemeral_key1 = coordinatesToExtPoint(
                publicSignals_encrypt1[0],
                publicSignals_encrypt1[1],
            );
            // Take the second ephemeral key from the circuit output
            const ephemeral_key2 = coordinatesToExtPoint(
                publicSignals_encrypt2[0],
                publicSignals_encrypt2[1],
            );

            // The ephemeral key for homomorphic decryption should be ephemeral_key1 + ephemeral_key2
            const ephemeral_key3 = ephemeral_key1.add(ephemeral_key2);

            // The input of the decrypt circuit is given by the added outputs of the encrypt circuit for message1 and message2
            const input_decrypt3: DecryptCircuitInputs = {
                encryptedMessage: toStringArray(encrypted_message3),
                ephemeralKey: toStringArray(ephemeral_key3),
                privateKey: formatPrivKeyForBabyJub(keypair.privKey),
            };

            const prove_decrypt = await snarkjs.groth16.fullProve(
                input_decrypt3,
                wasm_path_decrypt,
                zkey_path_decrypt,
            );
            const publicSignals_decrypt3 = prove_decrypt.publicSignals;

            expect(publicSignals_decrypt3[0]).to.equals(message3.toAffine().x.toString());
            expect(publicSignals_decrypt3[1]).to.equals(message3.toAffine().y.toString());
        });
    });
});
