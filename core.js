(() => {
  const CONFIG = window.APP_CONFIG || {};
  const hasSupabase = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);
  const db = hasSupabase ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

  const STORAGE_KEY = "tradeAxisCleanStateV4";
  const SESSION_KEY = "tradeAxisCleanSessionV4";

  function now(){ return new Date().toLocaleString("en-IN"); }
  function id(prefix){ return prefix + "_" + Date.now() + "_" + Math.random().toString(16).slice(2); }
  function money(n){ return "₹" + Number(n || 0).toLocaleString("en-IN"); }
  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function toast(msg){ alert(msg); }

  function initialState(){
    return {
      users: [
        { id:"admin", name:"Admin", email:"admin@site.com", password:"admin123", role:"admin", kycStatus:"APPROVED", createdAt:now() }
      ],
      ledger: [],
      depositRequests: [],
      withdrawalRequests: [],
      payoutMethods: [],
      kycRequests: [],
      trades: []
    };
  }
  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || initialState(); }
    catch { return initialState(); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(TA.state)); }
  function loadSession(){
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }
  function saveSession(){ localStorage.setItem(SESSION_KEY, JSON.stringify(TA.session)); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); TA.session = null; }

  const TA = {
    db,
    MIN_DEPOSIT: 500,
    MIN_WITHDRAWAL: 2000,
    state: loadState(),
    session: loadSession(),
    now, id, money, esc, toast, saveState, saveSession, clearSession
  };

  TA.currentUser = () => TA.state.users.find(u => u.id === TA.session?.id) || null;
  TA.setSession = (userId) => { TA.session = { id:userId }; saveSession(); };
  TA.logout = () => { clearSession(); location.href = location.pathname.endsWith("admin.html") ? "admin.html" : "index.html"; };

  TA.balanceOf = (userId) => TA.state.ledger
    .filter(x => x.userId === userId)
    .reduce((s,x) => s + Number(x.amount || 0), 0);

  TA.pendingDepositOf = (userId) => TA.state.depositRequests
    .filter(x => x.userId === userId && x.status === "PENDING")
    .reduce((s,x) => s + Number(x.amount || 0), 0);

  TA.pendingWithdrawalOf = (userId) => TA.state.withdrawalRequests
    .filter(x => x.userId === userId && x.status === "PENDING")
    .reduce((s,x) => s + Number(x.amount || 0), 0);

  TA.withdrawableOf = (userId) => TA.balanceOf(userId);

  TA.addLedger = (userId, type, amount, referenceId, note="") => {
    if (TA.state.ledger.some(x => x.type === type && x.referenceId === referenceId)) return false;
    const before = TA.balanceOf(userId);
    const after = before + Number(amount || 0);
    if (after < 0) throw new Error("Insufficient balance");
    TA.state.ledger.push({ id:id("led"), userId, type, amount:Number(amount), referenceId, note, balanceAfter:after, createdAt:now() });
    saveState();
    return true;
  };

  TA.methodLabel = (m) => m?.type === "UPI" ? (m.upi || "UPI") : `${m?.bankName || "Bank"} ••••${String(m?.accountNumber || "").slice(-4)}`;
  TA.approvedPayoutMethods = (userId) => TA.state.payoutMethods.filter(m => m.userId === userId && m.status === "APPROVED");

  TA.dbInsert = async (table, row) => {
    if (!db) return;
    try { await db.from(table).insert(row); } catch(e){ console.warn("DB insert failed", table, e); }
  };
  TA.dbUpdate = async (table, idValue, patch) => {
    if (!db) return;
    try { await db.from(table).update(patch).eq("id", idValue); } catch(e){ console.warn("DB update failed", table, e); }
  };

  TA.copyText = (text) => { navigator.clipboard?.writeText(text); toast("Copied."); };

  window.TA = TA;
  TA.saveState();
})();
