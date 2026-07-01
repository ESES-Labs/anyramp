#![no_std]
//! AnyRamp P2P escrow: seller locks USDC against a fiat (IDR) intent; buyer pays the
//! seller via Pakasir, then submits a Reclaim zkTLS proof that the payment completed.
//! The contract reconstructs & verifies the proof on-chain, then releases USDC to the
//! buyer. The seller keeps the IDR (received off-chain). No backend trust required.

mod parse;
mod reclaim;

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Bytes,
    BytesN, Env, IntoVal, Symbol, Val, Vec,
};

const CONFIG: Symbol = symbol_short!("CONFIG");

/// Host that must appear in the proof's request `parameters` (anti provider-swap).
const PAKASIR_HOST: &[u8] = b"app.pakasir.com";

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    OrderExists = 3,
    OrderNotFound = 4,
    OrderNotOpen = 5,
    BadProof = 6,
    NotCompleted = 7,
    AmountTooLow = 8,
    OrderMismatch = 9,
    ProjectMismatch = 10,
    WrongProvider = 11,
    NotExpired = 12,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OrderStatus {
    Open,
    Fulfilled,
    Refunded,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin: Address,
    pub usdc: Address,
    pub verifier: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct Order {
    pub seller: Address,
    pub usdc_amount: i128,
    pub expected_idr: u64,
    pub project: Bytes,
    pub order_id: Bytes,
    pub expiry: u64,
    pub status: OrderStatus,
}

#[contracttype]
enum DataKey {
    Order(Bytes),
}

fn read_config(env: &Env) -> Result<Config, Error> {
    env.storage()
        .instance()
        .get(&CONFIG)
        .ok_or(Error::NotInitialized)
}

fn read_order(env: &Env, order_id: &Bytes) -> Option<Order> {
    env.storage()
        .persistent()
        .get(&DataKey::Order(order_id.clone()))
}

fn write_order(env: &Env, order: &Order) {
    env.storage()
        .persistent()
        .set(&DataKey::Order(order.order_id.clone()), order);
}

#[contract]
pub struct AnyRampEscrow;

#[contractimpl]
impl AnyRampEscrow {
    /// One-time setup. `verifier` = deployed Reclaim verifier contract.
    pub fn initialize(env: Env, admin: Address, usdc: Address, verifier: Address) -> Result<(), Error> {
        if env.storage().instance().has(&CONFIG) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage()
            .instance()
            .set(&CONFIG, &Config { admin, usdc, verifier });
        Ok(())
    }

    /// Seller opens an intent and locks `usdc_amount` USDC into escrow.
    /// The order is keyed by the Pakasir `order_id` the buyer will pay against.
    pub fn create_order(
        env: Env,
        seller: Address,
        order_id: Bytes,
        project: Bytes,
        usdc_amount: i128,
        expected_idr: u64,
        expiry: u64,
    ) -> Result<(), Error> {
        seller.require_auth();
        let cfg = read_config(&env)?;

        if read_order(&env, &order_id).is_some() {
            return Err(Error::OrderExists);
        }

        // Pull USDC from seller into the contract.
        let usdc = token::TokenClient::new(&env, &cfg.usdc);
        usdc.transfer(&seller, &env.current_contract_address(), &usdc_amount);

        let order = Order {
            seller,
            usdc_amount,
            expected_idr,
            project,
            order_id,
            expiry,
            status: OrderStatus::Open,
        };
        write_order(&env, &order);
        Ok(())
    }

    /// Buyer submits the Reclaim zkTLS proof of their Pakasir payment and, if valid,
    /// receives the locked USDC. Buyer authorizes (and pays gas) — fully trustless.
    #[allow(clippy::too_many_arguments)]
    pub fn fulfill_with_proof(
        env: Env,
        buyer: Address,
        order_id: Bytes,
        // Reclaim claim parts:
        provider: Bytes,
        parameters: Bytes,
        context: Bytes,
        owner: Bytes,
        timestamp: u64,
        epoch: u64,
        signature: BytesN<64>,
        recovery_id: u32,
    ) -> Result<(), Error> {
        buyer.require_auth();
        let cfg = read_config(&env)?;

        let mut order = read_order(&env, &order_id).ok_or(Error::OrderNotFound)?;
        if order.status != OrderStatus::Open {
            return Err(Error::OrderNotOpen);
        }

        // 1. Reconstruct the exact Reclaim digest from the raw claim parts.
        let digest = reclaim::build_digest(
            &env, &provider, &parameters, &context, &owner, timestamp, epoch,
        );

        // 2. Verify the witness signature on-chain via the deployed Reclaim verifier.
        //    A forged digest/signature traps the whole transaction here.
        let args: Vec<Val> = (digest, signature, recovery_id).into_val(&env);
        env.invoke_contract::<()>(&cfg.verifier, &Symbol::new(&env, "verify_proof"), args);

        // 3. The proof is authentic. Now bind the proven values from `context`.
        let proven_status = parse::extract_param(&env, &context, b"status").ok_or(Error::BadProof)?;
        let proven_amount = parse::extract_param(&env, &context, b"amount").ok_or(Error::BadProof)?;
        let proven_order = parse::extract_param(&env, &context, b"order_id").ok_or(Error::BadProof)?;
        let proven_project = parse::extract_param(&env, &context, b"project").ok_or(Error::BadProof)?;
        let amount = parse::parse_u64(&proven_amount).ok_or(Error::BadProof)?;

        // 4. Business constraints.
        if !parse::bytes_eq(&proven_status, b"completed") {
            return Err(Error::NotCompleted);
        }
        if amount < order.expected_idr {
            return Err(Error::AmountTooLow);
        }
        if proven_order != order_id {
            return Err(Error::OrderMismatch);
        }
        if proven_project != order.project {
            return Err(Error::ProjectMismatch);
        }
        if parse::find_bytes(&parameters, &Bytes::from_slice(&env, PAKASIR_HOST)).is_none() {
            return Err(Error::WrongProvider);
        }

        // 5. Release USDC to the buyer. Order status flip prevents double-spend.
        order.status = OrderStatus::Fulfilled;
        write_order(&env, &order);
        let usdc = token::TokenClient::new(&env, &cfg.usdc);
        usdc.transfer(&env.current_contract_address(), &buyer, &order.usdc_amount);
        Ok(())
    }

    /// Seller reclaims locked USDC after expiry if the order was never fulfilled.
    pub fn refund(env: Env, order_id: Bytes) -> Result<(), Error> {
        let cfg = read_config(&env)?;
        let mut order = read_order(&env, &order_id).ok_or(Error::OrderNotFound)?;
        order.seller.require_auth();

        if order.status != OrderStatus::Open {
            return Err(Error::OrderNotOpen);
        }
        if env.ledger().timestamp() < order.expiry {
            return Err(Error::NotExpired);
        }

        order.status = OrderStatus::Refunded;
        write_order(&env, &order);
        let usdc = token::TokenClient::new(&env, &cfg.usdc);
        usdc.transfer(&env.current_contract_address(), &order.seller, &order.usdc_amount);
        Ok(())
    }

    pub fn get_order(env: Env, order_id: Bytes) -> Option<Order> {
        read_order(&env, &order_id)
    }
}

mod test;
