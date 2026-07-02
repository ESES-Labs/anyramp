#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contracterror, contractimpl, testutils::{Address as _, Ledger as _}, token, Address,
    Bytes, BytesN, Env,
};

// --- Mock Reclaim verifier: accepts any signature (proof validity is tested separately
//     in reclaim.rs against a real proof). Here we exercise the escrow lifecycle. ---
#[contract]
pub struct MockVerifierOk;
#[contractimpl]
impl MockVerifierOk {
    pub fn verify_proof(_env: Env, _digest: BytesN<32>, _sig: BytesN<64>, _rec: u32) {}
}

// --- Mock verifier that rejects: simulates an invalid witness signature. ---
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MockErr {
    Bad = 1,
}
#[contract]
pub struct MockVerifierBad;
#[contractimpl]
impl MockVerifierBad {
    pub fn verify_proof(_env: Env, _d: BytesN<32>, _s: BytesN<64>, _r: u32) -> Result<(), MockErr> {
        Err(MockErr::Bad)
    }
}

struct Ctx<'a> {
    env: Env,
    client: AnyRampEscrowClient<'a>,
    usdc: token::TokenClient<'a>,
    seller: Address,
    buyer: Address,
}

fn setup(verifier_ok: bool) -> Ctx<'static> {
    setup_cfg(verifier_ok, true)
}

fn setup_cfg(verifier_ok: bool, allow_sandbox: bool) -> Ctx<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);

    // USDC token (Stellar Asset Contract)
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let usdc_addr = sac.address();
    let usdc = token::TokenClient::new(&env, &usdc_addr);
    let usdc_admin = token::StellarAssetClient::new(&env, &usdc_addr);

    // verifier
    let verifier = if verifier_ok {
        env.register(MockVerifierOk, ())
    } else {
        env.register(MockVerifierBad, ())
    };

    let id = env.register(AnyRampEscrow, ());
    let client = AnyRampEscrowClient::new(&env, &id);
    client.initialize(&admin, &usdc_addr, &verifier, &allow_sandbox);

    // fund seller
    usdc_admin.mint(&seller, &1_000);

    Ctx { env, client, usdc, seller, buyer }
}

// Build a Pakasir-shaped Reclaim context blob.
fn context(env: &Env, status: &[u8], amount: &[u8], order_id: &[u8], project: &[u8]) -> Bytes {
    let mut b = Bytes::from_slice(env, b"{\"extractedParameters\":{\"status\":\"");
    b.append(&Bytes::from_slice(env, status));
    b.append(&Bytes::from_slice(env, b"\",\"amount\":\""));
    b.append(&Bytes::from_slice(env, amount));
    b.append(&Bytes::from_slice(env, b"\",\"order_id\":\""));
    b.append(&Bytes::from_slice(env, order_id));
    b.append(&Bytes::from_slice(env, b"\",\"project\":\""));
    b.append(&Bytes::from_slice(env, project));
    b.append(&Bytes::from_slice(env, b"\"},\"providerHash\":\"0xabc\"}"));
    b
}

fn params_with_host(env: &Env) -> Bytes {
    Bytes::from_slice(
        env,
        b"{\"method\":\"GET\",\"url\":\"https://app.pakasir.com/api/transactiondetail\"}",
    )
}

fn sig(env: &Env) -> BytesN<64> {
    BytesN::from_array(env, &[0u8; 64])
}

fn oid(env: &Env, s: &[u8]) -> Bytes {
    Bytes::from_slice(env, s)
}

#[test]
fn happy_path_p2p_release() {
    let c = setup(true);
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");

    // seller locks 100 USDC against a 100_000 IDR intent
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);
    assert_eq!(c.usdc.balance(&c.seller), 900);
    assert_eq!(c.usdc.balance(&c.client.address), 100);

    // buyer submits proof of a completed 150_000 IDR payment (>= expected)
    let ctx = context(&c.env, b"completed", b"150000", b"INV1", b"myproj");
    c.client.fulfill_with_proof(
        &c.buyer,
        &order_id,
        &oid(&c.env, b"http"),
        &params_with_host(&c.env),
        &ctx,
        &oid(&c.env, b"0xowner"),
        &1_700_000_000,
        &1,
        &sig(&c.env),
        &0,
    );

    assert_eq!(c.usdc.balance(&c.buyer), 100);
    assert_eq!(c.usdc.balance(&c.client.address), 0);
    assert_eq!(c.client.get_order(&order_id).unwrap().status, OrderStatus::Fulfilled);
}

