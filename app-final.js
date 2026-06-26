const { useState, useEffect } = React;
const StellarSdk = window.StellarSdk || {};
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Deployed Soroban contract ID (TipX smart contract on Stellar Testnet)
const CONTRACT_ID = 'CAN7F5MOB2EA2LFARTU64JJ2BADTDGBXIV4Z6JFKLPJU2E75OPZTAZ57';

// TipX Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYl5N0rD8jq88cx_ZjszBRTFuktIC5Wkk",
  authDomain: "tipx-98b52.firebaseapp.com",
  projectId: "tipx-98b52",
  storageBucket: "tipx-98b52.firebasestorage.app",
  messagingSenderId: "1075389518388",
  appId: "1:1075389518388:web:6c32037824357899207061",
  measurementId: "G-827C3TMNG4"
};

let db = null, auth = null;
try {
  if (!window.firebase?.apps?.length) window.firebase.initializeApp(firebaseConfig);
  db = window.firebase.firestore();
  auth = window.firebase.auth();
} catch (err) { console.error('Firebase init error:', err); }

const shortenAddress = (a) => a ? a.substring(0, 4) + '...' + a.substring(a.length - 4) : '';
const timeAgo = (timestamp) => {
  if (!timestamp) return 'just now';
  const now = new Date();
  const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((now - time) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return time.toLocaleDateString();
};
const copyToClipboard = (t) => { try { navigator.clipboard.writeText(t); } catch (e) { } };

const App = () => {
  // Auth
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userName, setUserName] = useState('');
  // Wallet
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [accountFunded, setAccountFunded] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  // Nav & data
  const [activeTab, setActiveTab] = useState('send-tip');
  const [history, setHistory] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  // Send tip
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [txResult, setTxResult] = useState(null);
  // Creator profile from ?to= or /@username
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [defaultAmounts] = useState([1, 5, 10, 25]);
  const [creatorAmounts, setCreatorAmounts] = useState(null);
  const [creatorNotFound, setCreatorNotFound] = useState(null);
  // Generate link
  const [genUsername, setGenUsername] = useState('');
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');
  const [genSaving, setGenSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [walletLink, setWalletLink] = useState('');
  const [showGenLink, setShowGenLink] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  // Auth listener — use SESSION persistence so each tab is independent
  useEffect(() => {
    if (!auth) { setAuthChecked(true); return; }
    // Safety net: never let the UI hang on the loader if Firebase is slow/unreachable
    const authTimeout = setTimeout(() => setAuthChecked(true), 2500);
    // SESSION = per-tab (sessionStorage), not shared across tabs
    auth.setPersistence(window.firebase.auth.Auth.Persistence.SESSION).then(() => {
      const unsub = auth.onAuthStateChanged(async (user) => {
        if (user) {
          setAuthUser(user);
          if (db) {
            try {
              const p = db.collection('users').doc(user.uid).get();
              const t = new Promise((_, r) => setTimeout(() => r('timeout'), 5000));
              const d = await Promise.race([p, t]);
              if (d.exists) setUserName(d.data().name || '');
            } catch (e) { console.warn('Name fetch failed'); }
          }
        } else { setAuthUser(null); setUserName(''); }
        clearTimeout(authTimeout);
        setAuthChecked(true);
      });
      return () => unsub();
    }).catch(() => { clearTimeout(authTimeout); setAuthChecked(true); });
  }, []);

  // Handle /@username route AND ?to= param on page load
  useEffect(() => {
    const pathName = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const toW = params.get('to') || params.get('creator');
    const isUserRoute = pathName.startsWith('/@');

    if (!isUserRoute && !toW) return;
    setActiveTab('send-tip');

    const go = async () => {
      let att = 0;
      while (!db && att < 10) { await new Promise(r => setTimeout(r, 200)); att++; }

      if (isUserRoute) {
        // /@username route
        const uname = pathName.slice(2).toLowerCase();
        if (!db) { setCreatorNotFound('@' + uname); return; }
        try {
          const udoc = await Promise.race([db.collection('usernames').doc(uname).get(), new Promise((_, r) => setTimeout(() => r('t'), 8000))]);
          if (udoc.exists) {
            const wallet = udoc.data().wallet;
            setRecipientAddress(wallet);
            const cdoc = await Promise.race([db.collection('creators').doc(wallet).get(), new Promise((_, r) => setTimeout(() => r('t'), 8000))]);
            if (cdoc.exists) {
              const d = cdoc.data();
              setCreatorProfile({ name: d.name, bio: d.bio, username: d.username || uname, wallet });
              if (d.allowedAmounts?.length > 0) setCreatorAmounts(d.allowedAmounts);
            } else { setCreatorProfile({ username: uname, wallet }); }
          } else { setCreatorNotFound('@' + uname); }
        } catch (e) { setCreatorNotFound('@' + uname); }
      } else if (toW) {
        // ?to=WALLET fallback
        setRecipientAddress(toW);
        if (!db) { setCreatorProfile({ wallet: toW }); return; }
        try {
          const doc = await Promise.race([db.collection('creators').doc(toW.trim().toUpperCase()).get(), new Promise((_, r) => setTimeout(() => r('t'), 8000))]);
          if (doc.exists) {
            const d = doc.data();
            setCreatorProfile({ name: d.name, bio: d.bio, username: d.username, wallet: toW });
            if (d.allowedAmounts?.length > 0) setCreatorAmounts(d.allowedAmounts);
          } else { setCreatorProfile({ wallet: toW }); }
        } catch (e) { setCreatorProfile({ wallet: toW }); }
      }
    };
    go();
  }, []);

  // Restore wallet from session
  useEffect(() => {
    try {
      const sw = sessionStorage.getItem('tipx_wallet');
      const st = sessionStorage.getItem('tipx_walletType');
      if (sw) { setWalletAddress(sw.toUpperCase()); setWalletType(st); fetchBalance(sw); }
    } catch (e) { }
  }, []);

  // Auth handlers
  const handleSignUp = async () => {
    setAuthError('');
    if (!authName.trim()) return setAuthError('Enter your name');
    if (!authEmail.trim()) return setAuthError('Enter your email');
    if (authPassword.length < 6) return setAuthError('Password must be 6+ characters');
    if (authPassword !== authConfirm) return setAuthError('Passwords do not match');
    setAuthLoading(true);
    try {
      const cred = await auth.createUserWithEmailAndPassword(authEmail, authPassword);
      if (db) {
        try {
          const sp = db.collection('users').doc(cred.user.uid).set({ name: authName, email: authEmail, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
          await Promise.race([sp, new Promise((_, r) => setTimeout(() => r('t'), 8000))]);
        } catch (e) { }
      }
      setUserName(authName);
    } catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleSignIn = async () => {
    setAuthError('');
    if (!authEmail.trim()) return setAuthError('Enter your email');
    if (!authPassword.trim()) return setAuthError('Enter your password');
    setAuthLoading(true);
    try { await auth.signInWithEmailAndPassword(authEmail, authPassword); }
    catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleSignOut = () => {
    if (auth) auth.signOut();
    setWalletAddress(null); setWalletType(null); setBalance(null);
    setTxResult(null); setAuthUser(null); setUserName('');
    try { sessionStorage.removeItem('tipx_wallet'); sessionStorage.removeItem('tipx_walletType'); } catch { }
  };

  // Balance
  const fetchBalance = async (address) => {
    setBalanceLoading(true);
    try {
      if (!StellarSdk.Server) throw new Error('SDK not loaded');
      const server = new StellarSdk.Server(HORIZON_URL);
      const account = await server.loadAccount(address);
      const xlm = account.balances.find(b => b.asset_type === 'native');
      setBalance(parseFloat(xlm?.balance || 0).toFixed(2));
      setAccountFunded(true);
    } catch (err) {
      if (err.response?.status === 404) { setBalance('0.00'); setAccountFunded(false); }
      else setTxResult({ success: false, error: 'Balance fetch failed: ' + err.message });
    } finally { setBalanceLoading(false); }
  };

  // Wallet connections
  const connectFreighter = async () => {
    try {
      // Wait for CDN to load
      if (!window.freighterApi) await new Promise(r => setTimeout(r, 1500));
      if (!window.freighterApi) {
        return setTxResult({ success: false, error: 'Freighter API not loaded. Install extension from freighter.app and refresh.' });
      }

      let pk = null;

      // Method 1: requestAccess (modern @stellar/freighter-api v2+)
      if (!pk && typeof window.freighterApi.requestAccess === 'function') {
        try {
          console.log('Trying requestAccess...');
          const result = await window.freighterApi.requestAccess();
          if (typeof result === 'string' && result.startsWith('G')) pk = result;
          else if (result?.address) pk = result.address;
          console.log('requestAccess result:', result, '-> pk:', pk);
        } catch (e) { console.warn('requestAccess failed:', e.message); }
      }

      // Method 2: getAddress (some versions)
      if (!pk && typeof window.freighterApi.getAddress === 'function') {
        try {
          console.log('Trying getAddress...');
          const result = await window.freighterApi.getAddress();
          if (typeof result === 'string' && result.startsWith('G')) pk = result;
          else if (result?.address) pk = result.address;
          console.log('getAddress result:', result, '-> pk:', pk);
        } catch (e) { console.warn('getAddress failed:', e.message); }
      }

      // Method 3: getPublicKey (legacy)
      if (!pk && typeof window.freighterApi.getPublicKey === 'function') {
        try {
          console.log('Trying getPublicKey...');
          const result = await window.freighterApi.getPublicKey();
          if (typeof result === 'string' && result.startsWith('G')) pk = result;
          else if (result?.publicKey) pk = result.publicKey;
          console.log('getPublicKey result:', result, '-> pk:', pk);
        } catch (e) { console.warn('getPublicKey failed:', e.message); }
      }

      if (!pk || !pk.startsWith('G') || pk.length !== 56) {
        return setTxResult({ success: false, error: 'Could not connect to Freighter. Make sure you are logged in, the extension is unlocked, and you approve the connection.' });
      }

      console.log('Freighter connected:', pk);
      setWalletAddress(pk); setWalletType('freighter');
      try { sessionStorage.setItem('tipx_wallet', pk); sessionStorage.setItem('tipx_walletType', 'freighter'); } catch { }
      await fetchBalance(pk); setTxResult(null); setShowWalletModal(false);
    } catch (err) { setTxResult({ success: false, error: 'Freighter error: ' + (err.message || err) }); }
  };

  const connectAlbedo = async () => {
    try {
      if (!window.albedo) return setTxResult({ success: false, error: 'Albedo not available.' });
      const result = await window.albedo.publicKey({});
      setWalletAddress(result.pubkey); setWalletType('albedo');
      try { sessionStorage.setItem('tipx_wallet', result.pubkey); sessionStorage.setItem('tipx_walletType', 'albedo'); } catch { }
      await fetchBalance(result.pubkey); setTxResult(null); setShowWalletModal(false);
    } catch (err) { setTxResult({ success: false, error: 'Albedo failed: ' + err.message }); }
  };

  const disconnectWallet = () => {
    setWalletAddress(null); setWalletType(null); setBalance(null); setTxResult(null);
    try { sessionStorage.removeItem('tipx_wallet'); sessionStorage.removeItem('tipx_walletType'); } catch { }
  };

  // History
  const loadOnChainHistory = async (address) => {
    if (!address) return;
    setTipsLoading(true); setHistory([]);
    try {
      const server = new StellarSdk.Server(HORIZON_URL);
      const payments = await server.payments().forAccount(address).order('desc').limit(50).call();
      const filtered = payments.records.filter(r => r.type === 'payment' && r.asset_type === 'native');
      // Fetch memo for each payment by loading its parent transaction
      const withMemos = await Promise.all(filtered.map(async (r) => {
        let message = '';
        try {
          const tx = await r.transaction();
          if (tx.memo_type === 'text' && tx.memo) message = tx.memo;
        } catch(e) { /* ignore memo fetch failures */ }
        return {
          id: r.id, type: r.to === address ? 'received' : 'sent', amount: r.amount,
          counterparty: r.to === address ? r.from : r.to, timestamp: r.created_at,
          txHash: r.transaction_hash, message
        };
      }));
      setHistory(withMemos);
    } catch (err) { console.error('History load failed:', err); }
    finally { setTipsLoading(false); }
  };

  useEffect(() => {
    if (!walletAddress) return;
    loadOnChainHistory(walletAddress);
    let closeStream;
    try {
      const server = new StellarSdk.Server(HORIZON_URL);
      closeStream = server.payments().forAccount(walletAddress).cursor('now').stream({
        onmessage: (r) => {
          if (r.type !== 'payment' || r.asset_type !== 'native') return;
          const rec = {
            id: r.id, type: r.to === walletAddress ? 'received' : 'sent', amount: r.amount,
            counterparty: r.to === walletAddress ? r.from : r.to, timestamp: r.created_at, txHash: r.transaction_hash
          };
          setHistory(prev => prev.find(p => p.id === rec.id) ? prev : [rec, ...prev]);
          fetchBalance(walletAddress);
        },
        onerror: (e) => console.error('Stream error:', e)
      });
    } catch (e) { }
    return () => { if (typeof closeStream === 'function') closeStream(); };
  }, [walletAddress]);

  // Send tip
  const sendTip = async () => {
    if (!walletAddress) return setTxResult({ success: false, error: 'Connect wallet first' });
    if (!recipientAddress || recipientAddress.length !== 56) return setTxResult({ success: false, error: 'Invalid recipient address' });
    const amount = parseFloat(tipAmount);
    if (!amount || amount <= 0) return setTxResult({ success: false, error: 'Invalid tip amount' });
    if (balance && amount > parseFloat(balance) - 1) return setTxResult({ success: false, error: 'Insufficient balance' });
    setSending(true);
    try {
      const server = new StellarSdk.Server(HORIZON_URL);
      const sourceAccount = await server.loadAccount(walletAddress);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE
      }).addOperation(StellarSdk.Operation.payment({
        destination: recipientAddress, asset: StellarSdk.Asset.native(), amount: amount.toString()
      })).addMemo(StellarSdk.Memo.text(tipMessage || 'TipX tip')).setTimeout(30).build();
      let signedXDR;
      if (walletType === 'albedo') {
        const r = await window.albedo.tx({ xdr: transaction.toXDR(), network: 'testnet', submit: false });
        signedXDR = r.signed_envelope_xdr;
      } else if (walletType === 'freighter') {
        const freighterResult = await window.freighterApi.signTransaction(transaction.toXDR(), {
          network: 'TESTNET',
          networkPassphrase: NETWORK_PASSPHRASE,
          accountToSign: walletAddress
        });
        console.log('Freighter signTransaction result:', freighterResult, typeof freighterResult);
        if (typeof freighterResult === 'string') {
          signedXDR = freighterResult;
        } else if (freighterResult?.signedTxXdr) {
          signedXDR = freighterResult.signedTxXdr;
        } else if (freighterResult?.xdr) {
          signedXDR = freighterResult.xdr;
        } else {
          throw new Error('Freighter returned unexpected format: ' + JSON.stringify(freighterResult));
        }
      }

      // Submit transaction - try direct XDR submission to Horizon
      let result;
      try {
        const signed = StellarSdk.TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
        result = await server.submitTransaction(signed);
      } catch (submitErr) {
        // If fromXDR fails, try submitting the raw XDR via fetch
        console.warn('SDK submit failed, trying raw XDR submit:', submitErr);
        const resp = await fetch(HORIZON_URL + '/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'tx=' + encodeURIComponent(signedXDR)
        });
        const data = await resp.json();
        if (!resp.ok) {
          const extras = data.extras?.result_codes;
          const detail = extras ? JSON.stringify(extras) : (data.detail || data.title || 'Unknown error');
          throw new Error('Horizon rejected: ' + detail);
        }
        result = data;
      }

      if (db) { db.collection('tips').add({ sender: walletAddress.trim().toUpperCase(), receiver: recipientAddress.trim().toUpperCase(), amount, message: tipMessage, txHash: result.hash, timestamp: window.firebase.firestore.FieldValue.serverTimestamp() }).catch(e => console.error(e)); }
      setTxResult({ success: true, message: `Tip of ${amount} XLM sent!`, hash: result.hash });
      setTipAmount(''); setTipMessage(''); setRecipientAddress('');
      await fetchBalance(walletAddress);
    } catch (err) {
      console.error('Send error:', err);
      const msg = err?.response?.data?.extras?.result_codes
        ? JSON.stringify(err.response.data.extras.result_codes)
        : (err.message || String(err));
      setTxResult({ success: false, error: msg });
    }
    finally { setSending(false); }
  };

  // Validate username: lowercase, numbers, underscores only
  const validateUsername = (v) => /^[a-z0-9_]+$/.test(v);

  // Copy helper with inline feedback
  const doCopy = (text, label) => { copyToClipboard(text); setCopyMsg(label); setTimeout(() => setCopyMsg(''), 2000); };

  // Generate link with username
  const handleGenerateLink = async () => {
    setGenError(''); setGenSuccess('');
    const uname = genUsername.toLowerCase().trim();
    if (!uname) return setGenError('Please enter a username.');
    if (!validateUsername(uname)) return setGenError('Only lowercase letters, numbers, and underscores allowed.');
    if (uname.length < 3) return setGenError('Username must be at least 3 characters.');
    if (!walletAddress) return setGenError('No wallet connected.');
    if (!db) return setGenError('Firebase not available.');

    setGenSaving(true);
    try {
      const docId = walletAddress.trim().toUpperCase();
      // Check if username is taken by someone else
      const existing = await Promise.race([db.collection('usernames').doc(uname).get(), new Promise((_, r) => setTimeout(() => r('t'), 8000))]);
      if (existing.exists && existing.data().wallet !== docId) {
        setGenSaving(false);
        return setGenError(`Username "${uname}" is already taken. Try another.`);
      }
      // Save to creators collection
      const sp1 = db.collection('creators').doc(docId).set({ name: userName || '', username: uname, wallet: docId, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      // Save username→wallet mapping
      const sp2 = db.collection('usernames').doc(uname).set({ wallet: docId });
      await Promise.race([Promise.all([sp1, sp2]), new Promise((_, r) => setTimeout(() => r('t'), 10000))]);

      const link = `${window.location.origin}/@${uname}`;
      const wLink = `${window.location.origin}/?to=${docId}`;
      setGeneratedLink(link); setWalletLink(wLink); setShowGenLink(true);
      setGenSuccess('Username saved! Your link is ready.');
      copyToClipboard(link);
    } catch (e) {
      console.warn('Generate link failed:', e);
      setGenError('Failed to save. ' + (String(e) === 't' ? 'Firebase timed out.' : e.message || e));
    } finally { setGenSaving(false); }
  };

  const displayAmounts = creatorAmounts || defaultAmounts;
  const sentTips = history.filter(t => t.type === 'sent');
  const receivedTips = history.filter(t => t.type === 'received');

  // ========== RENDER ==========

  // Loading auth
  if (!authChecked) return <div className="app-wrapper landing-page"><div className="initial-loader"><div className="spinner"></div><p>Loading TipX...</p></div></div>;

  // Not authenticated - landing page with auth form
  if (!authUser) {
    return (
      <div className="app-wrapper landing-page">
        <video className="landing-bg-video" autoPlay muted loop playsInline>
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4" type="video/mp4" />
        </video>
        <header className="top-nav">
          <div className="nav-logo">💛 TipX</div>
        </header>
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">Stellar Network Live</div>
            <h1 className="hero-title">
              {creatorProfile?.name ? `Tip ${creatorProfile.name}` : 'Send XLM Tips'}
              {!creatorProfile?.name && <span className="gradient-text"> Effortlessly</span>}
            </h1>
            <p className="hero-subtitle">
              {creatorProfile?.bio || 'Support creators with frictionless micropayments on the Stellar blockchain'}
            </p>
            {creatorProfile?.wallet && !creatorProfile?.name && (
              <p className="hero-subtitle">To: {shortenAddress(creatorProfile.wallet)}</p>
            )}
          </div>
          <div className="hero-auth-form">
            <div className="auth-card">
              <div className="auth-tabs">
                <button className={`auth-tab ${authMode === 'signin' ? 'active' : ''}`} onClick={() => { setAuthMode('signin'); setAuthError(''); }}>Sign In</button>
                <button className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>Sign Up</button>
              </div>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" className="form-input" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name" />
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-input" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className="form-input" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" />
              </div>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" className="form-input" value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} placeholder="••••••••" />
                </div>
              )}
              {authError && <div className="error-message" style={{ marginBottom: '12px' }}>{authError}</div>}
              <button className="btn-primary-large" style={{ width: '100%' }} onClick={authMode === 'signin' ? handleSignIn : handleSignUp} disabled={authLoading}>
                {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <span style={{ color: 'var(--accent-purple)', cursor: 'pointer' }} onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}>
                  {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Authenticated but no wallet - show wallet connect
  if (!walletAddress) {
    return (
      <div className="app-wrapper landing-page">
        <header className="top-nav">
          <div className="nav-logo">💛 TipX</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Hi, {userName || authUser.email}</span>
            <button className="btn-disconnect" onClick={handleSignOut}>Sign Out</button>
          </div>
        </header>
        <section className="hero-section" style={{ justifyContent: 'center' }}>
          <div className="auth-card" style={{ maxWidth: '420px', width: '100%' }}>
            <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>Connect Your Wallet</h2>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>Choose a wallet to connect to TipX</p>
            <div className="wallet-options">
              <button className="wallet-option" onClick={connectAlbedo}>
                <span className="wallet-icon">🔵</span>
                <div><div className="wallet-name">Albedo</div><div className="wallet-desc">Connect with Albedo</div></div>
              </button>
              <button className="wallet-option" onClick={connectFreighter}>
                <span className="wallet-icon">🟣</span>
                <div><div className="wallet-name">Freighter</div><div className="wallet-desc">Connect with Freighter</div></div>
              </button>
            </div>
            {txResult?.error && <div className="error-message" style={{ marginTop: '12px' }}>{txResult.error}</div>}
          </div>
        </section>
      </div>
    );
  }

  // ===== MAIN DASHBOARD =====
  return (
    <div className="app-wrapper main-app">
      <header className="main-header">
        <div className="header-left"><div className="logo">💛 TipX</div></div>
        <div className="header-center">
          <nav className="main-nav">
            <button className={`nav-item ${activeTab === 'send-tip' ? 'active' : ''}`} onClick={() => setActiveTab('send-tip')}>Send Tip</button>
            <button className={`nav-item ${activeTab === 'receive' ? 'active' : ''}`} onClick={() => setActiveTab('receive')}>Received ({receivedTips.length})</button>
            <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History ({sentTips.length})</button>
            <button className={`nav-item ${activeTab === 'generate-link' ? 'active' : ''}`} onClick={() => setActiveTab('generate-link')}>Generate Link</button>
          </nav>
        </div>
        <div className="header-right">
          <div className="balance-display">
            <span className="balance-label">Balance:</span>
            <span className="balance-value">{balanceLoading ? '...' : `${balance !== null ? balance : '0.00'} XLM`}</span>
            <button className="btn-refresh" onClick={() => fetchBalance(walletAddress)} disabled={balanceLoading}>🔄</button>
          </div>
          <div className="wallet-badge-header">
            <span className={`badge badge-${walletType}`}>{walletType?.toUpperCase()}</span>
            <span className="address-short">{shortenAddress(walletAddress)}</span>
            <button className="btn-disconnect" onClick={disconnectWallet}>Disconnect</button>
            <button className="btn-disconnect" style={{ marginLeft: '4px', background: '#6b21a8' }} onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Send Tip Tab */}
        {activeTab === 'send-tip' && (
          <section className="content-section">
            <div className="send-container">
              {creatorNotFound && (
                <div className="error-box" style={{ marginBottom: '20px', textAlign: 'center', padding: '24px' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>😕</div>
                  <div>Creator <strong>{creatorNotFound}</strong> not found</div>
                </div>
              )}
              {creatorProfile && (
                <div className="creator-card-display">
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>🌟</div>
                  <h3 className="creator-card-name">Tip {creatorProfile.name || shortenAddress(creatorProfile.wallet)}</h3>
                  {creatorProfile.username && <div style={{ color: 'var(--accent-purple)', fontSize: '14px', marginBottom: '6px' }}>@{creatorProfile.username}</div>}
                  {creatorProfile.bio && <p className="creator-card-bio">"{creatorProfile.bio}"</p>}
                  <div className="creator-card-wallet">Wallet: {shortenAddress(creatorProfile.wallet)}</div>
                </div>
              )}
              <div className="send-form-card">
                <h2>{creatorProfile?.name ? `Send Tip to ${creatorProfile.name}` : 'Send a Tip'}</h2>
                <div className="form-group">
                  <label>Recipient Address (G...)</label>
                  <input type="text" className="form-input" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} placeholder="G..." />
                </div>
                <div className="form-group">
                  <label>Tip Amount (XLM)</label>
                  <div className="amount-section">
                    <input type="number" className="form-input" min="0.1" step="0.1" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="quick-buttons">
                    {displayAmounts.map(amt => (
                      <button key={amt} className="quick-btn" onClick={() => setTipAmount(String(amt))}>{amt} XLM</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Message (optional)</label>
                  <textarea className="textarea" maxLength="100" value={tipMessage} onChange={e => setTipMessage(e.target.value)} placeholder="Say something nice..." rows="3" />
                  <div className="char-count">{tipMessage.length}/100</div>
                </div>
                <button className="btn-send" onClick={sendTip} disabled={sending}>{sending ? 'Sending...' : 'Send Tip'}</button>
                {txResult && (
                  <div className={txResult.success ? 'success-box' : 'error-box'}>
                    <div>{txResult.success ? `✅ ${txResult.message}` : txResult.error}</div>
                    {txResult.hash && <a href={`https://stellar.expert/explorer/testnet/tx/${txResult.hash}`} target="_blank" className="tx-link">View on Stellar Expert →</a>}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Received Tips Tab */}
        {activeTab === 'receive' && (
          <section className="content-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0 }}>Tips Received</h2>
              <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your Wallet:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{shortenAddress(walletAddress)}</span>
                <button className="btn-copy" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { copyToClipboard(walletAddress); alert('Wallet Address Copied!') }}>Copy</button>
              </div>
            </div>
            {tipsLoading ? <p>Loading...</p> : receivedTips.length === 0 ? <div className="info-box">No tips received yet</div> : (
              <div className="tips-grid">
                {[...receivedTips].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).map(tip => (
                  <div key={tip.id} className="tip-card">
                    <div className="tip-amount">+{Number(tip.amount).toFixed(2)} XLM</div>
                    <div className="tip-from">From: {shortenAddress(tip.counterparty)}</div>
                    {tip.message && <div className="tip-msg">{tip.message}</div>}
                    <div className="tip-time">{timeAgo(tip.timestamp)}</div>
                    {tip.txHash && <a href={`https://stellar.expert/explorer/testnet/tx/${tip.txHash}`} target="_blank" className="tip-link">View Tx</a>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Sent Tips Tab */}
        {activeTab === 'history' && (
          <section className="content-section">
            <h2>Tips Sent</h2>
            {tipsLoading ? <p>Loading...</p> : sentTips.length === 0 ? <div className="info-box">No tips sent yet</div> : (
              <div className="tips-grid">
                {[...sentTips].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).map(tip => (
                  <div key={tip.id} className="tip-card">
                    <div className="tip-amount" style={{ color: '#ef4444' }}>-{Number(tip.amount).toFixed(2)} XLM</div>
                    <div className="tip-from">To: {shortenAddress(tip.counterparty)}</div>
                    {tip.message && <div className="tip-msg">{tip.message}</div>}
                    <div className="tip-time">{timeAgo(tip.timestamp)}</div>
                    {tip.txHash && <a href={`https://stellar.expert/explorer/testnet/tx/${tip.txHash}`} target="_blank" className="tip-link">View Tx</a>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Generate Link Tab */}
        {activeTab === 'generate-link' && (
          <section className="content-section">
            <div className="send-container">
              {!accountFunded && (
                <div className="info-box">
                  <p>Your account needs funding. Get free testnet XLM:</p>
                  <a href={`https://friendbot.stellar.org/?addr=${walletAddress}`} target="_blank" className="btn-fund">Get Free Testnet XLM</a>
                </div>
              )}
              <div className="send-form-card">
                <h2>🔗 Generate Your Tip Link</h2>
                <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Choose a username and get a shareable tip link!</p>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your Wallet:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{shortenAddress(walletAddress)}</span>
                  <button className="btn-copy" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => doCopy(walletAddress, 'wallet')}>{copyMsg === 'wallet' ? '✓ Copied' : 'Copy'}</button>
                </div>
                {userName && <p style={{ marginBottom: '16px' }}>Display name: <strong style={{ color: 'var(--accent-gold)' }}>{userName}</strong></p>}
                <div className="form-group">
                  <label>Choose your username</label>
                  <input type="text" className="form-input" value={genUsername} onChange={e => setGenUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="e.g. starlight (lowercase, no spaces)" />
                  {genUsername && <div style={{ marginTop: '8px', fontSize: '13px', color: validateUsername(genUsername) && genUsername.length >= 3 ? 'var(--success-color)' : 'var(--text-tertiary)' }}>
                    Preview: <strong>{window.location.origin}/@{genUsername}</strong>
                  </div>}
                </div>
                {genError && <div className="error-box" style={{ marginBottom: '12px' }}>{genError}</div>}
                {genSuccess && <div className="success-box" style={{ marginBottom: '12px' }}>✅ {genSuccess}</div>}
                <button className="btn-generate" onClick={handleGenerateLink} disabled={genSaving}>{genSaving ? 'Saving...' : 'Generate Tip Link'}</button>
                {showGenLink && (
                  <div style={{ marginTop: '24px' }}>
                    <label style={{ fontWeight: '600', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Your Tip Link</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      <input type="text" className="form-input" value={generatedLink} readOnly />
                      <button className="btn-copy" onClick={() => doCopy(generatedLink, 'link')}>{copyMsg === 'link' ? '✓ Copied' : 'Copy'}</button>
                    </div>
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Send me a tip on TipX! ' + generatedLink)}`} target="_blank" style={{ display: 'inline-block', background: '#1DA1F2', color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', transition: 'var(--transition)' }}>🐦 Share on Twitter</a>
                    <div style={{ marginTop: '16px' }}>
                      <label style={{ fontWeight: '500', fontSize: '12px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Direct wallet link (backup)</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" className="form-input" style={{ fontSize: '12px' }} value={walletLink} readOnly />
                        <button className="btn-copy" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => doCopy(walletLink, 'backup')}>{copyMsg === 'backup' ? '✓' : 'Copy'}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
console.log('TipX app rendered');
