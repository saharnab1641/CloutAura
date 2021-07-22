import { createDecipheriv, randomBytes, createHash } from "crypto";
import * as sha256 from "sha256";
import { ec as EC } from "elliptic";

export class TransactionService {
  private uvarint64ToBuf = (uint: number): Buffer => {
    const result = [];

    while (uint >= 0x80) {
      result.push((uint & 0xff) | 0x80);
      uint >>>= 7;
    }

    result.push(uint | 0);
    return Buffer.from(result);
  };

  private seedHexToPrivateKey = (seedHex: String) => {
    const ec = new EC("secp256k1");
    return ec.keyFromPrivate(seedHex.toString());
  };

  public decryptSeedHex = (
    encryptedSeedHex: String,
    hostEncryptionKey: String
  ): String => {
    if (!hostEncryptionKey || hostEncryptionKey.length !== 64) {
      throw new Error("Failed to load or generate encryption key.");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(hostEncryptionKey, "hex"),
      randomBytes(16)
    );
    return decipher
      .update(Buffer.from(encryptedSeedHex, "hex"))
      .toString("base64");
  };

  public signTransaction = (seedHex: String, transactionHex: String) => {
    const privateKey = this.seedHexToPrivateKey(seedHex);

    const transactionBytes = Buffer.from(transactionHex, "hex");
    const transactionHash = Buffer.from(sha256.x2(transactionBytes), "hex");
    const signature = privateKey.sign(transactionHash);
    const signatureBytes = Buffer.from(signature.toDER());
    const signatureLength = this.uvarint64ToBuf(signatureBytes.length);

    const signedTransactionBytes = Buffer.concat([
      transactionBytes.slice(0, -1),
      signatureLength,
      signatureBytes,
    ]);

    return signedTransactionBytes.toString("hex");
  };
}
