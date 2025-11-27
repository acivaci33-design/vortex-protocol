import sodium from 'libsodium-wrappers';

export type Base64 = string;
export type Bytes = Uint8Array;
export type Role = 'client' | 'server';

export interface KeyPair {
  publicKey: Bytes;
  privateKey: Bytes;
}

export interface CipherText {
  nonce: Bytes;
  payload: Bytes;
}

function toBase64(b: Bytes): Base64 {
  return sodium.to_base64(b, sodium.base64_variants.URLSAFE_NO_PADDING);
}

function fromBase64(s: Base64): Bytes {
  return sodium.from_base64(s, sodium.base64_variants.URLSAFE_NO_PADDING);
}

class CryptoServiceImpl {
  private ready = false;

  async init(): Promise<void> {
    if (this.ready) return;
    await sodium.ready;
    this.ready = true;
  }

  generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = sodium.crypto_kx_keypair();
    return { publicKey, privateKey };
  }

  deriveSessionKeys(
    myKeys: KeyPair,
    theirPublicKey: Bytes,
    role: Role
  ): { rx: Bytes; tx: Bytes } {
    const client = role === 'client';
    const server = role === 'server';
    if (!client && !server) throw new Error('invalid role');

    if (client) {
      const { sharedRx, sharedTx } = sodium.crypto_kx_client_session_keys(
        myKeys.publicKey,
        myKeys.privateKey,
        theirPublicKey
      );
      return { rx: sharedRx, tx: sharedTx };
    }
    const { sharedRx, sharedTx } = sodium.crypto_kx_server_session_keys(
      myKeys.publicKey,
      myKeys.privateKey,
      theirPublicKey
    );
    return { rx: sharedRx, tx: sharedTx };
  }

  encryptBytes(plain: Bytes, key: Bytes): CipherText {
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_ietf_NPUBBYTES);
    const payload = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(
      plain,
      null,
      null,
      nonce,
      key
    );
    return { nonce, payload };
  }

  decryptBytes(cipher: CipherText, key: Bytes): Bytes {
    const { nonce, payload } = cipher;
    const plain = sodium.crypto_aead_chacha20poly1305_ietf_decrypt(
      null,
      payload,
      null,
      nonce,
      key
    );
    return plain;
  }

  async encryptText(text: string, key: Bytes): Promise<{ nonceB64: Base64; payloadB64: Base64 }> {
    const bytes = sodium.from_string(text);
    const { nonce, payload } = this.encryptBytes(bytes, key);
    return { nonceB64: toBase64(nonce), payloadB64: toBase64(payload) };
  }

  async decryptText(nonceB64: Base64, payloadB64: Base64, key: Bytes): Promise<string> {
    const plain = this.decryptBytes({ nonce: fromBase64(nonceB64), payload: fromBase64(payloadB64) }, key);
    return sodium.to_string(plain);
  }

  async deriveMasterKey(password: string, salt?: Bytes): Promise<{ key: Bytes; salt: Bytes }> {
    await this.init();
    const s = salt ?? sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const key = sodium.crypto_pwhash(
      32,
      password,
      s,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );
    return { key, salt: s };
  }

  encode(b: Bytes): Base64 { return toBase64(b); }
  decode(b64: Base64): Bytes { return fromBase64(b64); }
}

export const CryptoService = new CryptoServiceImpl();
