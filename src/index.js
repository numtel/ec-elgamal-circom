"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.babyJub = exports.rerandomize = exports.decrypt = exports.encrypt_s = exports.encrypt = exports.genKeypair = exports.genPubKey = exports.genPrivKey = exports.genRandomSalt = exports.genRandomPoint = exports.genRandomBabyJubValue = void 0;
const babyjub_noble_1 = require("../utils/babyjub-noble");
const tools_1 = require("../utils/tools");
const assert_1 = __importDefault(require("assert"));
const crypto_1 = __importDefault(require("crypto"));
// The BN254 group order p
const SNARK_FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
// Textbook Elgamal Encryption Scheme over Baby Jubjub curve without message encoding
const babyJub = babyjub_noble_1.babyJub.ExtendedPoint;
exports.babyJub = babyJub;
/**
 * Returns a BabyJub-compatible random value. We create it by first generating
 * a random value (initially 256 bits large) modulo the snark field size as
 * described in EIP197. This results in a key size of roughly 253 bits and no
 * more than 254 bits. To prevent modulo bias, we then use this efficient
 * algorithm:
 * http://cvsweb.openbsd.org/cgi-bin/cvsweb/~checkout~/src/lib/libc/crypt/arc4random_uniform.c
 * @return A BabyJub-compatible random value.
 * @see {@link https://github.com/privacy-scaling-explorations/maci/blob/master/crypto/ts/index.ts}
 */
function genRandomBabyJubValue() {
    // Prevent modulo bias
    //const lim = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000')
    //const min = (lim - SNARK_FIELD_SIZE) % SNARK_FIELD_SIZE
    const min = BigInt("6350874878119819312338956282401532410528162663560392320966563075034087161851");
    let rand;
    while (true) {
        rand = BigInt("0x" + crypto_1.default.randomBytes(32).toString("hex"));
        if (rand >= min) {
            break;
        }
    }
    const privKey = rand % SNARK_FIELD_SIZE;
    (0, assert_1.default)(privKey < SNARK_FIELD_SIZE);
    return privKey;
}
exports.genRandomBabyJubValue = genRandomBabyJubValue;
/**
 * @return A BabyJub-compatible private key.
 */
const genPrivKey = () => {
    return genRandomBabyJubValue();
};
exports.genPrivKey = genPrivKey;
/**
 * @return A BabyJub-compatible salt.
 */
const genRandomSalt = () => {
    return genRandomBabyJubValue();
};
exports.genRandomSalt = genRandomSalt;
/**
 * @param privKey A private key generated using genPrivKey()
 * @return A public key associated with the private key
 */
function genPubKey(privKey) {
    // Check whether privKey is a field element
    privKey = BigInt(privKey.toString());
    (0, assert_1.default)(privKey < SNARK_FIELD_SIZE);
    return (0, tools_1.prv2pub)((0, tools_1.bigInt2Buffer)(privKey));
}
exports.genPubKey = genPubKey;
function genKeypair() {
    const privKey = genPrivKey();
    const pubKey = genPubKey(privKey);
    const Keypair = { privKey, pubKey };
    return Keypair;
}
exports.genKeypair = genKeypair;
function genRandomPoint() {
    const salt = genRandomBabyJubValue();
    return genPubKey(salt);
}
exports.genRandomPoint = genRandomPoint;
/**
 * Encrypts a plaintext such that only the owner of the specified public key
 * may decrypt it.
 * @param pubKey The recepient's public key
 * @param encodedMessage A plaintext encoded as a BabyJub curve point (optional)
 * @param randomVal A random value y used along with the private key to generate the ciphertext (optional)
 */
function encrypt(pubKey, encodedMessage, randomVal) {
    const message = encodedMessage ?? genRandomPoint();
    // The sender chooses a secret key as a nonce
    const nonce = randomVal ?? (0, tools_1.formatPrivKeyForBabyJub)(genRandomSalt());
    // The sender calculates an ephemeral key => [nonce].Base
    const ephemeral_key = babyJub.BASE.multiply(nonce);
    const masking_key = pubKey.multiply(nonce);
    let encrypted_message;
    // The sender encrypts the encodedMessage
    // @ts-ignore
    if (pubKey.assertValidity && !pubKey.equals(babyJub.ZERO)) {
        encrypted_message = message.add(masking_key);
    }
    else
        throw new Error("Invalid Public Key!");
    return { message, ephemeral_key, encrypted_message, nonce };
}
exports.encrypt = encrypt;
/**
 * Decrypts a ciphertext using a private key.
 * @param privKey The private key
 * @param ciphertext The ciphertext to decrypt
 */
function decrypt(privKey, ephemeral_key, encrypted_message) {
    // The receiver decrypts the message => encryptedMessage - [privKey].ephemeralKey
    const masking_key = ephemeral_key.multiply((0, tools_1.formatPrivKeyForBabyJub)(privKey));
    const decrypted_message = encrypted_message.add(masking_key.negate());
    return decrypted_message;
}
exports.decrypt = decrypt;
// ElGamal Scheme with specified inputs for testing purposes
function encrypt_s(message, public_key, nonce) {
    nonce = nonce ?? genRandomSalt();
    const ephemeral_key = babyJub.BASE.multiply(nonce);
    const masking_key = public_key.multiply(nonce);
    const encrypted_message = masking_key.add(message);
    return { ephemeral_key, encrypted_message };
}
exports.encrypt_s = encrypt_s;
/**
 * Randomize a ciphertext such that it is different from the original
 * ciphertext but can be decrypted by the same private key.
 * @param pubKey The same public key used to encrypt the original encodedMessage
 * @param ciphertext The ciphertext to re-randomize.
 * @param randomVal A random value z such that the re-randomized ciphertext could have been generated a random value y+z in the first
 *                  place (optional)
 */
function rerandomize(pubKey, ephemeral_key, encrypted_message, randomVal) {
    const nonce = randomVal ?? genRandomSalt();
    const randomized_ephemeralKey = ephemeral_key.add(babyJub.BASE.multiply(nonce));
    const randomized_encryptedMessage = encrypted_message.add(pubKey.multiply(nonce));
    return { randomized_ephemeralKey, randomized_encryptedMessage };
}
exports.rerandomize = rerandomize;
