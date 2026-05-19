/* Clean Step 1 Admin App
   This file is only for admin.html.
   Admin business logic will be rebuilt in the next step.
*/
(function(){
  function initAdminNavigation(){
    window.showAdminPanel = function(panelId){
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active-admin-panel"));
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add("active-admin-panel");
    };
  }

  function init(){
    initAdminNavigation();
    console.log("Clean Step 1 admin-app.js loaded. Old app.js is removed.");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
