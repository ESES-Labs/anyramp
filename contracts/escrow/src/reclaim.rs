//! On-chain reconstruction of the Reclaim zkTLS claim digest.
//!
//! The deployed Reclaim verifier only checks a witness secp256k1 signature over a
//! `message_digest` that is passed in from outside. It does NOT bind that digest to
//! the actual claim fields. For a financial app that is not enough: a caller could
//! submit a valid signature but a forged `context` (e.g. inflated amount).
//!
//! Therefore this contract reconstructs the digest itself from the raw claim parts,
//! exactly the way the Reclaim attestor produced it, and only then hands the digest
//! to the verifier. If our reconstruction matches the signed digest, the extracted
//! parameters inside `context` are cryptographically attested.
//!
//! Digest construction (verified against a real proof, see tests):
//!   identifier = keccak256( provider ++ "\n" ++ parameters ++ "\n" ++ context )
//!   serialized = hex0x(identifier) ++ "\n" ++ owner ++ "\n" ++ dec(timestamp) ++ "\n" ++ dec(epoch)
//!   digest     = keccak256( "\x19Ethereum Signed Message:\n" ++ dec(len(serialized)) ++ serialized )

use soroban_sdk::{Bytes, BytesN, Env};

fn keccak(env: &Env, b: &Bytes) -> BytesN<32> {
    env.crypto().keccak256(b).into()
}

/// Lowercase "0x"-prefixed hex encoding of a 32-byte hash, as ASCII bytes (66 bytes).
fn hex_0x(env: &Env, h: &BytesN<32>) -> Bytes {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = Bytes::from_slice(env, b"0x");
    let arr = h.to_array();
    for byte in arr.iter() {
        out.push_back(HEX[(byte >> 4) as usize]);
        out.push_back(HEX[(byte & 0x0f) as usize]);
    }
    out
}

/// Decimal ASCII representation of an unsigned integer.
fn dec(env: &Env, mut n: u64) -> Bytes {
    if n == 0 {
        return Bytes::from_slice(env, b"0");
    }
    let mut buf = [0u8; 20];
    let mut i = 20;
    while n > 0 {
        i -= 1;
        buf[i] = b'0' + (n % 10) as u8;
        n /= 10;
    }
    Bytes::from_slice(env, &buf[i..])
}

/// Reconstruct the Reclaim message digest from the raw claim parts.
///
/// `provider`, `parameters`, `context`, `owner` are the exact byte strings from
/// `claimData`; `timestamp` = `timestampS`; `epoch` = `claimData.epoch`.
pub fn build_digest(
    env: &Env,
    provider: &Bytes,
    parameters: &Bytes,
    context: &Bytes,
    owner: &Bytes,
    timestamp: u64,
    epoch: u64,
) -> BytesN<32> {
    // claimInfo = provider \n parameters \n context
    let mut ci = provider.clone();
    ci.push_back(b'\n');
    ci.append(parameters);
    ci.push_back(b'\n');
    ci.append(context);
    let identifier = keccak(env, &ci);

    // serialized = hex0x(identifier) \n owner \n dec(timestamp) \n dec(epoch)
    let mut s = hex_0x(env, &identifier);
    s.push_back(b'\n');
    s.append(owner);
    s.push_back(b'\n');
    s.append(&dec(env, timestamp));
    s.push_back(b'\n');
    s.append(&dec(env, epoch));

    // prefixed = \x19Ethereum Signed Message:\n + dec(len) + serialized
    let mut p = Bytes::from_slice(env, b"\x19Ethereum Signed Message:\n");
    p.append(&dec(env, s.len() as u64));
    p.append(&s);

    keccak(env, &p)
}

/// Also expose the identifier alone (useful for tests / nullifier keying).
pub fn compute_identifier(env: &Env, provider: &Bytes, parameters: &Bytes, context: &Bytes) -> BytesN<32> {
    let mut ci = provider.clone();
    ci.push_back(b'\n');
    ci.append(parameters);
    ci.push_back(b'\n');
    ci.append(context);
    keccak(env, &ci)
}

#[cfg(test)]
mod digest_tests {
    use super::*;

    fn nibble(c: u8) -> u8 {
        match c {
            b'0'..=b'9' => c - b'0',
            b'a'..=b'f' => c - b'a' + 10,
            b'A'..=b'F' => c - b'A' + 10,
            _ => panic!("bad hex"),
        }
    }

    fn hb(env: &Env, hex: &str) -> Bytes {
        let bytes = hex.as_bytes();
        let mut out = Bytes::new(env);
        let mut i = 0;
        while i < bytes.len() {
            out.push_back((nibble(bytes[i]) << 4) | nibble(bytes[i + 1]));
            i += 2;
        }
        out
    }

    fn hb32(env: &Env, hex: &str) -> BytesN<32> {
        let h = hex.strip_prefix("0x").unwrap_or(hex);
        let b = hb(env, h);
        let mut arr = [0u8; 32];
        for i in 0..32 {
            arr[i] = b.get(i as u32).unwrap();
        }
        BytesN::from_array(env, &arr)
    }

    // Ground-truth vectors dumped from a real Reclaim proof (coingecko/stellar price).
    const PROVIDER: &str = "68747470"; // "http"
    const PARAMS_HEX: &str = "7b22626f6479223a22222c226d6574686f64223a22474554222c22726573706f6e73654d617463686573223a5b7b2274797065223a227265676578222c2276616c7565223a225c5c7b5c227374656c6c61725c223a5c5c7b5c227573645c223a283f3c70726963653e5b5c5c645c5c2e5d2b295c5c7d5c5c7d227d5d2c22726573706f6e7365526564616374696f6e73223a5b5d2c2275726c223a2268747470733a2f2f6170692e636f696e6765636b6f2e636f6d2f6170692f76332f73696d706c652f70726963653f6964733d7374656c6c61722676735f63757272656e636965733d757364227d";
    const CONTEXT_HEX: &str = "7b22657874726163746564506172616d6574657273223a7b227072696365223a22302e3137373738227d2c2270726f766964657248617368223a22307835336461323830623362346435633031383630626366383461653662346561366263333637616335393835316162663037356231616231323265656630316366227d";
    const OWNER: &str = "307833383139393464366239623038633365376366653361346364353434633835313031623866323031"; // "0x381994...f201"
    const EXPECTED_IDENTIFIER: &str = "0x25bb9032b97853d3c70ae7b771674bac0adc5de34ff3a9184fcb7c44b2af58a6";
    const EXPECTED_DIGEST: &str = "0x7dae683ad8d6692ce3f614e0711f0960529729e32b46f0454f2cb57cddd3b15c";

    #[test]
    fn identifier_matches_real_proof() {
        let env = Env::default();
        let id = compute_identifier(&env, &hb(&env, PROVIDER), &hb(&env, PARAMS_HEX), &hb(&env, CONTEXT_HEX));
        assert_eq!(id, hb32(&env, EXPECTED_IDENTIFIER));
    }

    #[test]
    fn digest_matches_real_proof() {
        let env = Env::default();
        let digest = build_digest(
            &env,
            &hb(&env, PROVIDER),
            &hb(&env, PARAMS_HEX),
            &hb(&env, CONTEXT_HEX),
            &hb(&env, OWNER),
            1770196240,
            1,
        );
        assert_eq!(digest, hb32(&env, EXPECTED_DIGEST));
    }
}
