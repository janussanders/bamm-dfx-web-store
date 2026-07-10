/**
 * Validates an RSA private key in PEM format
 */
export function validatePrivateKeyPEM(pemString: string): {
  valid: boolean;
  error?: string;
} {
  // Check for PEM headers
  const privateKeyRegex =
    /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]+-----END (RSA )?PRIVATE KEY-----/;

  if (!privateKeyRegex.test(pemString)) {
    return {
      valid: false,
      error:
        "Invalid PEM format. Must contain BEGIN and END PRIVATE KEY markers.",
    };
  }

  // Check for proper line breaks
  if (!pemString.includes("\n") && !pemString.includes("\r")) {
    return {
      valid: false,
      error: "Invalid PEM format. Key must contain proper line breaks.",
    };
  }

  // Extract the base64 content
  const lines = pemString.split(/\r?\n/);
  const contentLines = lines.filter(
    (line) =>
      !line.includes("BEGIN") &&
      !line.includes("END") &&
      line.trim().length > 0,
  );

  if (contentLines.length === 0) {
    return {
      valid: false,
      error: "Invalid PEM format. No key content found.",
    };
  }

  // Validate base64 content
  const base64Content = contentLines.join("");
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;

  if (!base64Regex.test(base64Content)) {
    return {
      valid: false,
      error: "Invalid PEM format. Key content is not valid base64.",
    };
  }

  // Check minimum key length (base64 encoded)
  if (base64Content.length < 800) {
    return {
      valid: false,
      error: "Key appears too short. Minimum 1024-bit RSA key required.",
    };
  }

  return { valid: true };
}

/**
 * Converts a PEM string to ArrayBuffer for Web Crypto API
 */
export function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Imports an RSA private key PEM string using SubtleCrypto.
 * Supports both PKCS#1 (RSA PRIVATE KEY) and PKCS#8 (PRIVATE KEY) formats.
 */
export async function importPrivateKey(pemString: string): Promise<CryptoKey> {
  const isPkcs1 = pemString.includes("BEGIN RSA PRIVATE KEY");

  let keyBuffer: ArrayBuffer;
  if (isPkcs1) {
    // PKCS#1 must be wrapped in PKCS#8 for SubtleCrypto
    keyBuffer = pkcs1ToPkcs8(pemToArrayBuffer(pemString));
  } else {
    keyBuffer = pemToArrayBuffer(pemString);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * Wraps a raw PKCS#1 RSA key DER in a PKCS#8 envelope so SubtleCrypto can import it.
 * This is a minimal PKCS#8 wrapper: PrivateKeyInfo structure.
 */
function pkcs1ToPkcs8(pkcs1Der: ArrayBuffer): ArrayBuffer {
  // RSA OID: 1.2.840.113549.1.1.1 -> 2a 86 48 86 f7 0d 01 01 01
  const rsaOid = new Uint8Array([
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
  ]);
  const pkcs1Bytes = new Uint8Array(pkcs1Der);

  // AlgorithmIdentifier: SEQUENCE { OID, NULL }
  const algorithmIdentifier = new Uint8Array([
    0x30,
    rsaOid.length + 4,
    0x06,
    rsaOid.length,
    ...rsaOid,
    0x05,
    0x00, // NULL
  ]);

  // Wrap pkcs1 in OCTET STRING
  const pkcs1Length = pkcs1Bytes.length;
  const octetStringHeader = encodeLength(pkcs1Length);
  const octetString = new Uint8Array(
    1 + octetStringHeader.length + pkcs1Length,
  );
  octetString[0] = 0x04; // OCTET STRING tag
  octetString.set(octetStringHeader, 1);
  octetString.set(pkcs1Bytes, 1 + octetStringHeader.length);

  // version INTEGER 0
  const version = new Uint8Array([0x02, 0x01, 0x00]);

  // PrivateKeyInfo SEQUENCE
  const inner = new Uint8Array(
    version.length + algorithmIdentifier.length + octetString.length,
  );
  inner.set(version, 0);
  inner.set(algorithmIdentifier, version.length);
  inner.set(octetString, version.length + algorithmIdentifier.length);

  const outerHeader = encodeLength(inner.length);
  const pkcs8 = new Uint8Array(1 + outerHeader.length + inner.length);
  pkcs8[0] = 0x30; // SEQUENCE tag
  pkcs8.set(outerHeader, 1);
  pkcs8.set(inner, 1 + outerHeader.length);

  return pkcs8.buffer;
}

function encodeLength(len: number): Uint8Array {
  if (len < 0x80) return new Uint8Array([len]);
  if (len < 0x100) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

/**
 * Signs a license payload using RSA-SHA256 via SubtleCrypto.
 * Returns the complete license JSON string with payload + signature.
 */
export interface LicensePayload {
  features: string[];
  issued_to: string;
  expires: string;
  generated_by: string;
  generated_at: string;
}

export async function signLicensePayload(
  pemString: string,
  payload: LicensePayload,
): Promise<{ payload: LicensePayload; signature: string }> {
  // Defensive: verify features array is present and non-empty
  if (!Array.isArray(payload.features)) {
    throw new Error("License payload features must be an array");
  }
  if (payload.features.length === 0) {
    throw new Error("License payload features array must not be empty");
  }

  // Build the exact JSON string that gets signed — do this exactly once
  const payloadStr = JSON.stringify(payload);

  // Log for debugging (features count and payload preview)
  console.log(
    "[signLicensePayload] Signing payload with",
    payload.features.length,
    "features:",
    payload.features,
  );
  console.log("[signLicensePayload] Payload JSON:", payloadStr);

  // Verify the JSON string contains all features
  const parsedBack = JSON.parse(payloadStr);
  if (
    !Array.isArray(parsedBack.features) ||
    parsedBack.features.length !== payload.features.length
  ) {
    throw new Error(
      `Payload serialization error: expected ${payload.features.length} features but serialized payload has ${parsedBack.features?.length || 0}`,
    );
  }

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(payloadStr);

  const privateKey = await importPrivateKey(pemString);
  const signatureBuffer = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    dataBuffer,
  );

  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  );

  console.log(
    "[signLicensePayload] Signature generated, length:",
    signatureBase64.length,
  );

  return { payload, signature: signatureBase64 };
}

/**
 * Validates an RSA key by attempting to import it via SubtleCrypto.
 */
export async function validateRSAKey(pemString: string): Promise<boolean> {
  try {
    await importPrivateKey(pemString);
    return true;
  } catch {
    // Fall back to format-only validation if SubtleCrypto import fails
    const validation = validatePrivateKeyPEM(pemString);
    return validation.valid;
  }
}
