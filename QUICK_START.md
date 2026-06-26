# TipX Quick Start Guide

## Overview
TipX is a modern web3 application for sending XLM (Stellar Lumens) tips on the Stellar blockchain. It supports both Albedo and Freighter wallets.

---

## Getting Started

### 1. **Install a Wallet**
Choose one of the following wallets:

**Option A: Albedo**
- Visit: https://albedo.link
- Install the browser extension
- Create or import your Stellar account

**Option B: Freighter**
- Visit: https://freighter.app
- Install the browser extension
- Create or import your Stellar account

### 2. **Get Testnet XLM** (Optional, for testing)
If you don't have XLM and want to test sending tips:
1. Visit: https://friendbot.stellar.org
2. Enter your Stellar address
3. FriendBot will fund your account with 10 XLM

---

## Using TipX

### Landing Page
1. Visit: `http://localhost:8080`
2. You'll see the beautiful landing page with "Send XLM Tips Effortlessly"
3. Click the **"Sign In"** button (top right corner)

### Connecting Your Wallet
1. A modal appears showing 2 wallet options:
   - 🔵 **Albedo** - Click to connect with Albedo
   - 🟣 **Freighter** - Click to connect with Freighter
2. Choose your wallet
3. Approve the connection in your wallet extension
4. You'll be logged in and taken to the main app

### Main App Tabs

#### **Send Tip** (Default tab)
Send XLM to any Stellar address:
1. **Recipient Address**: Enter a Stellar address (starts with 'G')
2. **Amount**: Enter amount or click quick buttons (1, 5, 10, 25 XLM)
3. **Message** (Optional): Add a note with your tip
4. Click **"Send Tip"**
5. Approve the transaction in your wallet
6. See transaction confirmation with link to view on Stellar Expert

#### **Received**
View all tips you've received:
- Amount received
- Who sent it (shortened address)
- Message if included
- When it was received
- Link to view transaction

#### **History**
View all tips you've sent:
- Amount sent
- Who received it
- Your message if included
- When you sent it
- Link to view transaction

#### **Creator**
Set up your creator profile to receive tips with custom presets:

**Setting Up Your Profile:**
1. Enter your **Name**
2. Add a **Bio** (tell people about yourself)
3. Set **Allowed Tip Amounts** (e.g., "1, 5, 10, 25")
4. Click **"Save Profile"**
5. Profile is now saved and persists forever (for this wallet)

**Share Your Tip Link:**
1. Click **"Generate Tip Link"**
2. Copy the link
3. Share it with your audience
4. Anyone who visits your link will see your profile and custom tip amounts

---

## Key Features

### 🔐 **Secure Wallet Connection**
- All signatures happen in your wallet extension
- TipX never sees your private keys
- Works with testnet and mainnet

### 💾 **Persistent Creator Profiles**
- Your profile is saved to the blockchain
- Same wallet = same profile every time you visit
- Update anytime by editing and saving

### 📤 **Shareable Links**
- Generate unique links for your creator profile
- Share with your audience on social media
- Viewers see your custom tip amounts

### 📊 **Transaction History**
- View all tips sent and received
- See amounts, messages, and timestamps
- Links to verify on Stellar Expert blockchain explorer

### 🎨 **Modern Design**
- Beautiful gradient effects
- Responsive design (works on mobile, tablet, desktop)
- Smooth animations

### ⚡ **Real-time Balance**
- Always see your current XLM balance
- Updates after each transaction
- Shows loading state while fetching

---

## Troubleshooting

### "Wallet not connected"
**Solution**: Make sure your wallet extension is installed and you clicked "Sign In"

### "Freighter not detected"
**Solution**: 
1. Install Freighter from https://freighter.app
2. Refresh the TipX page
3. Try clicking "Connect with Freighter" again

### "Balance not showing"
**Solution**:
1. Make sure your account is funded (use FriendBot if on testnet)
2. Check if your wallet is properly connected
3. Try refreshing the page

### "Transaction failed"
**Common causes:**
- Insufficient balance (need at least 1.5 XLM to send 1 XLM)
- Recipient address is invalid
- Network connectivity issue

**Solution:**
1. Check your balance
2. Make sure recipient address starts with 'G' and is 56 characters
3. Try again

### "Creator profile not saving"
**Solution**:
1. Make sure you're connected to the same wallet
2. Check that all fields are filled
3. Try refreshing the page after saving

---

## FAQ

**Q: What network does TipX use?**
A: TipX currently uses Stellar Testnet for testing. When ready for production, it will use Stellar Mainnet (real XLM).

**Q: Can I send tips to myself?**
A: Yes, you can! This is useful for testing or moving funds between accounts.

**Q: How much does it cost to send a tip?**
A: Only the standard Stellar network fee (~0.00001 XLM). Your 1 XLM tip costs you 1.00001 XLM total.

**Q: Can I cancel a tip?**
A: No, once submitted to the blockchain, transactions cannot be reversed. Always double-check the recipient address!

**Q: Is my data private?**
A: Your profile information (name, bio, tip amounts) is stored in Firebase. Your wallet address and transactions are public on the Stellar blockchain.

**Q: Can I change my creator profile?**
A: Yes! Edit any field and click "Save Profile" again. Changes take effect immediately.

**Q: Can I have multiple creator profiles?**
A: You can have one profile per wallet address. To have multiple profiles, use multiple wallet addresses.

**Q: What if I forget my password?**
A: TipX doesn't have passwords. Your wallet extension manages your private keys. If you forget your wallet password, you'll need to recover it through your wallet extension.

**Q: Can I use TipX on mobile?**
A: TipX is responsive and works on mobile browsers that support wallet extensions (some phones may not support extensions).

---

## Technical Details

**Stellar Testnet:**
- Network: Stellar Test SDF Network ; September 2015
- Horizon API: https://horizon-testnet.stellar.org
- Get free XLM: https://friendbot.stellar.org

**Stellar Mainnet (Production):**
- Network: Stellar Public Global Stellar Network
- Horizon API: https://horizon.stellar.org
- Real XLM required

**Supported Wallets:**
- Albedo (https://albedo.link)
- Freighter (https://freighter.app)

---

## Privacy & Security

### What TipX Stores:
- Creator profiles (name, bio, tip amounts)
- Transaction history (who sent to whom, amounts)

### What TipX Does NOT Store:
- Private keys (managed by wallet extension)
- Passwords (none required)
- Personal identification

### Security Measures:
- All transactions signed by your wallet
- Firebase Firestore with security rules
- No sensitive data stored locally
- No tracking or analytics

---

## Support

If you encounter issues:
1. Check this guide first
2. Make sure your wallet extension is installed
3. Try refreshing the page
4. Clear your browser cache
5. Try a different browser

---

Happy tipping! 💛

Last Updated: April 26, 2026
