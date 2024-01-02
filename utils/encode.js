import { babyJub } from "../src/index";
export function encode(plaintext) {
    if (plaintext <= BigInt(2) ** BigInt(32)) {
        return babyJub.BASE.multiplyUnsafe(plaintext);
    }
    else
        throw new Error("The input should be 32-bit bigint");
}
