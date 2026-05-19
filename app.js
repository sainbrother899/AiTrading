(() => {
  const CONFIG = window.APP_CONFIG || {};
  const hasSupabase = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);
  const db = hasSupabase ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY) : null;

  const MIN_DEPOSIT = 500;
  const MIN_WITHDRAWAL = 2000;
  const REF = {
    DEPOSIT: "deposit_requests",
    WITHDRAWAL: "withdrawal_requests",
    LEDGER: "wallet_ledger",
    PROFILES: "profiles",
    PAYOUT: "user_payout_methods",
    TRADES: "trades"
  };

  const app = document.getElementById("app");
  let state = loadState();
  let session = loadSession();

  function initialState(){
    return {
      users: [
        { id: "admin", name: "Admin", email: "admin@site.com", password: "admin123", role: "admin", kycStatus: "APPROVED", createdAt: now() }
      ],
      depositRequests: [],
      withdrawalRequests: [],
      payoutMethods: [],
      kycRequests: [],
      trades: [],
      ledger: []
    };
  }
  function loadState(){
    try { return JSON.parse(localStorage.getItem("cleanTradingState") || "null") || initialState(); }
    catch { return initialState(); }
  }
  function saveState(){ localStorage.setItem("cleanTradingState", JSON.stringify(state)); }
  function loadSession(){
    try { return JSON.parse(localStorage.getItem("cleanTradingSession") || "null"); }
    catch { return null; }
  }
  function saveSession(){ localStorage.setItem("cleanTradingSession", JSON.stringify(session)); }
  function now(){ return new Date().toLocaleString("en-IN"); }
  function uid(){ return session?.id || ""; }
  function currentUser(){ return state.users.find(u => u.id === uid()) || null; }
  function money(n){ return "₹" + Number(n || 0).toLocaleString("en-IN"); }
  function toast(msg){ alert(msg); }
  function escapeHtml(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function id(prefix){ return prefix + "_" + Date.now() + "_" + Math.random().toString(16).slice(2); }

  // ---------------- Ledger: one balance owner ----------------
  function ledgerFor(userId){ return state.ledger.filter(x => x.userId === userId); }
  function balanceOf(userId){ return ledgerFor(userId).reduce((s,x) => s + Number(x.amount || 0), 0); }
  function pendingDepositOf(userId){ return state.depositRequests.filter(x => x.userId === userId && x.status === "PENDING").reduce((s,x)=>s+x.amount,0); }
  function pendingWithdrawalOf(userId){ return state.withdrawalRequests.filter(x => x.userId === userId && x.status === "PENDING").reduce((s,x)=>s+x.amount,0); }
  function withdrawableOf(userId){ return balanceOf(userId); }

  function addLedger(userId, type, amount, referenceId, note){
    if (state.ledger.some(x => x.referenceId === referenceId && x.type === type)) return false;
    const before = balanceOf(userId);
    const after = before + Number(amount || 0);
    if (after < 0) throw new Error("Insufficient balance");
    state.ledger.push({ id: id("led"), userId, type, amount: Number(amount), referenceId, note: note || "", balanceAfter: after, createdAt: now() });
    saveState();
    return true;
  }

  // ---------------- Render base ----------------
  function render(){
    if (!session) return renderLanding();
    if (currentUser()?.role === "admin") return renderAdmin();
    return renderUser();
  }

  function renderLanding(){
    app.innerHTML = `
      <div class="page">
        <div class="container">
          <nav class="topnav">
            <div class="brand"><i>AI</i><span>AI Trading Platform</span></div>
            <div class="nav-actions"><button class="btn secondary" onclick="fillAdmin()">Admin Login</button></div>
          </nav>
          <section class="hero">
            <div class="hero-card">
              <div class="eyebrow">Clean Rebuild V1</div>
              <h1>Smart trading dashboard with secure wallet flow.</h1>
              <p>Fresh rebuild with one balance owner, clean wallet ledger, deposit requests, withdrawal holds, and admin approvals.</p>
              <div class="pill-row">
                <span class="badge approved">Wallet Ledger</span>
                <span class="badge pending">12 Digit UTR</span>
                <span class="badge approved">Admin Control</span>
              </div>
            </div>
            <div class="auth-card card">
              <div class="auth-tabs">
                <button id="loginTab" class="active" onclick="switchAuth('login')">Login</button>
                <button id="registerTab" onclick="switchAuth('register')">Register</button>
              </div>
              <form id="loginForm" class="form" onsubmit="login(event)">
                <label>Email<input id="loginEmail" type="email" required placeholder="you@example.com"></label>
                <label>Password<input id="loginPassword" type="password" required placeholder="Password"></label>
                <button class="btn">Login</button>
              </form>
              <form id="registerForm" class="form hidden" onsubmit="register(event)">
                <label>Full Name<input id="regName" required placeholder="Your name"></label>
                <label>Email<input id="regEmail" type="email" required placeholder="you@example.com"></label>
                <label>Mobile<input id="regMobile" required placeholder="10 digit mobile"></label>
                <label>Password<input id="regPassword" type="password" required placeholder="Create password"></label>
                <button class="btn">Create Account</button>
              </form>
            </div>
          </section>
        </div>
      </div>`;
  }

  window.switchAuth = (type) => {
    document.getElementById("loginTab").classList.toggle("active", type === "login");
    document.getElementById("registerTab").classList.toggle("active", type === "register");
    document.getElementById("loginForm").classList.toggle("hidden", type !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", type !== "register");
  };
  window.fillAdmin = () => {
    switchAuth("login");
    document.getElementById("loginEmail").value = "admin@site.com";
    document.getElementById("loginPassword").value = "admin123";
  };
  window.register = async (e) => {
    e.preventDefault();
    const email = regEmail.value.trim().toLowerCase();
    if (state.users.some(u => u.email === email)) return toast("Email already registered.");
    const user = { id: id("usr"), name: regName.value.trim(), email, mobile: regMobile.value.trim(), password: regPassword.value, role: "user", kycStatus: "PENDING", createdAt: now() };
    state.users.push(user);
    saveState();
    session = { id: user.id };
    saveSession();
    render();
  };
  window.login = (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim().toLowerCase();
    const pass = loginPassword.value;
    const user = state.users.find(u => u.email === email && u.password === pass);
    if (!user) return toast("Invalid login details.");
    session = { id: user.id };
    saveSession();
    render();
  };
  window.logout = () => { session = null; localStorage.removeItem("cleanTradingSession"); render(); };

  // ---------------- User app ----------------
  let userPage = "dashboard";
  function shell(menu, content){
    return `<div class="app-shell">
      <aside class="sidebar">
        <div class="brand side-brand"><i>AI</i><span>Trading</span></div>
        <div class="side-menu">${menu}</div>
      </aside>
      <main class="main">${content}</main>
    </div>`;
  }
  function userMenu(){
    const items = [
      ["dashboard","Dashboard"],["wallet","Wallet"],["trade","Trade"],["kyc","KYC"],["payout","Payment Methods"]
    ];
    return items.map(([k,t]) => `<button class="${userPage===k?'active':''}" onclick="goUser('${k}')">${t}</button>`).join("") + `<button onclick="logout()">Logout</button>`;
  }
  window.goUser = (p) => { userPage = p; renderUser(); };
  function renderUser(){
    const u = currentUser();
    let content = "";
    if (userPage === "wallet") content = walletPageHtml(u);
    else if (userPage === "trade") content = tradePageHtml(u);
    else if (userPage === "kyc") content = kycPageHtml(u);
    else if (userPage === "payout") content = payoutPageHtml(u);
    else content = dashboardHtml(u);
    app.innerHTML = shell(userMenu(), content);
  }
  function pageHead(title, sub){ return `<div class="head"><div><h2>${title}</h2><p>${sub}</p></div></div>`; }
  function metric(title,value,sub,icon){ return `<div class="card metric"><div class="top"><span>${title}</span><i class="icon">${icon}</i></div><b>${value}</b><small>${sub}</small></div>`; }
  function dashboardHtml(u){
    const bal = balanceOf(u.id);
    const open = state.trades.filter(t => t.userId === u.id && t.status === "OPEN").length;
    const pnl = state.trades.filter(t => t.userId === u.id && t.status === "CLOSED").reduce((s,t)=>s+Number(t.pnl||0),0);
    return `${pageHead("Dashboard","Overview of your wallet and trading activity.")}
      <div class="grid cols-3">
        ${metric("Available Balance", money(bal), "Usable funds", "💰")}
        ${metric("Open Trades", open, "Active positions", "📈")}
        ${metric("Realized P&L", money(pnl), "Closed trade result", pnl>=0?"✅":"⚠️")}
      </div>
      <div class="card" style="margin-top:14px">
        <h3>Quick Chart</h3>
        <div class="chart-box"></div>
      </div>`;
  }

  // ---------------- Wallet ----------------
  let walletTab = "deposit";
  let depStep = 1, depAmount = "", depMode = "UPI", depUtr = "";
  let witStep = 1, witAmount = "", witMethodId = "";
  function walletPageHtml(u){
    const bal = balanceOf(u.id);
    return `${pageHead("Wallet","Professional funds management.")}
      <div class="wallet-hero"><p>Real Wallet Equity</p><h2>Available Balance</h2><strong>${money(bal)}</strong></div>
      <div class="grid cols-4" style="margin-top:14px">
        ${metric("Available Balance", money(bal), "Ready for trade/withdrawal", "💰")}
        ${metric("Withdrawable Balance", money(withdrawableOf(u.id)), "Available for withdrawal", "🏦")}
        ${metric("Pending Deposit", money(pendingDepositOf(u.id)), "Waiting for approval", "⏳")}
        ${metric("Pending Withdrawal", money(pendingWithdrawalOf(u.id)), "Amount on hold", "🔒")}
      </div>
      <div class="tabs" style="margin:14px 0">
        <button class="${walletTab==='deposit'?'active':''}" onclick="setWalletTab('deposit')">Deposit</button>
        <button class="${walletTab==='withdraw'?'active':''}" onclick="setWalletTab('withdraw')">Withdrawal</button>
        <button class="${walletTab==='history'?'active':''}" onclick="setWalletTab('history')">History</button>
      </div>
      ${walletTab === "withdraw" ? withdrawHtml(u) : walletTab === "history" ? walletHistoryHtml(u) : depositHtml(u)}`;
  }
  window.setWalletTab = (tab) => { walletTab = tab; renderUser(); };
  function stepper(kind, step){
    const labels = kind === "deposit" ? ["Amount","Mode","Pay","UTR"] : ["Amount","Method","Review","Submit"];
    return `<div class="stepper"><div class="row"><span>${kind==="deposit"?"Add Funds":"Request Withdrawal"}</span><b>Step ${step} of 4</b></div><div class="steps">${labels.map((l,i)=>`<em class="${i+1<step?'done':i+1===step?'active':''}">${i+1<step?'✓':i+1}<small>${l}</small></em>`).join("")}</div></div>`;
  }
  function paymentSettings(){
    return { upiId:"company@upi", upiHolder:"Company Account", upiQr:"", bankName:"Company Bank", bankHolder:"Company Account", accountNumber:"000000000000", ifsc:"BANK0000000" };
  }
  function depositHtml(u){
    const cfg = paymentSettings();
    if (depStep === 1) return `<div class="card form">${stepper("deposit",1)}<h3>Enter Amount</h3><label>Deposit Amount<input id="depAmount" type="number" min="${MIN_DEPOSIT}" value="${depAmount}" placeholder="Minimum ${money(MIN_DEPOSIT)}"></label><button class="btn" onclick="depNext1()">Next</button></div>`;
    if (depStep === 2) return `<div class="card form">${stepper("deposit",2)}<h3>Select Payment Mode</h3><div class="mode-grid"><button class="${depMode==='UPI'?'active':''}" onclick="depMode='UPI';renderUser()">UPI / QR</button><button class="${depMode==='BANK'?'active':''}" onclick="depMode='BANK';renderUser()">Bank Transfer</button></div><div class="actions"><button class="btn secondary" onclick="depStep=1;renderUser()">Back</button><button class="btn" onclick="depStep=3;renderUser()">Next</button></div></div>`;
    if (depStep === 3 && depMode === "UPI") return `<div class="card form">${stepper("deposit",3)}<h3>Pay via UPI</h3><div class="pay-box"><div class="qr">${cfg.upiQr ? `<img src="${cfg.upiQr}" style="width:100%;height:100%;object-fit:contain">` : "QR<br>Not Set"}</div><div class="details-box"><span>UPI ID</span><b>${cfg.upiId}</b><button class="btn secondary" onclick="copyText('${cfg.upiId}')">Copy UPI</button><span>Holder</span><b>${cfg.upiHolder}</b><span>Amount</span><b>${money(depAmount)}</b></div></div><div class="actions"><button class="btn secondary" onclick="depStep=2;renderUser()">Back</button><button class="btn" onclick="depStep=4;renderUser()">I Have Paid</button></div></div>`;
    if (depStep === 3) return `<div class="card form">${stepper("deposit",3)}<h3>Pay via Bank Transfer</h3><div class="details-box"><span>Bank</span><b>${cfg.bankName}</b><span>Account Holder</span><b>${cfg.bankHolder}</b><span>Account Number</span><b>${cfg.accountNumber}</b><span>IFSC</span><b>${cfg.ifsc}</b><button class="btn secondary" onclick="copyText('${cfg.bankName} ${cfg.bankHolder} ${cfg.accountNumber} ${cfg.ifsc}')">Copy Bank Details</button></div><div class="actions"><button class="btn secondary" onclick="depStep=2;renderUser()">Back</button><button class="btn" onclick="depStep=4;renderUser()">I Have Paid</button></div></div>`;
    return `<div class="card form">${stepper("deposit",4)}<h3>Confirm Deposit</h3><div class="summary"><div><span>Amount</span><b>${money(depAmount)}</b></div><div><span>Mode</span><b>${depMode}</b></div></div><label>UTR / Transaction ID<input id="depUtr" inputmode="numeric" maxlength="12" value="${depUtr}" placeholder="12 digit UTR"></label><p class="alert">UTR must be exactly 12 digits. Duplicate UTR is blocked.</p><div class="actions"><button class="btn secondary" onclick="depStep=3;renderUser()">Back</button><button class="btn" onclick="submitDeposit()">Submit Deposit Request</button></div></div>`;
  }
  window.depNext1 = () => {
    const v = Number(document.getElementById("depAmount").value || 0);
    if (v < MIN_DEPOSIT) return toast(`Minimum deposit is ${money(MIN_DEPOSIT)}.`);
    depAmount = v; depStep = 2; renderUser();
  };
  window.submitDeposit = async () => {
    const utr = document.getElementById("depUtr").value.trim();
    if (!/^\d{12}$/.test(utr)) return toast("UTR must be exactly 12 digits.");
    if (state.depositRequests.some(d => d.utr === utr)) return toast("This UTR has already been submitted.");
    const req = { id:id("dep"), userId:uid(), userEmail:currentUser().email, amount:Number(depAmount), mode:depMode, utr, status:"PENDING", balanceApplied:false, createdAt:now() };
    state.depositRequests.unshift(req);
    saveState();
    depStep=1; depAmount=""; depUtr=""; walletTab="history";
    await dbInsert(REF.DEPOSIT, req);
    renderUser();
  };

  function withdrawHtml(u){
    const methods = approvedPayoutMethods(u.id);
    if (!methods.length) return `<div class="card"><h3>No Approved Payout Method</h3><p class="alert">Add a payment method and wait for admin approval before withdrawal.</p><button class="btn" onclick="goUser('payout')">Add Payment Method</button></div>`;
    if (!witMethodId) witMethodId = methods[0].id;
    const selected = methods.find(m=>m.id===witMethodId) || methods[0];
    if (witStep === 1) return `<div class="card form">${stepper("withdraw",1)}<h3>Enter Withdrawal Amount</h3><label>Amount<input id="witAmount" type="number" min="${MIN_WITHDRAWAL}" value="${witAmount}" placeholder="Minimum ${money(MIN_WITHDRAWAL)}"></label><p class="alert">Withdrawable balance: ${money(withdrawableOf(u.id))}</p><button class="btn" onclick="witNext1()">Next</button></div>`;
    if (witStep === 2) return `<div class="card form">${stepper("withdraw",2)}<h3>Select Method</h3><div class="method-grid">${methods.map(m=>`<button class="${m.id===witMethodId?'active':''}" onclick="witMethodId='${m.id}';renderUser()"><b>${m.type}</b><span>${methodLabel(m)}</span><small>${m.holderName||""}</small></button>`).join("")}</div><div class="actions"><button class="btn secondary" onclick="witStep=1;renderUser()">Back</button><button class="btn" onclick="witStep=3;renderUser()">Next</button></div></div>`;
    if (witStep === 3) return `<div class="card form">${stepper("withdraw",3)}<h3>Review</h3><div class="summary"><div><span>Amount</span><b>${money(witAmount)}</b></div><div><span>Method</span><b>${methodLabel(selected)}</b></div></div><div class="actions"><button class="btn secondary" onclick="witStep=2;renderUser()">Back</button><button class="btn" onclick="witStep=4;renderUser()">Next</button></div></div>`;
    return `<div class="card form">${stepper("withdraw",4)}<h3>Submit Withdrawal</h3><p class="alert">Amount will be held immediately after submit.</p><div class="actions"><button class="btn secondary" onclick="witStep=3;renderUser()">Back</button><button class="btn" onclick="submitWithdrawal()">Submit Request</button></div></div>`;
  }
  window.witNext1 = () => {
    const v = Number(document.getElementById("witAmount").value || 0);
    if (v < MIN_WITHDRAWAL) return toast(`Minimum withdrawal is ${money(MIN_WITHDRAWAL)}.`);
    if (v > withdrawableOf(uid())) return toast("Amount is greater than withdrawable balance.");
    witAmount = v; witStep = 2; renderUser();
  };
  window.submitWithdrawal = async () => {
    const methods = approvedPayoutMethods(uid());
    const m = methods.find(x=>x.id===witMethodId);
    if (!m) return toast("Select approved payout method.");
    const amount = Number(witAmount);
    try { addLedger(uid(), "WITHDRAWAL_HOLD", -amount, "hold_"+Date.now(), "Withdrawal request hold"); }
    catch(e){ return toast("Insufficient balance."); }
    const req = { id:id("wit"), userId:uid(), userEmail:currentUser().email, amount, methodId:m.id, methodType:m.type, methodText:methodLabel(m), holderName:m.holderName, status:"PENDING", holdApplied:true, createdAt:now() };
    state.withdrawalRequests.unshift(req);
    saveState();
    witStep=1; witAmount=""; walletTab="history";
    await dbInsert(REF.WITHDRAWAL, req);
    renderUser();
  };
  function walletHistoryHtml(u){
    const rows = [
      ...state.depositRequests.filter(x=>x.userId===u.id).map(x=>({...x, kind:"Deposit"})),
      ...state.withdrawalRequests.filter(x=>x.userId===u.id).map(x=>({...x, kind:"Withdrawal", mode:x.methodType, utr:""})),
      ...state.ledger.filter(x=>x.userId===u.id && x.type.startsWith("TRADE")).map(x=>({ id:x.id, kind:x.type, amount:Math.abs(x.amount), mode:"Ledger", utr:"", status:x.amount>=0?"APPROVED":"PENDING", createdAt:x.createdAt }))
    ].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
    return `<div class="card"><h3>Wallet History</h3><div class="history">${rows.length?rows.map(r=>`<article><div><b>${r.kind}</b><span>${money(r.amount)} • ${r.mode||""}</span><small>${r.utr?`UTR: ${r.utr} • `:""}${r.createdAt}</small></div><em class="badge ${r.status.toLowerCase()}">${r.status}</em></article>`).join(""):`<p class="empty">No wallet history yet.</p>`}</div></div>`;
  }

  // ---------------- Payout / KYC ----------------
  function approvedPayoutMethods(userId){ return state.payoutMethods.filter(m => m.userId===userId && m.status==="APPROVED"); }
  function methodLabel(m){ return m.type === "UPI" ? m.upi : `${m.bankName} ••••${String(m.accountNumber||"").slice(-4)}`; }
  function kycPageHtml(u){
    const req = state.kycRequests.find(x => x.userId === u.id);
    return `${pageHead("KYC","Submit your verification details.")}
      <div class="card form">
        ${req ? `<p class="alert">Current Status: ${req.status}</p>` : ""}
        <label>Full Name<input id="kycName" value="${escapeHtml(u.name)}"></label>
        <label>PAN / ID Number<input id="kycDoc" placeholder="Document number"></label>
        <label>Address<textarea id="kycAddress" placeholder="Full address"></textarea></label>
        <button class="btn" onclick="submitKyc()">Submit KYC</button>
      </div>`;
  }
  window.submitKyc = () => {
    const old = state.kycRequests.find(x=>x.userId===uid());
    if (old) Object.assign(old, { name:kycName.value, docNumber:kycDoc.value, address:kycAddress.value, status:"PENDING", createdAt:now() });
    else state.kycRequests.unshift({ id:id("kyc"), userId:uid(), userEmail:currentUser().email, name:kycName.value, docNumber:kycDoc.value, address:kycAddress.value, status:"PENDING", createdAt:now() });
    saveState(); toast("KYC submitted."); renderUser();
  };
  function payoutPageHtml(u){
    const rows = state.payoutMethods.filter(x=>x.userId===u.id);
    return `${pageHead("Payment Methods","Add UPI or bank account for withdrawal.")}
      <div class="grid cols-2">
        <div class="card form">
          <h3>Add Method</h3>
          <label>Type<select id="payType"><option>UPI</option><option>BANK</option></select></label>
          <label>UPI ID<input id="payUpi" placeholder="name@upi"></label>
          <label>Holder Name<input id="payHolder" placeholder="Account holder"></label>
          <label>Bank Name<input id="payBank"></label>
          <label>Account Number<input id="payAcc"></label>
          <label>IFSC<input id="payIfsc"></label>
          <button class="btn" onclick="addPayoutMethod()">Submit Method</button>
        </div>
        <div class="card">
          <h3>Your Methods</h3>
          <div class="history">${rows.length?rows.map(m=>`<article><div><b>${m.type}</b><span>${methodLabel(m)}</span><small>${m.holderName}</small></div><em class="badge ${m.status.toLowerCase()}">${m.status}</em></article>`).join(""):`<p class="empty">No method added.</p>`}</div>
        </div>
      </div>`;
  }
  window.addPayoutMethod = () => {
    const type = payType.value;
    const row = { id:id("pay"), userId:uid(), userEmail:currentUser().email, type, upi:payUpi.value, holderName:payHolder.value, bankName:payBank.value, accountNumber:payAcc.value, ifsc:payIfsc.value, status:"PENDING", createdAt:now() };
    state.payoutMethods.unshift(row); saveState(); renderUser();
  };

  // ---------------- Trade ----------------
  function tradePageHtml(u){
    const bal = balanceOf(u.id);
    const open = state.trades.filter(t=>t.userId===u.id && t.status==="OPEN");
    const closed = state.trades.filter(t=>t.userId===u.id && t.status==="CLOSED");
    return `${pageHead("Trade","Open and close trades with safe balance settlement.")}
      <div class="grid cols-2">
        <div class="card form">
          <h3>Open Trade</h3>
          <p class="alert">Available Balance: ${money(bal)}</p>
          <label>Trade Amount<input id="tradeAmount" type="number" min="1" placeholder="Enter trade amount"></label>
          <label>Side<select id="tradeSide"><option>BUY</option><option>SELL</option></select></label>
          <button class="btn" onclick="openTrade()">Open Trade</button>
        </div>
        <div class="card">
          <h3>Live Chart</h3>
          <div class="chart-box"></div>
        </div>
      </div>
      <div class="grid cols-2" style="margin-top:14px">
        <div class="card">
          <h3>Open Trades</h3>
          <div class="history">${open.length?open.map(t=>`<article><div><b>${t.side} ${money(t.amount)}</b><span>${t.createdAt}</span></div><button class="btn secondary" onclick="prepareCloseTrade('${t.id}')">Close</button></article>`).join(""):`<p class="empty">No open trade.</p>`}</div>
        </div>
        <div class="card">
          <h3>Closed Trades</h3>
          <div class="history">${closed.length?closed.map(t=>`<article><div><b>${t.side} ${money(t.amount)}</b><span>P&L: ${money(t.pnl)}</span><small>${t.closedAt}</small></div><em class="badge ${t.pnl>=0?'approved':'rejected'}">${t.pnl>=0?'PROFIT':'LOSS'}</em></article>`).join(""):`<p class="empty">No closed trade.</p>`}</div>
        </div>
      </div>`;
  }
  window.openTrade = () => {
    const amount = Number(tradeAmount.value || 0);
    if (amount <= 0) return toast("Enter valid trade amount.");
    try { addLedger(uid(), "TRADE_HOLD", -amount, "trade_hold_" + Date.now(), "Trade opened"); }
    catch(e){ return toast("Insufficient balance."); }
    const row = { id:id("trd"), userId:uid(), userEmail:currentUser().email, side:tradeSide.value, amount, status:"OPEN", createdAt:now() };
    state.trades.unshift(row); saveState(); renderUser();
  };
  window.prepareCloseTrade = (tradeId) => {
    const pnl = prompt("Enter P&L amount. Profit positive, Loss negative. Example: 300 or -150", "0");
    if (pnl === null) return;
    closeTrade(tradeId, Number(pnl));
  };
  function closeTrade(tradeId, pnl){
    const t = state.trades.find(x=>x.id===tradeId);
    if (!t || t.status !== "OPEN") return;
    const returnAmount = Math.max(0, Number(t.amount) + Number(pnl));
    addLedger(t.userId, "TRADE_SETTLE", returnAmount, "trade_settle_" + t.id, "Trade closed");
    t.pnl = Number(pnl);
    t.status = "CLOSED";
    t.closedAt = now();
    saveState();
    renderUser();
  }

  // ---------------- Admin ----------------
  let adminPage = "overview";
  function adminMenu(){
    const items = [["overview","Overview"],["users","Users"],["kyc","KYC"],["payout","Payment Methods"],["deposits","Deposits"],["withdrawals","Withdrawals"],["trades","Trades"]];
    return items.map(([k,t])=>`<button class="${adminPage===k?'active':''}" onclick="goAdmin('${k}')">${t}</button>`).join("") + `<button onclick="logout()">Logout</button>`;
  }
  window.goAdmin = (p) => { adminPage = p; renderAdmin(); };
  function renderAdmin(){
    let content = "";
    if (adminPage === "users") content = adminUsers();
    else if (adminPage === "kyc") content = adminKyc();
    else if (adminPage === "payout") content = adminPayout();
    else if (adminPage === "deposits") content = adminDeposits();
    else if (adminPage === "withdrawals") content = adminWithdrawals();
    else if (adminPage === "trades") content = adminTrades();
    else content = adminOverview();
    app.innerHTML = shell(adminMenu(), content);
  }
  function adminOverview(){
    return `${pageHead("Admin Overview","Clean control panel.")}
      <div class="grid cols-4">
        ${metric("Users", state.users.filter(u=>u.role!=="admin").length, "Registered users", "👥")}
        ${metric("Pending Deposits", state.depositRequests.filter(x=>x.status==="PENDING").length, "Need review", "⏳")}
        ${metric("Pending Withdrawals", state.withdrawalRequests.filter(x=>x.status==="PENDING").length, "Need review", "🔒")}
        ${metric("Open Trades", state.trades.filter(x=>x.status==="OPEN").length, "Active", "📈")}
      </div>`;
  }
  function adminUsers(){
    const users = state.users.filter(u=>u.role!=="admin");
    return `${pageHead("Users","All registered users.")}
      <div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Mobile</th><th>KYC</th><th>Balance</th></tr></thead><tbody>${users.map(u=>`<tr><td>${u.name}<br><small>${u.email}</small></td><td>${u.mobile||"-"}</td><td><span class="badge ${u.kycStatus==="APPROVED"?'approved':'pending'}">${u.kycStatus||"PENDING"}</span></td><td>${money(balanceOf(u.id))}</td></tr>`).join("")||`<tr><td colspan="4" class="empty">No users</td></tr>`}</tbody></table></div>`;
  }
  function adminKyc(){
    return `${pageHead("KYC Requests","Approve or reject user KYC.")}
      <div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Name</th><th>Doc</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.kycRequests.map(k=>`<tr><td>${k.userEmail}</td><td>${k.name}</td><td>${k.docNumber}</td><td><span class="badge ${k.status.toLowerCase()}">${k.status}</span></td><td>${k.status==="PENDING"?`<button class="btn green" onclick="approveKyc('${k.id}')">Approve</button> <button class="btn danger" onclick="rejectKyc('${k.id}')">Reject</button>`:"Locked"}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">No KYC requests</td></tr>`}</tbody></table></div>`;
  }
  window.approveKyc = idv => { const k=state.kycRequests.find(x=>x.id===idv); if(k){k.status="APPROVED"; const u=state.users.find(u=>u.id===k.userId); if(u)u.kycStatus="APPROVED"; saveState(); renderAdmin();} };
  window.rejectKyc = idv => { const k=state.kycRequests.find(x=>x.id===idv); if(k){k.status="REJECTED"; saveState(); renderAdmin();} };
  function adminPayout(){
    return `${pageHead("Payment Methods","Approve withdrawal methods.")}
      <div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Type</th><th>Method</th><th>Holder</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.payoutMethods.map(m=>`<tr><td>${m.userEmail}</td><td>${m.type}</td><td>${methodLabel(m)}</td><td>${m.holderName}</td><td><span class="badge ${m.status.toLowerCase()}">${m.status}</span></td><td>${m.status==="PENDING"?`<button class="btn green" onclick="approvePay('${m.id}')">Approve</button> <button class="btn danger" onclick="rejectPay('${m.id}')">Reject</button>`:"Locked"} <button class="btn danger" onclick="deletePay('${m.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty">No methods</td></tr>`}</tbody></table></div>`;
  }
  window.approvePay = idv => { const r=state.payoutMethods.find(x=>x.id===idv); if(r){r.status="APPROVED"; saveState(); renderAdmin();} };
  window.rejectPay = idv => { const r=state.payoutMethods.find(x=>x.id===idv); if(r){r.status="REJECTED"; saveState(); renderAdmin();} };
  window.deletePay = idv => { state.payoutMethods=state.payoutMethods.filter(x=>x.id!==idv); saveState(); renderAdmin(); };
  function adminDeposits(){
    return `${pageHead("Deposit Requests","Approve verified UTR deposits.")}
      <div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Amount</th><th>Mode</th><th>UTR</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.depositRequests.map(r=>`<tr><td>${r.userEmail}</td><td>${money(r.amount)}</td><td>${r.mode}</td><td>${r.utr}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td><td>${r.status==="PENDING"?`<button class="btn green" onclick="approveDeposit('${r.id}')">Approve</button> <button class="btn danger" onclick="rejectDeposit('${r.id}')">Reject</button>`:"Locked"}</td></tr>`).join("")||`<tr><td colspan="6" class="empty">No deposits</td></tr>`}</tbody></table></div>`;
  }
  window.approveDeposit = (rid) => {
    const r = state.depositRequests.find(x=>x.id===rid);
    if (!r || r.status !== "PENDING") return;
    r.status = "APPROVED";
    addLedger(r.userId, "DEPOSIT_APPROVED", r.amount, "dep_" + r.id, "Deposit approved");
    r.balanceApplied = true;
    saveState(); renderAdmin();
  };
  window.rejectDeposit = (rid) => { const r=state.depositRequests.find(x=>x.id===rid); if(r&&r.status==="PENDING"){r.status="REJECTED";saveState();renderAdmin();} };
  function adminWithdrawals(){
    return `${pageHead("Withdrawal Requests","Approve or reject withdrawals.")}
      <div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.withdrawalRequests.map(r=>`<tr><td>${r.userEmail}</td><td>${money(r.amount)}</td><td>${r.methodText}</td><td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td><td>${r.status==="PENDING"?`<button class="btn green" onclick="approveWithdrawal('${r.id}')">Approve</button> <button class="btn danger" onclick="rejectWithdrawal('${r.id}')">Reject</button>`:"Locked"}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">No withdrawals</td></tr>`}</tbody></table></div>`;
  }
  window.approveWithdrawal = (rid) => { const r=state.withdrawalRequests.find(x=>x.id===rid); if(r&&r.status==="PENDING"){r.status="APPROVED";saveState();renderAdmin();} };
  window.rejectWithdrawal = (rid) => {
    const r=state.withdrawalRequests.find(x=>x.id===rid);
    if (!r || r.status !== "PENDING") return;
    r.status="REJECTED";
    addLedger(r.userId, "WITHDRAWAL_RELEASE", r.amount, "rel_" + r.id, "Withdrawal rejected/refunded");
    saveState(); renderAdmin();
  };
  function adminTrades(){
    return `${pageHead("Trades","Monitor all trades.")}
      <div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Side</th><th>Amount</th><th>Status</th><th>P&L</th><th>Date</th></tr></thead><tbody>${state.trades.map(t=>`<tr><td>${t.userEmail}</td><td>${t.side}</td><td>${money(t.amount)}</td><td>${t.status}</td><td>${t.pnl==null?"-":money(t.pnl)}</td><td>${t.createdAt}</td></tr>`).join("")||`<tr><td colspan="6" class="empty">No trades</td></tr>`}</tbody></table></div>`;
  }

  // ---------------- DB stubs ----------------
  async function dbInsert(table, row){
    if (!db) return;
    try { await db.from(table).insert(row); } catch(e){ console.warn("DB insert failed", table, e); }
  }

  window.copyText = (text) => { navigator.clipboard?.writeText(text); toast("Copied."); };

  // expose for debugging
  window.cleanTradingState = state;
  window.balanceOf = balanceOf;

  saveState();
  render();
})();
