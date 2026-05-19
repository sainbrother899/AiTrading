/* Clean Step 1 Core
   Shared helpers only. No business logic yet.
   Next step: auth/session/state/ledger will be implemented here.
*/
(function(){
  const CONFIG = window.APP_CONFIG || {};
  const TA = {
    config: CONFIG,
    app: document.getElementById("app"),
    qs: (sel, root=document) => root.querySelector(sel),
    qsa: (sel, root=document) => Array.from(root.querySelectorAll(sel)),
    money: (n) => "₹" + Number(n || 0).toLocaleString("en-IN"),
    show: (el) => { if (el) el.classList.remove("hidden"); },
    hide: (el) => { if (el) el.classList.add("hidden"); },
    page: (id) => {
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
      const page = document.getElementById(id);
      if (page) page.classList.add("active-page");
    }
  };
  window.TA = TA;
})();
