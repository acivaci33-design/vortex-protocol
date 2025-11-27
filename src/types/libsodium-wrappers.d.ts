declare module 'libsodium-wrappers' {
  /**
   * Complete libsodium-wrappers TypeScript definitions for VORTEX Protocol
   * Includes all crypto primitives used in the application
   */
  type Bytes = Uint8Array;

  interface KeyPair {
    publicKey: Bytes;
    privateKey: Bytes;
  }

  interface SignKeyPair {
    publicKey: Bytes;
    privateKey: Bytes;
    keyType: string;
  }

  interface Sodium {
    ready: Promise<void>;

    // ==================== Key Exchange (X25519) ====================
    crypto_kx_keypair(): KeyPair;
    crypto_kx_client_session_keys(
      clientPublicKey: Bytes,
      clientSecretKey: Bytes,
      serverPublicKey: Bytes
    ): { sharedRx: Bytes; sharedTx: Bytes };
    crypto_kx_server_session_keys(
      serverPublicKey: Bytes,
      serverSecretKey: Bytes,
      clientPublicKey: Bytes
    ): { sharedRx: Bytes; sharedTx: Bytes };
    crypto_kx_PUBLICKEYBYTES: number;
    crypto_kx_SECRETKEYBYTES: number;
    crypto_kx_SEEDBYTES: number;
    crypto_kx_SESSIONKEYBYTES: number;

    // ==================== Scalar Multiplication (X25519) ====================
    crypto_scalarmult(privateKey: Bytes, publicKey: Bytes): Bytes;
    crypto_scalarmult_base(privateKey: Bytes): Bytes;
    crypto_scalarmult_BYTES: number;
    crypto_scalarmult_SCALARBYTES: number;

    // ==================== AEAD (ChaCha20-Poly1305) ====================
    crypto_aead_chacha20poly1305_ietf_encrypt(
      message: Bytes,
      additionalData: Bytes | null,
      secretNonce: Bytes | null,
      publicNonce: Bytes,
      key: Bytes
    ): Bytes;
    crypto_aead_chacha20poly1305_ietf_decrypt(
      secretNonce: Bytes | null,
      ciphertext: Bytes,
      additionalData: Bytes | null,
      publicNonce: Bytes,
      key: Bytes
    ): Bytes;
    crypto_aead_chacha20poly1305_ietf_KEYBYTES: number;
    crypto_aead_chacha20poly1305_ietf_NPUBBYTES: number;
    crypto_aead_chacha20poly1305_ietf_ABYTES: number;

    // ==================== XChaCha20-Poly1305 ====================
    crypto_aead_xchacha20poly1305_ietf_encrypt(
      message: Bytes,
      additionalData: Bytes | null,
      secretNonce: Bytes | null,
      publicNonce: Bytes,
      key: Bytes
    ): Bytes;
    crypto_aead_xchacha20poly1305_ietf_decrypt(
      secretNonce: Bytes | null,
      ciphertext: Bytes,
      additionalData: Bytes | null,
      publicNonce: Bytes,
      key: Bytes
    ): Bytes;
    crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
    crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: number;

    // ==================== Signing (Ed25519) ====================
    crypto_sign_keypair(): SignKeyPair;
    crypto_sign_seed_keypair(seed: Bytes): SignKeyPair;
    crypto_sign(message: Bytes, privateKey: Bytes): Bytes;
    crypto_sign_open(signedMessage: Bytes, publicKey: Bytes): Bytes;
    crypto_sign_detached(message: Bytes, privateKey: Bytes): Bytes;
    crypto_sign_verify_detached(signature: Bytes, message: Bytes, publicKey: Bytes): boolean;
    crypto_sign_ed25519_pk_to_curve25519(ed25519Pk: Bytes): Bytes;
    crypto_sign_ed25519_sk_to_curve25519(ed25519Sk: Bytes): Bytes;
    crypto_sign_BYTES: number;
    crypto_sign_PUBLICKEYBYTES: number;
    crypto_sign_SECRETKEYBYTES: number;
    crypto_sign_SEEDBYTES: number;

    // ==================== Generic Hashing (BLAKE2b) ====================
    crypto_generichash(outputLength: number, message: Bytes, key?: Bytes): Bytes;
    crypto_generichash_init(key: Bytes | null, outputLength: number): any;
    crypto_generichash_update(state: any, message: Bytes): void;
    crypto_generichash_final(state: any, outputLength: number): Bytes;
    crypto_generichash_BYTES: number;
    crypto_generichash_BYTES_MIN: number;
    crypto_generichash_BYTES_MAX: number;
    crypto_generichash_KEYBYTES: number;

    // ==================== Authentication (HMAC) ====================
    crypto_auth(message: Bytes, key: Bytes): Bytes;
    crypto_auth_verify(tag: Bytes, message: Bytes, key: Bytes): boolean;
    crypto_auth_BYTES: number;
    crypto_auth_KEYBYTES: number;

    // ==================== Password Hashing (Argon2) ====================
    crypto_pwhash(
      outputLength: number,
      password: string | Bytes,
      salt: Bytes,
      opsLimit: number,
      memLimit: number,
      algorithm: number
    ): Bytes;
    crypto_pwhash_str(
      password: string | Bytes,
      opsLimit: number,
      memLimit: number
    ): string;
    crypto_pwhash_str_verify(hash: string, password: string | Bytes): boolean;
    crypto_pwhash_SALTBYTES: number;
    crypto_pwhash_STRBYTES: number;
    crypto_pwhash_OPSLIMIT_INTERACTIVE: number;
    crypto_pwhash_OPSLIMIT_MODERATE: number;
    crypto_pwhash_OPSLIMIT_SENSITIVE: number;
    crypto_pwhash_MEMLIMIT_INTERACTIVE: number;
    crypto_pwhash_MEMLIMIT_MODERATE: number;
    crypto_pwhash_MEMLIMIT_SENSITIVE: number;
    crypto_pwhash_ALG_ARGON2I13: number;
    crypto_pwhash_ALG_ARGON2ID13: number;
    crypto_pwhash_ALG_DEFAULT: number;

    // ==================== Secret Box (XSalsa20-Poly1305) ====================
    crypto_secretbox_easy(message: Bytes, nonce: Bytes, key: Bytes): Bytes;
    crypto_secretbox_open_easy(ciphertext: Bytes, nonce: Bytes, key: Bytes): Bytes;
    crypto_secretbox_KEYBYTES: number;
    crypto_secretbox_NONCEBYTES: number;
    crypto_secretbox_MACBYTES: number;

    // ==================== Box (X25519 + XSalsa20-Poly1305) ====================
    crypto_box_keypair(): KeyPair;
    crypto_box_seed_keypair(seed: Bytes): KeyPair;
    crypto_box_easy(message: Bytes, nonce: Bytes, publicKey: Bytes, privateKey: Bytes): Bytes;
    crypto_box_open_easy(ciphertext: Bytes, nonce: Bytes, publicKey: Bytes, privateKey: Bytes): Bytes;
    crypto_box_seal(message: Bytes, publicKey: Bytes): Bytes;
    crypto_box_seal_open(ciphertext: Bytes, publicKey: Bytes, privateKey: Bytes): Bytes;
    crypto_box_PUBLICKEYBYTES: number;
    crypto_box_SECRETKEYBYTES: number;
    crypto_box_NONCEBYTES: number;
    crypto_box_MACBYTES: number;
    crypto_box_SEALBYTES: number;

    // ==================== Key Derivation ====================
    crypto_kdf_derive_from_key(
      subkeyLength: number,
      subkeyId: number,
      context: string,
      masterKey: Bytes
    ): Bytes;
    crypto_kdf_keygen(): Bytes;
    crypto_kdf_KEYBYTES: number;
    crypto_kdf_BYTES_MIN: number;
    crypto_kdf_BYTES_MAX: number;
    crypto_kdf_CONTEXTBYTES: number;

    // ==================== Random ====================
    randombytes_buf(length: number): Bytes;
    randombytes_uniform(upperBound: number): number;
    randombytes_random(): number;

    // ==================== Utilities ====================
    memzero(bytes: Bytes): void;
    memcmp(a: Bytes, b: Bytes): boolean;
    increment(bytes: Bytes): void;
    add(a: Bytes, b: Bytes): void;
    compare(a: Bytes, b: Bytes): number;
    is_zero(bytes: Bytes): boolean;
    pad(buf: Bytes, blockSize: number): Bytes;
    unpad(buf: Bytes, blockSize: number): Bytes;

    // ==================== Encoding ====================
    to_hex(bytes: Bytes): string;
    from_hex(hex: string): Bytes;
    to_base64(bytes: Bytes, variant?: number): string;
    from_base64(base64: string, variant?: number): Bytes;
    to_string(bytes: Bytes): string;
    from_string(str: string): Bytes;

    base64_variants: {
      ORIGINAL: number;
      ORIGINAL_NO_PADDING: number;
      URLSAFE: number;
      URLSAFE_NO_PADDING: number;
    };

    // ==================== Short Hash (SipHash) ====================
    crypto_shorthash(message: Bytes, key: Bytes): Bytes;
    crypto_shorthash_BYTES: number;
    crypto_shorthash_KEYBYTES: number;

    // ==================== Stream Cipher ====================
    crypto_stream_chacha20_xor(message: Bytes, nonce: Bytes, key: Bytes): Bytes;
    crypto_stream_chacha20_KEYBYTES: number;
    crypto_stream_chacha20_NONCEBYTES: number;
  }

  const sodium: Sodium;
  export default sodium;
}
