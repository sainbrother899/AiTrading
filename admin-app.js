(() => {
  const app = document.getElementById("app");
  let page = "overview";

  function render(){
    const u = TA.currentUser();
    if (!u || u.role !== "admin") return renderLogin();
    renderShell();
  }

  function renderLogin(message=""){
    app.innerHTML = `
      <div class="public-page">
        <header class="public-nav"><div class="container nav-inner"><div class="brand"><i>AI</i><span>TradeAxis Admin</span></div><div class="public-links"><button class="btn secondary" onclick="location.href='index.html'">Back to Website</button></div></div></header>
        <main class="container">
          <section class="auth-section admin-login-section">
            <div class="auth-info"><div class="eyebrow">Admin Control Center</div><h2>Secure admin sign in</h2><p>Review users, KYC, deposits, withdrawals, payout methods and trades from one clean admin dashboard.</p></div>
            <div class="auth-card card">
              ${message ? `<p class="alert">${message}</p>` : ""}
              <form class="form" onsubmit="adminLogin(event)">
                <label>Email<input id="adminEmail" type="email" required placeholder="admin@site.com"></label>
                <label>Password<input id="adminPassword" type="password" required placeholder="Password"></label>
                <button class="btn">Open Admin Panel</button>
              </form>
            </div>
          </section>
        </main>
      </div>`;
  }

  window.adminLogin = (e) => {
    e.preventDefault();
    const email = adminEmail.value.trim().toLowerCase();
    const pass = adminPassword.value;
    const user = TA.state.users.find(u => u.email === email && u.password === pass && u.role === "admin");
    if (!user) return renderLogin("Invalid admin login details.");
    TA.setSession(user.id);
    render();
  };

  function shell(content){
    const items = [["overview","Overview"],["users","Users"],["kyc","KYC"],["payout","Payment Methods"],["deposits","Deposits"],["withdrawals","Withdrawals"],["trades","Trades"]];
    const menu = items.map(([k,t])=>`<button class="${page===k?'active':''}" onclick="goAdmin('${k}')">${t}</button>`).join("") + `<button onclick="TA.logout()">Logout</button>`;
    app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand side-brand"><i>AI</i><span>Admin</span></div><div class="side-menu">${menu}</div></aside><main class="main">${content}</main></div>`;
  }
  window.goAdmin = (p) => { page = p; renderShell(); };
  function renderShell(){
    const content = page === "users" ? usersPage() : page === "kyc" ? kycPage() : page === "payout" ? payoutPage() : page === "deposits" ? depositsPage() : page === "withdrawals" ? withdrawalsPage() : page === "trades" ? tradesPage() : overviewPage();
    shell(content);
  }
  function head(title, sub){ return `<div class="head"><div><h2>${title}</h2><p>${sub}</p></div></div>`; }
  function metric(t,v,s,i){ return `<div class="card metric"><div class="top"><span>${t}</span><i class="icon">${i}</i></div><b>${v}</b><small>${s}</small></div>`; }
  function badge(s){ return `<span class="badge ${String(s).toLowerCase()}">${s}</span>`; }

  function overviewPage(){
    return `${head("Admin Overview","Clean control panel.")}
      <div class="grid cols-4">${metric("Users",TA.state.users.filter(u=>u.role!=="admin").length,"Registered users","👥")}${metric("Pending Deposits",TA.state.depositRequests.filter(x=>x.status==="PENDING").length,"Need review","⏳")}${metric("Pending Withdrawals",TA.state.withdrawalRequests.filter(x=>x.status==="PENDING").length,"Need review","🔒")}${metric("Open Trades",TA.state.trades.filter(x=>x.status==="OPEN").length,"Active","📈")}</div>`;
  }
  function usersPage(){
    const users = TA.state.users.filter(u=>u.role!=="admin");
    return `${head("Users","All registered users.")}<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Mobile</th><th>KYC</th><th>Balance</th></tr></thead><tbody>${users.map(u=>`<tr><td>${TA.esc(u.name)}<br><small>${u.email}</small></td><td>${u.mobile||"-"}</td><td>${badge(u.kycStatus||"PENDING")}</td><td>${TA.money(TA.balanceOf(u.id))}</td></tr>`).join("")||`<tr><td colspan="4" class="empty">No users</td></tr>`}</tbody></table></div>`;
  }
  function kycPage(){
    return `${head("KYC Requests","Approve or reject user KYC.")}<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Name</th><th>Doc</th><th>Status</th><th>Action</th></tr></thead><tbody>${TA.state.kycRequests.map(k=>`<tr><td>${k.userEmail}</td><td>${TA.esc(k.name)}</td><td>${TA.esc(k.docNumber)}</td><td>${badge(k.status)}</td><td>${k.status==="PENDING"?`<button class="btn green" onclick="approveKyc('${k.id}')">Approve</button> <button class="btn danger" onclick="rejectKyc('${k.id}')">Reject</button>`:"Locked"}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">No KYC requests</td></tr>`}</tbody></table></div>`;
  }
  window.approveKyc = (id) => { const k=TA.state.kycRequests.find(x=>x.id===id); if(k){k.status="APPROVED"; const u=TA.state.users.find(u=>u.id===k.userId); if(u)u.kycStatus="APPROVED"; TA.saveState(); renderShell();} };
  window.rejectKyc = (id) => { const k=TA.state.kycRequests.find(x=>x.id===id); if(k){k.status="REJECTED"; TA.saveState(); renderShell();} };

  function payoutPage(){
    return `${head("Payment Methods","Approve withdrawal methods.")}<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Type</th><th>Method</th><th>Holder</th><th>Status</th><th>Action</th></tr></thead><tbody>${TA.state.payoutMethods.map(m=>`<tr><td>${m.userEmail}</td><td>${m.type}</td><td>${TA.methodLabel(m)}</td><td>${TA.esc(m.holderName)}</td><td>${badge(m.status)}</td><td>${m.status==="PENDING"?`<button class="btn green" onclick="approvePay('${m.id}')">Approve</button> <button class="btn danger" onclick="rejectPay('${m.id}')">Reject</button>`:"Locked"} <button class="btn danger" onclick="deletePay('${m.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="6" class="empty">No methods</td></tr>`}</tbody></table></div>`;
  }
  window.approvePay = (id) => { const r=TA.state.payoutMethods.find(x=>x.id===id); if(r){r.status="APPROVED"; TA.saveState(); renderShell();} };
  window.rejectPay = (id) => { const r=TA.state.payoutMethods.find(x=>x.id===id); if(r){r.status="REJECTED"; TA.saveState(); renderShell();} };
  window.deletePay = (id) => { TA.state.payoutMethods=TA.state.payoutMethods.filter(x=>x.id!==id); TA.saveState(); renderShell(); };

  function depositsPage(){
    return `${head("Deposit Requests","Approve verified UTR deposits.")}<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Amount</th><th>Mode</th><th>UTR</th><th>Status</th><th>Action</th></tr></thead><tbody>${TA.state.depositRequests.map(r=>`<tr><td>${r.userEmail}</td><td>${TA.money(r.amount)}</td><td>${r.mode}</td><td>${r.utr}</td><td>${badge(r.status)}</td><td>${r.status==="PENDING"?`<button class="btn green" onclick="approveDeposit('${r.id}')">Approve</button> <button class="btn danger" onclick="rejectDeposit('${r.id}')">Reject</button>`:"Locked"}</td></tr>`).join("")||`<tr><td colspan="6" class="empty">No deposits</td></tr>`}</tbody></table></div>`;
  }
  window.approveDeposit = (id) => { const r=TA.state.depositRequests.find(x=>x.id===id); if(!r||r.status!=="PENDING")return; r.status="APPROVED"; TA.addLedger(r.userId,"DEPOSIT_APPROVED",r.amount,"dep_"+r.id,"Deposit approved"); r.balanceApplied=true; TA.saveState(); renderShell(); };
  window.rejectDeposit = (id) => { const r=TA.state.depositRequests.find(x=>x.id===id); if(r&&r.status==="PENDING"){r.status="REJECTED"; TA.saveState(); renderShell();} };

  function withdrawalsPage(){
    return `${head("Withdrawal Requests","Approve or reject withdrawals.")}<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Action</th></tr></thead><tbody>${TA.state.withdrawalRequests.map(r=>`<tr><td>${r.userEmail}</td><td>${TA.money(r.amount)}</td><td>${r.methodText}</td><td>${badge(r.status)}</td><td>${r.status==="PENDING"?`<button class="btn green" onclick="approveWithdrawal('${r.id}')">Approve</button> <button class="btn danger" onclick="rejectWithdrawal('${r.id}')">Reject</button>`:"Locked"}</td></tr>`).join("")||`<tr><td colspan="5" class="empty">No withdrawals</td></tr>`}</tbody></table></div>`;
  }
  window.approveWithdrawal = (id) => { const r=TA.state.withdrawalRequests.find(x=>x.id===id); if(r&&r.status==="PENDING"){r.status="APPROVED"; TA.saveState(); renderShell();} };
  window.rejectWithdrawal = (id) => { const r=TA.state.withdrawalRequests.find(x=>x.id===id); if(!r||r.status!=="PENDING")return; r.status="REJECTED"; TA.addLedger(r.userId,"WITHDRAWAL_RELEASE",r.amount,"rel_"+r.id,"Withdrawal rejected/refunded"); TA.saveState(); renderShell(); };

  function tradesPage(){
    return `${head("Trades","Monitor all trades.")}<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Side</th><th>Amount</th><th>Status</th><th>P&L</th><th>Date</th></tr></thead><tbody>${TA.state.trades.map(t=>`<tr><td>${t.userEmail}</td><td>${t.side}</td><td>${TA.money(t.amount)}</td><td>${t.status}</td><td>${t.pnl==null?"-":TA.money(t.pnl)}</td><td>${t.createdAt}</td></tr>`).join("")||`<tr><td colspan="6" class="empty">No trades</td></tr>`}</tbody></table></div>`;
  }

  window.adminRender = render;
  render();
})();
