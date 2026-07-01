//! Minimal `no_std` extractor for Reclaim `context.extractedParameters`.
//!
//! Reclaim always emits captured regex groups as JSON *strings*, e.g.
//!   {"extractedParameters":{"status":"completed","amount":"22000","order_id":"INV1"}, ...}
//! so every value we need can be read as the text between `"key":"` and the next `"`.
//!
//! This is a tiny purpose-built scanner (not a general JSON parser) — enough to pull
//! the exact fields our escrow constrains, and cheap in Soroban.

use soroban_sdk::{Bytes, Env};

/// Naive substring search over `Bytes`. Returns start index of `needle` or None.
fn find(hay: &Bytes, needle: &[u8]) -> Option<u32> {
    let hlen = hay.len();
    let nlen = needle.len() as u32;
    if nlen == 0 || nlen > hlen {
        return None;
    }
    let mut i = 0u32;
    while i + nlen <= hlen {
        let mut j = 0u32;
        while j < nlen && hay.get(i + j).unwrap() == needle[j as usize] {
            j += 1;
        }
        if j == nlen {
            return Some(i);
        }
        i += 1;
    }
    None
}

/// Extract the string value of `key` from an `extractedParameters`-style JSON blob.
/// Matches the pattern `"<key>":"<value>"` and returns `<value>` as Bytes.
pub fn extract_param(env: &Env, blob: &Bytes, key: &[u8]) -> Option<Bytes> {
    // Build the needle: "<key>":"
    let mut needle = Bytes::from_slice(env, b"\"");
    needle.append(&Bytes::from_slice(env, key));
    needle.append(&Bytes::from_slice(env, b"\":\""));

    // find() takes &[u8]; copy needle into a fixed scan via manual compare.
    let start = find_bytes(blob, &needle)?;
    let val_start = start + needle.len();
    // read until the closing quote
    let mut end = val_start;
    while end < blob.len() && blob.get(end).unwrap() != b'"' {
        end += 1;
    }
    if end > blob.len() {
        return None;
    }
    Some(blob.slice(val_start..end))
}

/// Substring search where the needle is itself a `Bytes`.
pub fn find_bytes(hay: &Bytes, needle: &Bytes) -> Option<u32> {
    let hlen = hay.len();
    let nlen = needle.len();
    if nlen == 0 || nlen > hlen {
        return None;
    }
    let mut i = 0u32;
    while i + nlen <= hlen {
        let mut j = 0u32;
        while j < nlen && hay.get(i + j).unwrap() == needle.get(j).unwrap() {
            j += 1;
        }
        if j == nlen {
            return Some(i);
        }
        i += 1;
    }
    None
}

/// Parse ASCII decimal Bytes into u64. Returns None on any non-digit.
pub fn parse_u64(b: &Bytes) -> Option<u64> {
    if b.len() == 0 {
        return None;
    }
    let mut n: u64 = 0;
    for i in 0..b.len() {
        let c = b.get(i).unwrap();
        if !(b'0'..=b'9').contains(&c) {
            return None;
        }
        n = n.checked_mul(10)?.checked_add((c - b'0') as u64)?;
    }
    Some(n)
}

/// Case-sensitive equality between a `Bytes` and a byte literal.
pub fn bytes_eq(b: &Bytes, lit: &[u8]) -> bool {
    if b.len() != lit.len() as u32 {
        return false;
    }
    for i in 0..b.len() {
        if b.get(i).unwrap() != lit[i as usize] {
            return false;
        }
    }
    true
}

// Silence unused warning for the &[u8] variant kept for readability.
#[allow(dead_code)]
fn _touch(hay: &Bytes) -> Option<u32> {
    find(hay, b"")
}

#[cfg(test)]
mod parse_tests {
    use super::*;

    fn hb(env: &Env, hex: &str) -> Bytes {
        fn nib(c: u8) -> u8 {
            match c {
                b'0'..=b'9' => c - b'0',
                b'a'..=b'f' => c - b'a' + 10,
                _ => panic!("bad hex"),
            }
        }
        let s = hex.as_bytes();
        let mut out = Bytes::new(env);
        let mut i = 0;
        while i < s.len() {
            out.push_back((nib(s[i]) << 4) | nib(s[i + 1]));
            i += 2;
        }
        out
    }

    // Real proof context: {"extractedParameters":{"price":"0.17778"},"providerHash":"0x53da..."}
    const CONTEXT_HEX: &str = "7b22657874726163746564506172616d6574657273223a7b227072696365223a22302e3137373738227d2c2270726f766964657248617368223a22307835336461323830623362346435633031383630626366383461653662346561366263333637616335393835316162663037356231616231323265656630316366227d";

    #[test]
    fn extracts_value_from_real_context() {
        let env = Env::default();
        let ctx = hb(&env, CONTEXT_HEX);
        let price = extract_param(&env, &ctx, b"price").unwrap();
        assert!(bytes_eq(&price, b"0.17778"));
    }

    #[test]
    fn missing_key_returns_none() {
        let env = Env::default();
        let ctx = hb(&env, CONTEXT_HEX);
        assert!(extract_param(&env, &ctx, b"status").is_none());
    }

    #[test]
    fn parses_amount_string() {
        let env = Env::default();
        // simulate a Pakasir-style extractedParameters blob
        let blob = Bytes::from_slice(
            &env,
            b"{\"extractedParameters\":{\"status\":\"completed\",\"amount\":\"22000\",\"order_id\":\"INV1\"}}",
        );
        let status = extract_param(&env, &blob, b"status").unwrap();
        let amount = extract_param(&env, &blob, b"amount").unwrap();
        let order = extract_param(&env, &blob, b"order_id").unwrap();
        assert!(bytes_eq(&status, b"completed"));
        assert_eq!(parse_u64(&amount).unwrap(), 22000);
        assert!(bytes_eq(&order, b"INV1"));
    }
}
