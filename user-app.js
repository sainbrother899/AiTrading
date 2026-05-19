(() => {
  const app = document.getElementById("app");
  let page = "dashboard";
  let walletTab = "deposit";
  let depStep = 1, depAmount = "", depMode = "UPI";
  let witStep = 1, witAmount = "", witMethodId = "";

  function render(){
    const u = TA.currentUser();
    if (!u || u.role === "admin") return renderPublic();
    renderShell();
  }

  function renderPublic(){
    app.innerHTML = `
      <div class="public-page">
        <header class="public-nav">
          <div class="container nav-inner">
            <div class="brand"><i>AI</i><span>TradeAxis</span></div>
            <div class="public-links"><a href="#features">Features</a><a href="#loginBox">Login</a><button class="btn" onclick="scrollToAuth()">Get Started</button></div>
          </div>
        </header>
        <main class="container">
          <section class="public-hero">
            <div class="public-hero-copy">
              <div class="eyebrow">AI Assisted Trading Dashboard</div>
              <h1>Trade smarter with a secure wallet and clean market experience.</h1>
              <p>Manage deposits, withdrawals, KYC, payout methods and trading activity from one professional dashboard.</p>
              <div class="hero-actions"><button class="btn" onclick="scrollToAuth()">Create Account</button><button class="btn secondary" onclick="switchAuth('login');scrollToAuth()">User Login</button></div>
              <div class="trust-row"><span>🔐 KYC Based Access</span><span>📊 Trading UI</span><span>💳 Ledger Wallet</span></div>
            </div>
            <div class="market-preview card">
              <div class="market-preview-head"><div><span>BTC/USDT</span><b>₹58,42,210</b></div><em>+2.84%</em></div>
              <div class="chart-box premium-chart"></div>
              <div class="preview-stats"><div><span>Volume</span><b>₹24.8Cr</b></div><div><span>Signal</span><b>BUY</b></div><div><span>Risk</span><b>Medium</b></div></div>
            </div>
          </section>
          <section id="features" class="feature-grid">
            <article class="card feature-card"><i>💰</i><h3>Professional Wallet</h3><p>Deposit, withdrawal and ledger-based balance in one place.</p></article>
            <article class="card feature-card"><i>📈</i><h3>Trading Controls</h3><p>Open and close trades with wallet settlement.</p></article>
            <article class="card feature-card"><i>🛡️</i><h3>Secure Verification</h3><p>KYC and payout methods are reviewed before money movement.</p></article>
          </section>
          <section id="loginBox" class="auth-section">
            <div class="auth-info"><div class="eyebrow">User Access</div><h2>Login to your trading dashboard</h2><p>Create your account or login to manage wallet, KYC, trades and payouts.</p></div>
            <div class="auth-card card">
              <div class="auth-tabs"><button id="loginTab" class="active" onclick="switchAuth('login')">Login</button><button id="registerTab" onclick="switchAuth('register')">Register</button></div>
              <form id="loginForm" class="form" onsubmit="loginUser(event)">
                <label>Email<input id="loginEmail" type="email" required placeholder="you@example.com"></label>
                <label>Password<input id="loginPassword" type="password" required placeholder="Password"></label>
                <button class="btn">Login</button>
              </form>
              <form id="registerForm" class="form hidden" onsubmit="registerUser(event)">
                <label>Full Name<input id="regName" required placeholder="Your name"></label>
                <label>Email<input id="regEmail" type="email" required placeholder="you@example.com"></label>
                <label>Mobile<input id="regMobile" required placeholder="10 digit mobile"></label>
                <label>Password<input id="regPassword" type="password" required placeholder="Create password"></label>
                <button class="btn">Create Account</button>
              </form>
            </div>
          </section>
        </main>
      </div>`;
  }

  window.scrollToAuth = () => document.getElementById("loginBox")?.scrollIntoView({ behavior:"smooth" });
  window.switchAuth = (type) => {
    document.getElementById("loginTab").classList.toggle("active", type === "login");
    document.getElementById("registerTab").classList.toggle("active", type === "register");
    document.getElementById("loginForm").classList.toggle("hidden", type !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", type !== "register");
  };
  window.registerUser = (e) => {
    e.preventDefault();
    const email = regEmail.value.trim().toLowerCase();
    if (TA.state.users.some(u => u.email === email)) return TA.toast("Email already registered.");
    const user = { id:TA.id("usr"), name:regName.value.trim(), email, mobile:regMobile.value.trim(), password:regPassword.value, role:"user", kycStatus:"PENDING", createdAt:TA.now() };
    TA.state.users.push(user);
    TA.saveState(); TA.setSession(user.id); render();
  };
  window.loginUser = (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim().toLowerCase();
    const pass = loginPassword.value;
    const user = TA.state.users.find(u => u.email === email && u.password === pass && u.role !== "admin");
    if (!user) return TA.toast("Invalid user login details.");
    TA.setSession(user.id); render();
  };

  function shell(content){
    const items = [["dashboard","Dashboard"],["wallet","Wallet"],["trade","Trade"],["kyc","KYC"],["payout","Payment Methods"]];
    const menu = items.map(([k,t])=>`<button class="${page===k?'active':''}" onclick="goUser('${k}')">${t}</button>`).join("") + `<button onclick="TA.logout()">Logout</button>`;
    app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand side-brand"><i>AI</i><span>TradeAxis</span></div><div class="side-menu">${menu}</div></aside><main class="main">${content}</main></div>`;
  }
  window.goUser = (p) => { page = p; renderShell(); };
  function renderShell(){
    const u = TA.currentUser();
    if (!u) return renderPublic();
    const content = page === "wallet" ? walletPage(u) : page === "trade" ? tradePage(u) : page === "kyc" ? kycPage(u) : page === "payout" ? payoutPage(u) : dashboard(u);
    shell(content);
  }
  function head(title, sub){ return `<div class="head"><div><h2>${title}</h2><p>${sub}</p></div></div>`; }
  function metric(t,v,s,i){ return `<div class="card metric"><div class="top"><span>${t}</span><i class="icon">${i}</i></div><b>${v}</b><small>${s}</small></div>`; }

  function dashboard(u){
    const bal = TA.balanceOf(u.id);
    const open = TA.state.trades.filter(t=>t.userId===u.id && t.status==="OPEN").length;
    const pnl = TA.state.trades.filter(t=>t.userId===u.id && t.status==="CLOSED").reduce((s,t)=>s+Number(t.pnl||0),0);
    return `${head("Trading Dashboard",`Welcome back, ${TA.esc(u.name)}.`)}
      <section class="dashboard-hero"><div><p>Total Available Equity</p><h1>${TA.money(bal)}</h1><span>Realized P&L: ${TA.money(pnl)}</span></div><div class="hero-actions"><button class="btn" onclick="goUser('trade')">Start Trading</button><button class="btn secondary" onclick="goUser('wallet')">Add Funds</button></div></section>
      <div class="grid cols-4">${metric("Available Balance",TA.money(bal),"Usable funds","💰")}${metric("Open Trades",open,"Active positions","📈")}${metric("Pending Deposit",TA.money(TA.pendingDepositOf(u.id)),"Waiting approval","⏳")}${metric("Pending Withdrawal",TA.money(TA.pendingWithdrawalOf(u.id)),"On hold","🔒")}</div>
      <div class="grid cols-2" style="margin-top:14px"><div class="card"><h3>Market Overview</h3><div class="chart-box premium-chart"></div><div class="preview-stats"><div><span>Signal</span><b>BUY</b></div><div><span>Risk</span><b>Medium</b></div><div><span>Trend</span><b>Bullish</b></div></div></div><div class="card"><h3>Quick Actions</h3><div class="quick-actions"><button onclick="goUser('wallet')"><b>Deposit</b><span>Add funds</span></button><button onclick="walletTab='withdraw';goUser('wallet')"><b>Withdraw</b><span>Request payout</span></button><button onclick="goUser('kyc')"><b>KYC</b><span>Verification</span></button><button onclick="goUser('payout')"><b>Payment Method</b><span>Payout account</span></button></div></div></div>`;
  }

  function walletPage(u){
    return `${head("Wallet","Professional funds management.")}
      <div class="wallet-hero"><p>Real Wallet Equity</p><h2>Available Balance</h2><strong>${TA.money(TA.balanceOf(u.id))}</strong></div>
      <div class="grid cols-4" style="margin-top:14px">${metric("Available Balance",TA.money(TA.balanceOf(u.id)),"Ready for trade/withdrawal","💰")}${metric("Withdrawable Balance",TA.money(TA.withdrawableOf(u.id)),"Available for withdrawal","🏦")}${metric("Pending Deposit",TA.money(TA.pendingDepositOf(u.id)),"Waiting approval","⏳")}${metric("Pending Withdrawal",TA.money(TA.pendingWithdrawalOf(u.id)),"Amount on hold","🔒")}</div>
      <div class="tabs" style="margin:14px 0"><button class="${walletTab==='deposit'?'active':''}" onclick="setWalletTab('deposit')">Deposit</button><button class="${walletTab==='withdraw'?'active':''}" onclick="setWalletTab('withdraw')">Withdrawal</button><button class="${walletTab==='history'?'active':''}" onclick="setWalletTab('history')">History</button></div>
      ${walletTab === "withdraw" ? withdrawHtml(u) : walletTab === "history" ? walletHistory(u) : depositHtml(u)}`;
  }
  window.setWalletTab = (t) => { walletTab = t; renderShell(); };
  function stepper(kind, step){
    const labels = kind === "deposit" ? ["Amount","Mode","Pay","UTR"] : ["Amount","Method","Review","Submit"];
    return `<div class="stepper"><div class="row"><span>${kind==="deposit"?"Add Funds":"Request Withdrawal"}</span><b>Step ${step} of 4</b></div><div class="steps">${labels.map((l,i)=>`<em class="${i+1<step?'done':i+1===step?'active':''}">${i+1<step?'✓':i+1}<small>${l}</small></em>`).join("")}</div></div>`;
  }
  function paymentSettings(){ return { upiId:"company@upi", upiHolder:"Company Account", upiQr:"", bankName:"Company Bank", bankHolder:"Company Account", accountNumber:"000000000000", ifsc:"BANK0000000" }; }
  function depositHtml(){
    const cfg = paymentSettings();
    if (depStep === 1) return `<div class="card form">${stepper("deposit",1)}<h3>Enter Amount</h3><label>Deposit Amount<input id="depAmount" type="number" min="${TA.MIN_DEPOSIT}" value="${depAmount}" placeholder="Minimum ${TA.money(TA.MIN_DEPOSIT)}"></label><button class="btn" onclick="depNext1()">Next</button></div>`;
    if (depStep === 2) return `<div class="card form">${stepper("deposit",2)}<h3>Select Payment Mode</h3><div class="mode-grid"><button class="${depMode==='UPI'?'active':''}" onclick="depMode='UPI';renderShell()">UPI / QR</button><button class="${depMode==='BANK'?'active':''}" onclick="depMode='BANK';renderShell()">Bank Transfer</button></div><div class="actions"><button class="btn secondary" onclick="depStep=1;renderShell()">Back</button><button class="btn" onclick="depStep=3;renderShell()">Next</button></div></div>`;
    if (depStep === 3 && depMode === "UPI") return `<div class="card form">${stepper("deposit",3)}<h3>Pay via UPI</h3><div class="pay-box"><div class="qr">QR<br>Not Set</div><div class="details-box"><span>UPI ID</span><b>${cfg.upiId}</b><button class="btn secondary" onclick="TA.copyText('${cfg.upiId}')">Copy UPI</button><span>Holder</span><b>${cfg.upiHolder}</b><span>Amount</span><b>${TA.money(depAmount)}</b></div></div><div class="actions"><button class="btn secondary" onclick="depStep=2;renderShell()">Back</button><button class="btn" onclick="depStep=4;renderShell()">I Have Paid</button></div></div>`;
    if (depStep === 3) return `<div class="card form">${stepper("deposit",3)}<h3>Pay via Bank Transfer</h3><div class="details-box"><span>Bank</span><b>${cfg.bankName}</b><span>Account Holder</span><b>${cfg.bankHolder}</b><span>Account Number</span><b>${cfg.accountNumber}</b><span>IFSC</span><b>${cfg.ifsc}</b><button class="btn secondary" onclick="TA.copyText('${cfg.bankName} ${cfg.bankHolder} ${cfg.accountNumber} ${cfg.ifsc}')">Copy Bank Details</button></div><div class="actions"><button class="btn secondary" onclick="depStep=2;renderShell()">Back</button><button class="btn" onclick="depStep=4;renderShell()">I Have Paid</button></div></div>`;
    return `<div class="card form">${stepper("deposit",4)}<h3>Confirm Deposit</h3><div class="summary"><div><span>Amount</span><b>${TA.money(depAmount)}</b></div><div><span>Mode</span><b>${depMode}</b></div></div><label>UTR / Transaction ID<input id="depUtr" inputmode="numeric" maxlength="12" placeholder="12 digit UTR"></label><p class="alert">UTR must be exactly 12 digits. Duplicate UTR is blocked.</p><div class="actions"><button class="btn secondary" onclick="depStep=3;renderShell()">Back</button><button class="btn" onclick="submitDeposit()">Submit Deposit Request</button></div></div>`;
  }
  window.depNext1 = () => { const v=Number(depAmount.value || document.getElementById("depAmount").value || 0); if(v<TA.MIN_DEPOSIT)return TA.toast(`Minimum deposit is ${TA.money(TA.MIN_DEPOSIT)}.`); depAmount=v; depStep=2; renderShell(); };
  window.submitDeposit = async () => {
    const utr = document.getElementById("depUtr").value.trim();
    if(!/^\d{12}$/.test(utr)) return TA.toast("UTR must be exactly 12 digits.");
    if(TA.state.depositRequests.some(d=>d.utr===utr)) return TA.toast("This UTR has already been submitted.");
    const u=TA.currentUser();
    const row={ id:TA.id("dep"), userId:u.id, userEmail:u.email, amount:Number(depAmount), mode:depMode, utr, status:"PENDING", balanceApplied:false, createdAt:TA.now() };
    TA.state.depositRequests.unshift(row); TA.saveState(); await TA.dbInsert("deposit_requests", row);
    depStep=1; depAmount=""; walletTab="history"; renderShell();
  };

  function withdrawHtml(u){
    const methods = TA.approvedPayoutMethods(u.id);
    if(!methods.length) return `<div class="card"><h3>No Approved Payout Method</h3><p class="alert">Add a payment method and wait for admin approval before withdrawal.</p><button class="btn" onclick="goUser('payout')">Add Payment Method</button></div>`;
    if(!witMethodId) witMethodId=methods[0].id;
    const selected = methods.find(m=>m.id===witMethodId) || methods[0];
    if(witStep===1) return `<div class="card form">${stepper("withdraw",1)}<h3>Enter Withdrawal Amount</h3><label>Amount<input id="witAmount" type="number" min="${TA.MIN_WITHDRAWAL}" placeholder="Minimum ${TA.money(TA.MIN_WITHDRAWAL)}"></label><p class="alert">Withdrawable balance: ${TA.money(TA.withdrawableOf(u.id))}</p><button class="btn" onclick="witNext1()">Next</button></div>`;
    if(witStep===2) return `<div class="card form">${stepper("withdraw",2)}<h3>Select Method</h3><div class="method-grid">${methods.map(m=>`<button class="${m.id===witMethodId?'active':''}" onclick="witMethodId='${m.id}';renderShell()"><b>${m.type}</b><span>${TA.methodLabel(m)}</span><small>${m.holderName||""}</small></button>`).join("")}</div><div class="actions"><button class="btn secondary" onclick="witStep=1;renderShell()">Back</button><button class="btn" onclick="witStep=3;renderShell()">Next</button></div></div>`;
    if(witStep===3) return `<div class="card form">${stepper("withdraw",3)}<h3>Review</h3><div class="summary"><div><span>Amount</span><b>${TA.money(witAmount)}</b></div><div><span>Method</span><b>${TA.methodLabel(selected)}</b></div></div><div class="actions"><button class="btn secondary" onclick="witStep=2;renderShell()">Back</button><button class="btn" onclick="witStep=4;renderShell()">Next</button></div></div>`;
    return `<div class="card form">${stepper("withdraw",4)}<h3>Submit Withdrawal</h3><p class="alert">Amount will be held immediately after submit.</p><div class="actions"><button class="btn secondary" onclick="witStep=3;renderShell()">Back</button><button class="btn" onclick="submitWithdrawal()">Submit Request</button></div></div>`;
  }
  window.witNext1 = () => { const v=Number(document.getElementById("witAmount").value||0); if(v<TA.MIN_WITHDRAWAL)return TA.toast(`Minimum withdrawal is ${TA.money(TA.MIN_WITHDRAWAL)}.`); if(v>TA.withdrawableOf(TA.currentUser().id)) return TA.toast("Amount is greater than withdrawable balance."); witAmount=v; witStep=2; renderShell(); };
  window.submitWithdrawal = async () => {
    const u=TA.currentUser(); const m=TA.approvedPayoutMethods(u.id).find(x=>x.id===witMethodId); if(!m)return TA.toast("Select method.");
    try{ TA.addLedger(u.id,"WITHDRAWAL_HOLD",-Number(witAmount),"hold_"+Date.now(),"Withdrawal hold"); }catch(e){ return TA.toast("Insufficient balance."); }
    const row={ id:TA.id("wit"), userId:u.id, userEmail:u.email, amount:Number(witAmount), methodId:m.id, methodType:m.type, methodText:TA.methodLabel(m), holderName:m.holderName, status:"PENDING", holdApplied:true, createdAt:TA.now() };
    TA.state.withdrawalRequests.unshift(row); TA.saveState(); await TA.dbInsert("withdrawal_requests", row);
    witStep=1; witAmount=""; walletTab="history"; renderShell();
  };
  function walletHistory(u){
    const rows=[...TA.state.depositRequests.filter(x=>x.userId===u.id).map(x=>({...x,kind:"Deposit"})),...TA.state.withdrawalRequests.filter(x=>x.userId===u.id).map(x=>({...x,kind:"Withdrawal",mode:x.methodType,utr:""})),...TA.state.ledger.filter(x=>x.userId===u.id).map(x=>({id:x.id,kind:x.type,amount:Math.abs(x.amount),mode:"Ledger",status:x.amount>=0?"APPROVED":"PENDING",createdAt:x.createdAt}))].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
    return `<div class="card"><h3>Wallet History</h3><div class="history">${rows.length?rows.map(r=>`<article><div><b>${r.kind}</b><span>${TA.money(r.amount)} • ${r.mode||""}</span><small>${r.utr?`UTR: ${r.utr} • `:""}${r.createdAt}</small></div><em class="badge ${String(r.status).toLowerCase()}">${r.status}</em></article>`).join(""):`<p class="empty">No wallet history yet.</p>`}</div></div>`;
  }

  function kycPage(u){
    const req = TA.state.kycRequests.find(x=>x.userId===u.id);
    return `${head("KYC","Submit your verification details.")}<div class="card form">${req?`<p class="alert">Current Status: ${req.status}</p>`:""}<label>Full Name<input id="kycName" value="${TA.esc(u.name)}"></label><label>PAN / ID Number<input id="kycDoc"></label><label>Address<textarea id="kycAddress"></textarea></label><button class="btn" onclick="submitKyc()">Submit KYC</button></div>`;
  }
  window.submitKyc = () => { const u=TA.currentUser(); const old=TA.state.kycRequests.find(x=>x.userId===u.id); const data={name:kycName.value,docNumber:kycDoc.value,address:kycAddress.value,status:"PENDING",createdAt:TA.now()}; if(old)Object.assign(old,data); else TA.state.kycRequests.unshift({id:TA.id("kyc"),userId:u.id,userEmail:u.email,...data}); TA.saveState(); renderShell(); };
  function payoutPage(u){
    const rows=TA.state.payoutMethods.filter(x=>x.userId===u.id);
    return `${head("Payment Methods","Add UPI or bank account for withdrawal.")}<div class="grid cols-2"><div class="card form"><h3>Add Method</h3><label>Type<select id="payType"><option>UPI</option><option>BANK</option></select></label><label>UPI ID<input id="payUpi"></label><label>Holder Name<input id="payHolder"></label><label>Bank Name<input id="payBank"></label><label>Account Number<input id="payAcc"></label><label>IFSC<input id="payIfsc"></label><button class="btn" onclick="addPayoutMethod()">Submit Method</button></div><div class="card"><h3>Your Methods</h3><div class="history">${rows.length?rows.map(m=>`<article><div><b>${m.type}</b><span>${TA.methodLabel(m)}</span><small>${m.holderName}</small></div><em class="badge ${m.status.toLowerCase()}">${m.status}</em></article>`).join(""):`<p class="empty">No method added.</p>`}</div></div></div>`;
  }
  window.addPayoutMethod = () => { const u=TA.currentUser(); const type=payType.value; TA.state.payoutMethods.unshift({id:TA.id("pay"),userId:u.id,userEmail:u.email,type,upi:payUpi.value,holderName:payHolder.value,bankName:payBank.value,accountNumber:payAcc.value,ifsc:payIfsc.value,status:"PENDING",createdAt:TA.now()}); TA.saveState(); renderShell(); };

  function tradePage(u){
    const open=TA.state.trades.filter(t=>t.userId===u.id&&t.status==="OPEN"); const closed=TA.state.trades.filter(t=>t.userId===u.id&&t.status==="CLOSED");
    return `${head("Trade","Open and close trades with safe balance settlement.")}<div class="grid cols-2"><div class="card form"><h3>Open Trade</h3><p class="alert">Available Balance: ${TA.money(TA.balanceOf(u.id))}</p><label>Trade Amount<input id="tradeAmount" type="number" min="1"></label><label>Side<select id="tradeSide"><option>BUY</option><option>SELL</option></select></label><button class="btn" onclick="openTrade()">Open Trade</button></div><div class="card"><h3>Live Chart</h3><div class="chart-box"></div></div></div><div class="grid cols-2" style="margin-top:14px"><div class="card"><h3>Open Trades</h3><div class="history">${open.length?open.map(t=>`<article><div><b>${t.side} ${TA.money(t.amount)}</b><span>${t.createdAt}</span></div><button class="btn secondary" onclick="prepareCloseTrade('${t.id}')">Close</button></article>`).join(""):`<p class="empty">No open trade.</p>`}</div></div><div class="card"><h3>Closed Trades</h3><div class="history">${closed.length?closed.map(t=>`<article><div><b>${t.side} ${TA.money(t.amount)}</b><span>P&L: ${TA.money(t.pnl)}</span><small>${t.closedAt}</small></div><em class="badge ${t.pnl>=0?'approved':'rejected'}">${t.pnl>=0?'PROFIT':'LOSS'}</em></article>`).join(""):`<p class="empty">No closed trade.</p>`}</div></div></div>`;
  }
  window.openTrade = () => { const u=TA.currentUser(); const amount=Number(tradeAmount.value||0); if(amount<=0)return TA.toast("Enter amount."); try{TA.addLedger(u.id,"TRADE_HOLD",-amount,"trade_hold_"+Date.now(),"Trade opened");}catch(e){return TA.toast("Insufficient balance.");} TA.state.trades.unshift({id:TA.id("trd"),userId:u.id,userEmail:u.email,side:tradeSide.value,amount,status:"OPEN",createdAt:TA.now()}); TA.saveState(); renderShell(); };
  window.prepareCloseTrade = (tradeId) => { const pnl=prompt("Enter P&L. Profit positive, loss negative. Example 300 or -150","0"); if(pnl!==null) closeTrade(tradeId,Number(pnl)); };
  function closeTrade(tradeId,pnl){ const t=TA.state.trades.find(x=>x.id===tradeId); if(!t||t.status!=="OPEN")return; TA.addLedger(t.userId,"TRADE_SETTLE",Math.max(0,Number(t.amount)+Number(pnl)),"trade_settle_"+t.id,"Trade closed"); t.pnl=Number(pnl); t.status="CLOSED"; t.closedAt=TA.now(); TA.saveState(); renderShell(); }

  window.userRender = render;
  render();
})();
