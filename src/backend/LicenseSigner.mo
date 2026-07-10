import Array "mo:core/Array";
import Char "mo:core/Char";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Sha256 "mo:sha2/Sha256";

module {
  // build-marker: v119.0.2 — sha2 Digest.writeBlob for Text.encodeUtf8 (core Blob)

  public type SignResult = { #ok : Text; #err : Text };

  type RsaPrivateKey = {
    n : Nat;
    d : Nat;
    keySize : Nat;
  };

  let trimWs = #predicate(func (c : Char) : Bool {
    c == ' ' or c == '\t' or c == '\r';
  });

  let digestInfoPrefix : [Nat8] = [
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04,
    0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
  ];

  let b64Chars : [Char] = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
    'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
    'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/',
  ];

  func bytesToNat(bytes : [Nat8]) : Nat {
    var n : Nat = 0;
    for (b in bytes.vals()) {
      n := n * 256 + b.toNat();
    };
    n;
  };

  func trimLeadingZero(bytes : [Nat8]) : [Nat8] {
    if (bytes.size() > 1 and bytes[0] == 0) {
      Array.tabulate<Nat8>(bytes.size() - 1, func(i) { bytes[i + 1] });
    } else {
      bytes;
    };
  };

  func modulusByteLength(n : Nat) : Nat {
    if (n == 0) { return 1 };
    var bits : Nat = 0;
    var temp = n;
    while (temp > 0) {
      bits += 1;
      temp := temp / 2;
    };
    (bits + 7) / 8;
  };

  func natToFixedBytes(n : Nat, size : Nat) : [Nat8] {
    var remaining = n;
    let littleEndian = List.empty<Nat8>();
    var count : Nat = 0;
    while (count < size) {
      littleEndian.add(Nat8.fromNat(remaining % 256));
      remaining := remaining / 256;
      count += 1;
    };
    let le = littleEndian.toArray();
    Array.tabulate<Nat8>(size, func(i) { le[size - 1 - i] });
  };

  func readDerLength(bytes : [Nat8], offset : Nat) : ?(Nat, Nat) {
    if (offset >= bytes.size()) { return null };
    let first = bytes[offset].toNat();
    if (first < 0x80) {
      ?(first, 1);
    } else {
      let numLenBytes = Nat.sub(first, 0x80);
      if (offset + numLenBytes >= bytes.size()) { return null };
      var len : Nat = 0;
      var i : Nat = 1;
      while (i <= numLenBytes) {
        len := len * 256 + bytes[offset + i].toNat();
        i += 1;
      };
      ?(len, 1 + numLenBytes);
    };
  };

  func slice(bytes : [Nat8], start : Nat, len : Nat) : [Nat8] {
    Array.tabulate<Nat8>(len, func(i) { bytes[start + i] });
  };

  func readDerInteger(bytes : [Nat8], offset : Nat) : ?(Nat, Nat) {
    if (offset >= bytes.size() or bytes[offset] != 0x02) { return null };
    switch (readDerLength(bytes, offset + 1)) {
      case null null;
      case (?(intLen, lenSize)) {
        let intStart = offset + 1 + lenSize;
        if (intStart + intLen > bytes.size()) { return null };
        let intBytes = slice(bytes, intStart, intLen);
        ?(bytesToNat(trimLeadingZero(intBytes)), 1 + lenSize + intLen);
      };
    };
  };

  func skipDerElement(bytes : [Nat8], offset : Nat) : ?Nat {
    if (offset >= bytes.size()) { return null };
    switch (readDerLength(bytes, offset + 1)) {
      case null null;
      case (?(contentLen, lenSize)) {
        ?(offset + 1 + lenSize + contentLen);
      };
    };
  };

  func parsePkcs1PrivateKeyDer(der : [Nat8]) : ?RsaPrivateKey {
    if (der.size() < 4 or der[0] != 0x30) { return null };
    var offset : Nat = 1;
    switch (readDerLength(der, offset)) {
      case null null;
      case (?(seqLen, lenSize)) {
        offset += lenSize;
        let seqEnd = offset + seqLen;
        var modulus : ?Nat = null;
        var privateExponent : ?Nat = null;
        var intIndex : Nat = 0;
        while (offset < seqEnd and offset < der.size()) {
          switch (der[offset]) {
            case (0x02) {
              switch (readDerInteger(der, offset)) {
                case null { return null };
                case (?(value, consumed)) {
                  switch (intIndex) {
                    case (1) { modulus := ?value };
                    case (3) { privateExponent := ?value };
                    case (_) {};
                  };
                  intIndex += 1;
                  offset += consumed;
                };
              };
            };
            case (_) {
              switch (skipDerElement(der, offset)) {
                case null { return null };
                case (?next) { offset := next };
              };
            };
          };
        };
        switch (modulus, privateExponent) {
          case (?n, ?d) {
            let keySize = modulusByteLength(n);
            ?{ n; d; keySize };
          };
          case _ null;
        };
      };
    };
  };

  func unwrapPkcs8(der : [Nat8]) : ?[Nat8] {
    if (der.size() < 4 or der[0] != 0x30) { return null };
    var offset : Nat = 1;
    switch (readDerLength(der, offset)) {
      case null null;
      case (?(seqLen, lenSize)) {
        offset += lenSize;
        let seqEnd = offset + seqLen;
        while (offset < seqEnd and offset < der.size()) {
          if (der[offset] == 0x04) {
            switch (readDerLength(der, offset + 1)) {
              case null {};
              case (?(octetLen, octetLenSize)) {
                let start = offset + 1 + octetLenSize;
                return ?slice(der, start, octetLen);
              };
            };
          };
          switch (skipDerElement(der, offset)) {
            case null {};
            case (?next) { offset := next };
          };
        };
        null;
      };
    };
  };

  func pemToDer(pem : Text) : ?[Nat8] {
    var body = "";
    for (line in pem.split(#text "\n")) {
      let trimmed = line.trim(trimWs);
      if (trimmed.size() == 0) { continue };
      if (trimmed.startsWith(#text "-----BEGIN")) { continue };
      if (trimmed.startsWith(#text "-----END")) { continue };
      body #= trimmed;
    };
    if (body.size() == 0) { return null };
    ?base64Decode(body);
  };

  func parsePemPrivateKey(pem : Text) : ?RsaPrivateKey {
    switch (pemToDer(pem)) {
      case null null;
      case (?der) {
        switch (parsePkcs1PrivateKeyDer(der)) {
          case (?key) ?key;
          case null {
            switch (unwrapPkcs8(der)) {
              case null null;
              case (?inner) { parsePkcs1PrivateKeyDer(inner) };
            };
          };
        };
      };
    };
  };

  func pkcs1V15EncodeSha256(hash : [Nat8], emLen : Nat) : ?[Nat8] {
    let tLen = digestInfoPrefix.size() + hash.size();
    if (emLen < tLen + 3) { return null };
    let psLen = Nat.sub(Nat.sub(emLen, tLen), 3);
    let buf = List.empty<Nat8>();
    buf.add(Nat8.fromNat(0));
    buf.add(Nat8.fromNat(1));
    var ps : Nat = 0;
    while (ps < psLen) {
      buf.add(Nat8.fromNat(0xff));
      ps += 1;
    };
    buf.add(Nat8.fromNat(0));
    for (b in digestInfoPrefix.vals()) { buf.add(b) };
    for (b in hash.vals()) { buf.add(b) };
    ?buf.toArray();
  };

  func base64Decode(input : Text) : [Nat8] {
    let cleaned = input.replace(#text " ", "");
    let chars = cleaned.chars().toArray();
    let out = List.empty<Nat8>();
    var i : Nat = 0;
    while (i < chars.size()) {
      let c1 = chars[i];
      if (c1 == '=') { break };
      let v1 = b64Value(c1);
      i += 1;
      if (i >= chars.size()) { break };
      let c2 = chars[i];
      if (c2 == '=') { break };
      let v2 = b64Value(c2);
      i += 1;
      if (i >= chars.size()) {
        out.add(Nat8.fromNat((v1 * 4) + (v2 / 16)));
        break;
      };
      let c3 = chars[i];
      if (c3 == '=') {
        out.add(Nat8.fromNat((v1 * 4) + (v2 / 16)));
        break;
      };
      let v3 = b64Value(c3);
      i += 1;
      if (i >= chars.size()) {
        out.add(Nat8.fromNat((v1 * 4) + (v2 / 16)));
        out.add(Nat8.fromNat(((v2 % 16) * 16) + (v3 / 4)));
        break;
      };
      let c4 = chars[i];
      if (c4 == '=') {
        out.add(Nat8.fromNat((v1 * 4) + (v2 / 16)));
        out.add(Nat8.fromNat(((v2 % 16) * 16) + (v3 / 4)));
        break;
      };
      let v4 = b64Value(c4);
      i += 1;
      out.add(Nat8.fromNat((v1 * 4) + (v2 / 16)));
      out.add(Nat8.fromNat(((v2 % 16) * 16) + (v3 / 4)));
      out.add(Nat8.fromNat(((v3 % 4) * 64) + v4));
    };
    out.toArray();
  };

  func b64Value(c : Char) : Nat {
    var idx : Nat = 0;
    for (ch in b64Chars.vals()) {
      if (ch == c) { return idx };
      idx += 1;
    };
    0;
  };

  func base64Encode(bytes : [Nat8]) : Text {
    var result = "";
    var i : Nat = 0;
    while (i < bytes.size()) {
      let b1 = bytes[i].toNat();
      let b2 = if (i + 1 < bytes.size()) { bytes[i + 1].toNat() } else { 0 };
      let b3 = if (i + 2 < bytes.size()) { bytes[i + 2].toNat() } else { 0 };
      let n = b1 * 65536 + b2 * 256 + b3;
      result #=
        Text.fromChar(b64Chars[(n / 262144) % 64]) #
        Text.fromChar(b64Chars[(n / 4096) % 64]) #
        (if (i + 1 < bytes.size()) { Text.fromChar(b64Chars[(n / 64) % 64]) } else { "=" }) #
        (if (i + 2 < bytes.size()) { Text.fromChar(b64Chars[n % 64]) } else { "=" });
      i += 3;
    };
    result;
  };

  func modPow(base : Nat, exponent : Nat, modulus : Nat) : Nat {
    var b = base % modulus;
    var e = exponent;
    var r : Nat = 1;
    while (e > 0) {
      if (e % 2 == 1) {
        r := (r * b) % modulus;
      };
      b := (b * b) % modulus;
      e := e / 2;
    };
    r;
  };

  func sha256Bytes(payloadJson : Text) : [Nat8] {
    let digest = Sha256.Digest(#sha256);
    digest.writeBlob(payloadJson.encodeUtf8());
    digest.sum().values().toArray();
  };

  public func signPayloadJson(pem : Text, payloadJson : Text) : SignResult {
    switch (parsePemPrivateKey(pem)) {
      case null { #err("Failed to parse RSA private key PEM") };
      case (?key) {
        let hash = sha256Bytes(payloadJson);
        switch (pkcs1V15EncodeSha256(hash, key.keySize)) {
          case null { #err("PKCS#1 v1.5 encoding failed") };
          case (?encoded) {
            let sigInt = modPow(bytesToNat(encoded), key.d, key.n);
            let sigBytes = natToFixedBytes(sigInt, key.keySize);
            #ok(base64Encode(sigBytes));
          };
        };
      };
    };
  };
};
