#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Vec,
};

// Data structure for one tip entry stored on chain
#[contracttype]
#[derive(Clone)]
pub struct TipEntry {
    pub sender: Address,
    pub amount: i128,        // in stroops (1 XLM = 10_000_000 stroops)
    pub message: String,
    pub timestamp: u64,
}

#[contract]
pub struct TipXContract;

#[contractimpl]
impl TipXContract {

    /// Log a tip on-chain. Called from frontend after successful XLM payment.
    /// sender: the tipper's Stellar address
    /// amount: tip amount in stroops (multiply XLM by 10_000_000)
    /// message: optional message from tipper
    pub fn log_tip(env: Env, sender: Address, amount: i128, message: String) {
        // Require the sender to authorize this call
        sender.require_auth();

        // Create the tip entry
        let tip = TipEntry {
            sender: sender.clone(),
            amount,
            message,
            timestamp: env.ledger().timestamp(),
        };

        // Load existing tips or create empty vec
        let mut tips: Vec<TipEntry> = env
            .storage()
            .persistent()
            .get(&symbol_short!("TIPS"))
            .unwrap_or(Vec::new(&env));

        // Add new tip to the list
        tips.push_back(tip);

        // Store updated tips list (90 day TTL)
        env.storage()
            .persistent()
            .set(&symbol_short!("TIPS"), &tips);

        env.storage()
            .persistent()
            .extend_ttl(&symbol_short!("TIPS"), 0, 6480000);

        // Update running total
        let current_total: i128 = env
            .storage()
            .persistent()
            .get(&symbol_short!("TOTAL"))
            .unwrap_or(0i128);

        let new_total = current_total + amount;
        env.storage()
            .persistent()
            .set(&symbol_short!("TOTAL"), &new_total);
    }

    /// Get all logged tips
    pub fn get_tips(env: Env) -> Vec<TipEntry> {
        env.storage()
            .persistent()
            .get(&symbol_short!("TIPS"))
            .unwrap_or(Vec::new(&env))
    }

    /// Get total amount tipped (in stroops)
    pub fn get_total(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&symbol_short!("TOTAL"))
            .unwrap_or(0i128)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    fn setup<'a>() -> (Env, TipXContractClient<'a>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, TipXContract);
        let client = TipXContractClient::new(&env, &contract_id);
        (env, client)
    }

    #[test]
    fn test_initial_state_is_empty() {
        let (_env, client) = setup();
        assert_eq!(client.get_total(), 0i128);
        assert_eq!(client.get_tips().len(), 0);
    }

    #[test]
    fn test_log_single_tip() {
        let (env, client) = setup();
        let sender = Address::generate(&env);

        client.log_tip(&sender, &50_000_000i128, &String::from_str(&env, "great work!"));

        assert_eq!(client.get_total(), 50_000_000i128);

        let tips = client.get_tips();
        assert_eq!(tips.len(), 1);

        let tip = tips.get(0).unwrap();
        assert_eq!(tip.sender, sender);
        assert_eq!(tip.amount, 50_000_000i128);
        assert_eq!(tip.message, String::from_str(&env, "great work!"));
    }

    #[test]
    fn test_multiple_tips_accumulate_total() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.log_tip(&alice, &10_000_000i128, &String::from_str(&env, "tip 1"));
        client.log_tip(&bob, &25_000_000i128, &String::from_str(&env, "tip 2"));
        client.log_tip(&alice, &5_000_000i128, &String::from_str(&env, "tip 3"));

        assert_eq!(client.get_tips().len(), 3);
        assert_eq!(client.get_total(), 40_000_000i128);
    }

    #[test]
    fn test_tip_records_sender_authorization() {
        let (env, client) = setup();
        let sender = Address::generate(&env);

        client.log_tip(&sender, &1_000_000i128, &String::from_str(&env, "hi"));

        // mock_all_auths records the authorization required for the sender
        let auths = env.auths();
        assert_eq!(auths.len(), 1);
        assert_eq!(auths.get(0).unwrap().0, sender);
    }
}
