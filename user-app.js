/* Clean Step 1 User App
   This file is only for index.html.
   It keeps the UI base alive without old app.js patches.
   Business logic will be rebuilt in the next step.
*/
(function(){
  function initAuthTabs(){
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    window.showLogin = function(){
      loginForm?.classList.add("active-form");
      registerForm?.classList.remove("active-form");
    };
    window.showRegister = function(){
      registerForm?.classList.add("active-form");
      loginForm?.classList.remove("active-form");
    };
  }

  function initNavigation(){
    // Basic safe navigation for existing user page sections.
    window.showPage = function(pageId){
      document.querySelectorAll("#appPage .page").forEach(p => p.classList.remove("active-page"));
      const page = document.getElementById(pageId);
      if (page) page.classList.add("active-page");
    };
  }

  function init(){
    initAuthTabs();
    initNavigation();
    console.log("Clean Step 1 user-app.js loaded. Old app.js is removed.");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