#[test]
fn rejects_invalid_signature() {
    let c = setup(false); // verifier rejects
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);

    let ctx = context(&c.env, b"completed", b"150000", b"INV1", b"myproj");
    let res = c.client.try_fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert!(res.is_err());
    // USDC stays locked
    assert_eq!(c.usdc.balance(&c.buyer), 0);
    assert_eq!(c.usdc.balance(&c.client.address), 100);
}

#[test]
fn rejects_amount_too_low() {
    let c = setup(true);
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);

    let ctx = context(&c.env, b"completed", b"50000", b"INV1", b"myproj"); // < expected
    let res = c.client.try_fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert_eq!(res, Err(Ok(Error::AmountTooLow)));
}

#[test]
fn rejects_order_id_mismatch() {
    let c = setup(true);
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);

    // proof is for a different order_id
    let ctx = context(&c.env, b"completed", b"150000", b"OTHER", b"myproj");
    let res = c.client.try_fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert_eq!(res, Err(Ok(Error::OrderMismatch)));
}

#[test]
fn rejects_not_completed() {
    let c = setup(true);
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);

    let ctx = context(&c.env, b"pending", b"150000", b"INV1", b"myproj");
    let res = c.client.try_fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert_eq!(res, Err(Ok(Error::NotCompleted)));
}

#[test]
fn rejects_double_spend() {
    let c = setup(true);
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);
    let ctx = context(&c.env, b"completed", b"150000", b"INV1", b"myproj");
    c.client.fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    // second attempt on the now-Fulfilled order
    let res = c.client.try_fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert_eq!(res, Err(Ok(Error::OrderNotOpen)));
}

#[test]
fn refund_after_expiry() {
    let c = setup(true);
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &1_000);

    // before expiry -> NotExpired
    c.env.ledger().set_timestamp(500);
    assert_eq!(c.client.try_refund(&order_id), Err(Ok(Error::NotExpired)));

    // after expiry -> seller reclaims
    c.env.ledger().set_timestamp(2_000);
    c.client.refund(&order_id);
    assert_eq!(c.usdc.balance(&c.seller), 1_000);
    assert_eq!(c.usdc.balance(&c.client.address), 0);
    assert_eq!(c.client.get_order(&order_id).unwrap().status, OrderStatus::Refunded);
}

#[test]
fn rejects_wrong_provider_host() {
    let c = setup(true);
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);

    let ctx = context(&c.env, b"completed", b"150000", b"INV1", b"myproj");
    let evil_params = Bytes::from_slice(&c.env, b"{\"url\":\"https://evil.example.com/x\"}");
    let res = c.client.try_fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &evil_params, &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert_eq!(res, Err(Ok(Error::WrongProvider)));
}

// A Pakasir-shaped context that also carries the undocumented is_sandbox flag.
fn context_sandbox(env: &Env, is_sandbox: &[u8]) -> Bytes {
    let mut b = Bytes::from_slice(env, b"{\"extractedParameters\":{\"status\":\"completed\",\"amount\":\"150000\",\"order_id\":\"INV1\",\"project\":\"myproj\",\"is_sandbox\":\"");
    b.append(&Bytes::from_slice(env, is_sandbox));
    b.append(&Bytes::from_slice(env, b"\"}}"));
    b
}

#[test]
fn rejects_sandbox_proof_in_production() {
    let c = setup_cfg(true, false); // allow_sandbox = false (production)
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);

    let ctx = context_sandbox(&c.env, b"true");
    let res = c.client.try_fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert_eq!(res, Err(Ok(Error::SandboxNotAllowed)));
    // USDC stays locked
    assert_eq!(c.usdc.balance(&c.client.address), 100);
}

#[test]
fn allows_sandbox_proof_when_enabled() {
    let c = setup_cfg(true, true); // allow_sandbox = true (dev/testnet)
    let order_id = oid(&c.env, b"INV1");
    let project = oid(&c.env, b"myproj");
    c.client.create_order(&c.seller, &order_id, &project, &100, &100_000, &9_999_999_999);

    let ctx = context_sandbox(&c.env, b"true");
    c.client.fulfill_with_proof(
        &c.buyer, &order_id, &oid(&c.env, b"http"), &params_with_host(&c.env), &ctx,
        &oid(&c.env, b"0xowner"), &1_700_000_000, &1, &sig(&c.env), &0,
    );
    assert_eq!(c.usdc.balance(&c.buyer), 100);
    assert_eq!(c.client.get_order(&order_id).unwrap().status, OrderStatus::Fulfilled);
}
