import { supabase } from "./config.js";


/* =========================================================
   CONFIGURATION
========================================================= */

const EDGE_FUNCTION_URL =
  "https://ivtenxyfhdklbubhclub.supabase.co/functions/v1/send-sos";

/*
  Automatically uses the page currently running SilentSOS.
  This fixes the problem where the verification link opens
  the wrong/local SilentSOS file.
*/
const REDIRECT_URL = (() => {
  try {
    return window.location.origin + window.location.pathname;
  } catch {
    return "http://127.0.0.1:5500/SilentSOS/index.html";
  }
})();

const AUDIO_SECONDS = 7;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

const authScreen = $("authScreen");
const appScreen = $("appScreen");

const loginForm = $("loginForm");
const signupForm = $("signupForm");
const forgotForm = $("forgotForm");

const display = $("display");
const expressionDisplay = $("expression");


/* =========================================================
   GENERAL HELPERS
========================================================= */

function show(element) {
  element?.classList.remove("hidden");
}

function hide(element) {
  element?.classList.add("hidden");
}

function setMessage(element, message, success = false) {
  if (!element) return;

  element.textContent = message;
  element.style.color = success
    ? "#287a45"
    : "#b23b3b";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   AUTHENTICATION
========================================================= */

let authBusy = false;
let appOpened = false;


function showLogin() {
  show(loginForm);
  hide(signupForm);
  hide(forgotForm);
}


function showSignup() {
  hide(loginForm);
  show(signupForm);
  hide(forgotForm);
}


function showForgot() {
  hide(loginForm);
  hide(signupForm);
  show(forgotForm);
}


function openApplication() {

  if (appOpened) return;

  appOpened = true;

  hide(authScreen);
  show(appScreen);

  closeMenu();
  closeDetail();

  loadUserEmail();
}


function closeApplication() {

  appOpened = false;

  show(authScreen);
  hide(appScreen);

  closeMenu();
  closeDetail();

  showLogin();
}


async function loadUserEmail() {

  try {

    const {
      data,
      error
    } = await supabase.auth.getUser();

    if (error || !data?.user) return;

    const emailElement =
      $("menuUserEmail");

    if (emailElement) {
      emailElement.textContent =
        data.user.email || "";
    }

  } catch (error) {

    console.error(
      "User loading error:",
      error
    );
  }
}


/* =========================================================
   AUTH NAVIGATION
========================================================= */

$("showSignupBtn")?.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    showSignup();
  }
);


$("showLoginBtn")?.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    showLogin();
  }
);


$("forgotBtn")?.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    showForgot();
  }
);


$("backToLoginBtn")?.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    showLogin();
  }
);


/* =========================================================
   SIGN UP
========================================================= */

async function handleSignup() {

  if (authBusy) return;

  const name =
    $("signupName")?.value.trim() || "";

  const email =
    $("signupEmail")
      ?.value.trim()
      .toLowerCase() || "";

  const password =
    $("signupPassword")?.value || "";

  const secret =
    $("signupSecret")?.value.trim() || "";

  const message =
    $("signupMessage");

  const button =
    $("signupBtn");

  setMessage(message, "");

  if (
    !name ||
    !email ||
    !password ||
    !secret
  ) {

    setMessage(
      message,
      "Please complete all fields."
    );

    return;
  }


  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email)
  ) {

    setMessage(
      message,
      "Enter a valid email address."
    );

    return;
  }


  if (password.length < 6) {

    setMessage(
      message,
      "Password must contain at least 6 characters."
    );

    return;
  }


  if (
    secret.length < 4 ||
    !/^\d+$/.test(secret)
  ) {

    setMessage(
      message,
      "Secret SOS code must contain at least 4 numbers."
    );

    return;
  }


  authBusy = true;

  if (button) {

    button.disabled = true;

    button.textContent =
      "Creating account...";
  }


  try {

    const {
      data,
      error
    } = await supabase.auth.signUp({

      email,

      password,

      options: {

        emailRedirectTo:
          REDIRECT_URL,

        data: {

          full_name:
            name,

          secret_code:
            secret
        }
      }
    });


    if (error) {
      throw error;
    }


    if (data?.session) {

      openApplication();

    } else {

      setMessage(
        message,
        "Account created. Check your email and click the verification link. SilentSOS will open after verification.",
        true
      );
    }


  } catch (error) {

    console.error(
      "Signup error:",
      error
    );

    setMessage(
      message,
      error?.message ||
        "Unable to create account."
    );


  } finally {

    authBusy = false;

    if (button) {

      button.disabled = false;

      button.textContent =
        "Create account";
    }
  }
}


$("signupBtn")?.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    void handleSignup();
  }
);


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin() {

  if (authBusy) return;

  const email =
    $("loginEmail")
      ?.value.trim()
      .toLowerCase() || "";

  const password =
    $("loginPassword")?.value || "";

  const message =
    $("loginMessage");

  const button =
    $("loginBtn");

  setMessage(message, "");


  if (!email || !password) {

    setMessage(
      message,
      "Enter your email and password."
    );

    return;
  }


  authBusy = true;

  if (button) {

    button.disabled = true;

    button.textContent =
      "Signing in...";
  }


  try {

    const {
      data,
      error
    } = await supabase.auth
      .signInWithPassword({

        email,

        password
      });


    if (error) {

      const errorText =
        String(
          error.message || ""
        ).toLowerCase();


      if (
        errorText.includes(
          "email not confirmed"
        )
      ) {

        throw new Error(
          "Please verify your email before signing in."
        );
      }


      if (
        errorText.includes(
          "invalid login credentials"
        )
      ) {

        throw new Error(
          "Incorrect email or password."
        );
      }


      throw error;
    }


    if (data?.session) {

      openApplication();

    } else {

      setMessage(
        message,
        "Login completed, but no active session was returned."
      );
    }


  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    setMessage(
      message,
      error?.message ||
        "Unable to sign in."
    );


  } finally {

    authBusy = false;

    if (button) {

      button.disabled = false;

      button.textContent =
        "Sign in";
    }
  }
}


$("loginBtn")?.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    void handleLogin();
  }
);


$("loginEmail")?.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Enter") {

      event.preventDefault();

      void handleLogin();
    }
  }
);


$("loginPassword")?.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Enter") {

      event.preventDefault();

      void handleLogin();
    }
  }
);


/* =========================================================
   PASSWORD RESET
========================================================= */

async function handlePasswordReset() {

  if (authBusy) return;

  const email =
    $("forgotEmail")
      ?.value.trim()
      .toLowerCase() || "";

  const message =
    $("forgotMessage");

  const button =
    $("sendResetBtn");

  setMessage(message, "");


  if (!email) {

    setMessage(
      message,
      "Enter your email address."
    );

    return;
  }


  authBusy = true;

  if (button) {

    button.disabled = true;

    button.textContent =
      "Sending...";
  }


  try {

    const {
      error
    } =
      await supabase.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo:
              REDIRECT_URL
          }
        );


    if (error) {
      throw error;
    }


    setMessage(
      message,
      "Password reset link sent. Check your email.",
      true
    );


  } catch (error) {

    console.error(
      "Password reset error:",
      error
    );

    setMessage(
      message,
      error?.message ||
        "Unable to send reset link."
    );


  } finally {

    authBusy = false;

    if (button) {

      button.disabled = false;

      button.textContent =
        "Send reset link";
    }
  }
}


$("sendResetBtn")?.addEventListener(
  "click",
  (event) => {

    event.preventDefault();

    void handlePasswordReset();
  }
);


/* =========================================================
   AUTH STATE
========================================================= */

/*
  Keep this callback lightweight.
  Do not call getUser(), sign-in or other
  auth methods directly inside this callback.
*/

supabase.auth.onAuthStateChange(
  (event, session) => {

    console.log(
      "Auth state:",
      event,
      session
        ? "session available"
        : "no session"
    );


    setTimeout(() => {

      if (session) {

        openApplication();

      } else if (
        event === "SIGNED_OUT"
      ) {

        closeApplication();
      }

    }, 0);
  }
);


/* =========================================================
   INITIAL AUTH CHECK
========================================================= */

(async function initializeAuthentication() {

  try {

    const {
      data,
      error
    } =
      await supabase.auth
        .getSession();


    if (error) {
      throw error;
    }


    if (data?.session) {

      openApplication();

    } else {

      closeApplication();
    }


  } catch (error) {

    console.error(
      "Authentication initialization error:",
      error
    );

    closeApplication();
  }

})();


/* =========================================================
   CALCULATOR
========================================================= */

let currentInput = "0";

let storedExpression = "";

let justCalculated = false;


function updateCalculatorDisplay() {

  if (display) {

    display.textContent =
      currentInput || "0";
  }

  if (expressionDisplay) {

    expressionDisplay.textContent =
      storedExpression;
  }
}


function appendNumber(value) {

  if (justCalculated) {

    currentInput = value;

    storedExpression = "";

    justCalculated = false;

    updateCalculatorDisplay();

    return;
  }


  if (value === ".") {

    if (
      currentInput.includes(".")
    ) {
      return;
    }

    currentInput += ".";

    updateCalculatorDisplay();

    return;
  }


  if (currentInput === "0") {

    currentInput = value;

  } else {

    currentInput += value;
  }


  updateCalculatorDisplay();
}


function appendOperator(operator) {

  if (justCalculated) {

    storedExpression =
      currentInput;

    justCalculated = false;
  }


  if (!currentInput) {

    currentInput = "0";
  }


  storedExpression +=
    currentInput + operator;

  currentInput = "0";

  updateCalculatorDisplay();
}


function clearCalculator() {

  currentInput = "0";

  storedExpression = "";

  justCalculated = false;

  updateCalculatorDisplay();
}


function deleteLast() {

  if (justCalculated) {

    currentInput = "0";

    justCalculated = false;

    updateCalculatorDisplay();

    return;
  }


  if (
    currentInput.length <= 1 ||
    (
      currentInput.length === 2 &&
      currentInput.startsWith("-")
    )
  ) {

    currentInput = "0";

  } else {

    currentInput =
      currentInput.slice(0, -1);
  }


  updateCalculatorDisplay();
}


function percentage() {

  const number =
    Number(currentInput);


  if (Number.isNaN(number)) {
    return;
  }


  currentInput =
    String(number / 100);


  updateCalculatorDisplay();
}


/* =========================================================
   SAFE CALCULATOR
========================================================= */

function safeEvaluate(expression) {

  const cleaned =
    expression.replace(
      /\s/g,
      ""
    );


  if (
    !/^[0-9+\-*/().]+$/
      .test(cleaned)
  ) {

    throw new Error(
      "Invalid expression"
    );
  }


  if (!/[0-9]/.test(cleaned)) {

    throw new Error(
      "Invalid expression"
    );
  }


  const result =
    Function(
      `"use strict"; return (${cleaned})`
    )();


  if (!Number.isFinite(result)) {

    throw new Error(
      "Invalid calculation"
    );
  }


  return result;
}


/* =========================================================
   SECRET SOS
========================================================= */

async function getSecretKey() {

  try {

    const {
      data: { user }
    } =
      await supabase.auth
        .getUser();


    if (!user) {

      return "2580";
    }


    return (
      user.user_metadata
        ?.secret_code ||
      "2580"
    );


  } catch (error) {

    console.error(
      "Secret code read error:",
      error
    );

    return "2580";
  }
}


async function calculateResult() {

  /*
    SOS is checked ONLY here.
    It does not activate merely because
    the secret number is visible.
  */

  const secret =
    await getSecretKey();


  const completeExpression =
    storedExpression +
    currentInput;


  const normalized =
    completeExpression
      .replace(/\s/g, "")
      .replace(/×/g, "*")
      .replace(/÷/g, "/");


  const secretNormalized =
    String(secret).trim();


  const isSecretCode =
    normalized ===
      secretNormalized &&
    /^[0-9]+$/.test(normalized);


  if (isSecretCode) {

    /*
      Run SOS silently.
      No popup.
      No toast.
      No SOS screen.
    */

    void triggerSilentSOS();
  }


  try {

    const result =
      safeEvaluate(
        completeExpression
      );


    storedExpression =
      completeExpression + "=";


    currentInput =
      formatNumber(result);


    justCalculated = true;


    updateCalculatorDisplay();


  } catch (error) {

    console.error(
      "Calculator error:",
      error
    );


    currentInput = "Error";

    justCalculated = true;

    updateCalculatorDisplay();


    setTimeout(() => {

      currentInput = "0";

      storedExpression = "";

      justCalculated = false;

      updateCalculatorDisplay();

    }, 900);
  }
}


function formatNumber(number) {

  if (!Number.isFinite(number)) {

    return "Error";
  }


  return Number(
    number.toFixed(10)
  ).toString();
}


/* =========================================================
   CALCULATOR BUTTONS
========================================================= */

document
  .querySelectorAll(".calc-key")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        const action =
          button.dataset.action;

        const value =
          button.dataset.value;


        if (action === "clear") {

          clearCalculator();

          return;
        }


        if (action === "delete") {

          deleteLast();

          return;
        }


        if (action === "percent") {

          percentage();

          return;
        }


        if (action === "equals") {

          void calculateResult();

          return;
        }


        if (
          value === "+" ||
          value === "-" ||
          value === "*" ||
          value === "/"
        ) {

          appendOperator(value);

          return;
        }


        appendNumber(value);
      }
    );
  });


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
  "keydown",
  (event) => {

    if (
      appScreen?.classList
        .contains("hidden")
    ) {

      return;
    }


    const key = event.key;


    if (/^[0-9.]$/.test(key)) {

      appendNumber(key);

      return;
    }


    if (
      ["+", "-", "*", "/"]
        .includes(key)
    ) {

      appendOperator(key);

      return;
    }


    if (
      key === "Enter" ||
      key === "="
    ) {

      event.preventDefault();

      void calculateResult();

      return;
    }


    if (key === "Backspace") {

      deleteLast();

      return;
    }


    if (key === "Escape") {

      clearCalculator();
    }
  }
);


/* =========================================================
   MENU
========================================================= */

$("menuBtn")?.addEventListener(
  "click",
  openMenu
);


$("closeMenuBtn")?.addEventListener(
  "click",
  closeMenu
);


$("menuOverlay")?.addEventListener(
  "click",
  closeMenu
);


function openMenu() {

  $("sideMenu")
    ?.classList
    .add("open");

  $("menuOverlay")
    ?.classList
    .add("open");
}


function closeMenu() {

  $("sideMenu")
    ?.classList
    .remove("open");

  $("menuOverlay")
    ?.classList
    .remove("open");
}


/* =========================================================
   DETAIL PANEL
========================================================= */

document
  .querySelectorAll(
    ".menu-item[data-section]"
  )
  .forEach((item) => {

    item.addEventListener(
      "click",
      () => {

        const section =
          item.dataset.section;

        closeMenu();

        openDetail(section);
      }
    );
  });


$("closeDetailBtn")?.addEventListener(
  "click",
  closeDetail
);


function openDetail(section) {

  const titleMap = {

    profile:
      "Profile",

    contacts:
      "Emergency Contacts",

    history:
      "Activity History",

    settings:
      "Settings",

    help:
      "Help Desk"
  };


  const title =
    titleMap[section] ||
    "Details";


  $("detailTitle").textContent =
    title;


  $("detailContent").innerHTML =
    "";


  $("detailPanel")
    ?.classList
    .add("open");


  if (section === "profile") {

    renderProfile();

  } else if (
    section === "contacts"
  ) {

    renderContacts();

  } else if (
    section === "history"
  ) {

    renderHistory();

  } else if (
    section === "settings"
  ) {

    renderSettings();

  } else if (
    section === "help"
  ) {

    renderHelpDesk();
  }
}


function closeDetail() {

  $("detailPanel")
    ?.classList
    .remove("open");
}


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile() {

  const {
    data: { user }
  } =
    await supabase.auth
      .getUser();


  if (!user) return;


  const metadata =
    user.user_metadata || {};


  $("detailContent").innerHTML = `

    <div class="info-card">

      <h3>Account information</h3>

      <div class="info-row">
        <span>Name</span>

        <span>
          ${escapeHtml(
            metadata.full_name ||
            "Not set"
          )}
        </span>
      </div>

      <div class="info-row">
        <span>Email</span>

        <span>
          ${escapeHtml(
            user.email || ""
          )}
        </span>
      </div>

      <div class="info-row">
        <span>Email verified</span>

        <span>
          ${
            user.email_confirmed_at
              ? "Yes"
              : "Pending"
          }
        </span>
      </div>

      <div class="info-row">
        <span>Account created</span>

        <span>
          ${
            user.created_at
              ? new Date(
                  user.created_at
                ).toLocaleDateString()
              : "Unknown"
          }
        </span>
      </div>

    </div>


    <div class="info-card">

      <h3>Security</h3>

      <p>
        Your secret SOS code is stored with
        your authenticated account information.
        It is not displayed on the calculator.
      </p>

      <p style="margin-top:10px;">
        Never share your secret SOS code
        with another person.
      </p>

    </div>

  `;
}


/* =========================================================
   EMERGENCY CONTACTS
========================================================= */

async function renderContacts() {

  $("detailContent").innerHTML = `

    <button
      id="addContactBtn"
      class="primary-btn"
    >
      Add emergency contact
    </button>

    <div
      id="contactsList"
      style="margin-top:18px;"
    >
      Loading contacts...
    </div>

  `;


  $("addContactBtn")
    ?.addEventListener(
      "click",
      () => openContactModal()
    );


  await loadContacts();
}


async function loadContacts() {

  const {
    data: { user }
  } =
    await supabase.auth
      .getUser();


  if (!user) return;


  const {
    data: contacts,
    error
  } =
    await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user.id)
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  const container =
    $("contactsList");


  if (!container) return;


  if (error) {

    container.innerHTML = `

      <div class="info-card">
        Unable to load contacts.
      </div>

    `;

    return;
  }


  if (
    !contacts ||
    contacts.length === 0
  ) {

    container.innerHTML = `

      <div class="info-card">

        <h3>
          No emergency contacts
        </h3>

        <p>
          Add at least one trusted person
          so that an emergency SMS can be sent.
        </p>

      </div>

    `;

    return;
  }


  container.innerHTML =
    contacts
      .map(
        (contact) => `

      <div class="contact-item">

        <div class="contact-info">

          <strong>
            ${escapeHtml(
              contact.name
            )}
          </strong>

          <span>
            ${escapeHtml(
              contact.phone
            )}
          </span>

        </div>

        <div class="contact-actions">

          <button
            class="small-btn"
            data-edit-contact="${contact.id}"
          >
            Edit
          </button>

          <button
            class="small-btn delete"
            data-delete-contact="${contact.id}"
          >
            Delete
          </button>

        </div>

      </div>

    `
      )
      .join("");


  document
    .querySelectorAll(
      "[data-edit-contact]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset
              .editContact;


          const contact =
            contacts.find(
              (item) =>
                item.id === id
            );


          if (contact) {

            openContactModal(
              contact
            );
          }
        }
      );
    });


  document
    .querySelectorAll(
      "[data-delete-contact]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset
              .deleteContact;

          await deleteContact(id);
        }
      );
    });
}


function openContactModal(
  contact = null
) {

  $("contactModal")
    ?.classList
    .remove("hidden");


  $("contactModalTitle").textContent =
    contact
      ? "Edit emergency contact"
      : "Add emergency contact";


  $("contactName").value =
    contact?.name || "";


  $("contactPhone").value =
    contact?.phone || "";


  $("saveContactBtn")
    .dataset
    .editId =
      contact?.id || "";


  $("contactMessage").textContent =
    "";
}


$("closeContactModalBtn")
  ?.addEventListener(
    "click",
    closeContactModal
  );


function closeContactModal() {

  $("contactModal")
    ?.classList
    .add("hidden");
}


$("saveContactBtn")
  ?.addEventListener(
    "click",
    async () => {

      const name =
        $("contactName")
          ?.value.trim() || "";

      const phone =
        $("contactPhone")
          ?.value.trim() || "";

      const editId =
        $("saveContactBtn")
          ?.dataset.editId || "";

      const message =
        $("contactMessage");


      setMessage(
        message,
        ""
      );


      if (!name || !phone) {

        setMessage(
          message,
          "Enter both name and phone number."
        );

        return;
      }


      try {

        const {
          data: { user }
        } =
          await supabase.auth
            .getUser();


        if (!user) {

          throw new Error(
            "You are not signed in."
          );
        }


        if (editId) {

          const {
            error
          } =
            await supabase
              .from(
                "emergency_contacts"
              )
              .update({
                name,
                phone
              })
              .eq(
                "id",
                editId
              )
              .eq(
                "user_id",
                user.id
              );


          if (error) {
            throw error;
          }


        } else {

          const {
            error
          } =
            await supabase
              .from(
                "emergency_contacts"
              )
              .insert({

                user_id:
                  user.id,

                name,

                phone
              });


          if (error) {
            throw error;
          }
        }


        closeContactModal();

        await loadContacts();


      } catch (error) {

        console.error(error);

        setMessage(
          message,
          error?.message ||
            "Unable to save contact."
        );
      }
    }
  );


async function deleteContact(id) {

  try {

    const {
      data: { user }
    } =
      await supabase.auth
        .getUser();


    if (!user) return;


    const {
      error
    } =
      await supabase
        .from(
          "emergency_contacts"
        )
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        );


    if (error) {
      throw error;
    }


    await loadContacts();


  } catch (error) {

    console.error(
      "Delete contact error:",
      error
    );
  }
}


/* =========================================================
   ACTIVITY HISTORY
========================================================= */

async function renderHistory() {

  $("detailContent").innerHTML = `

    <div id="historyContainer">
      Loading history...
    </div>

  `;


  await loadHistory();
}


async function loadHistory() {

  const {
    data: { user }
  } =
    await supabase.auth
      .getUser();


  if (!user) return;


  const {
    data: alerts,
    error
  } =
    await supabase
      .from("sos_alerts")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  const container =
    $("historyContainer");


  if (!container) return;


  if (error) {

    container.innerHTML = `

      <div class="info-card">
        Unable to load history.
      </div>

    `;

    return;
  }


  if (
    !alerts ||
    alerts.length === 0
  ) {

    container.innerHTML = `

      <div class="info-card">

        <h3>
          No emergency history
        </h3>

        <p>
          Emergency activity will appear
          here when an SOS alert is processed.
        </p>

      </div>

    `;

    return;
  }


  container.innerHTML = "";


  for (
    const alert of alerts
  ) {

    const date =
      alert.created_at
        ? new Date(
            alert.created_at
          ).toLocaleString()
        : "Unknown";


    let audioHtml = "";


    if (alert.audio_path) {

      try {

        const {
          data,
          error
        } =
          await supabase.storage
            .from("sos-audio")
            .createSignedUrl(
              alert.audio_path,
              60 * 60
            );


        if (
          !error &&
          data?.signedUrl
        ) {

          audioHtml = `

            <a
              class="audio-link"
              href="${data.signedUrl}"
              target="_blank"
              rel="noopener"
            >
              Open audio recording
            </a>

          `;
        }


      } catch (error) {

        console.error(
          "Audio history error:",
          error
        );
      }
    }


    let locationHtml =
      "Location unavailable";


    if (
      typeof alert.latitude ===
        "number" &&
      typeof alert.longitude ===
        "number"
    ) {

      const mapUrl =
        `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;


      locationHtml = `

        <a
          href="${mapUrl}"
          target="_blank"
          rel="noopener"
        >
          Open location
        </a>

      `;
    }


    const item =
      document.createElement(
        "div"
      );


    item.className =
      "history-item";


    item.innerHTML = `

      <h4>
        Emergency alert
      </h4>

      <p>
        <strong>Date:</strong>
        ${escapeHtml(date)}
      </p>

      <p>
        <strong>Location:</strong>
        ${locationHtml}
      </p>

      <span class="status-badge">
        ${escapeHtml(
          alert.status ||
          "unknown"
        )}
      </span>

      ${audioHtml}

    `;


    container.appendChild(item);
  }
}


/* =========================================================
   SETTINGS
========================================================= */

async function renderSettings() {

  $("detailContent").innerHTML = `

    <div class="info-card">

      <h3>
        Change password
      </h3>

      <p>
        Change the password used to sign in
        to SilentSOS.
      </p>

      <label>
        New password
      </label>

      <input
        id="newPassword"
        type="password"
        placeholder="Enter new password"
      />

      <button
        id="changePasswordBtn"
        class="primary-btn"
      >
        Update password
      </button>

      <p
        id="passwordMessage"
        class="form-message"
      ></p>

    </div>


    <div class="info-card">

      <h3>
        Secret SOS code
      </h3>

      <p>
        This private calculator code triggers
        the emergency process when you press
        the "=" button.
      </p>

      <label>
        New secret code
      </label>

      <input
        id="newSecretCode"
        type="password"
        inputmode="numeric"
        maxlength="12"
        placeholder="Enter new secret code"
      />

      <button
        id="changeSecretBtn"
        class="primary-btn"
      >
        Update secret code
      </button>

      <p
        id="secretMessage"
        class="form-message"
      ></p>

    </div>


    <div class="info-card">

      <h3>
        Important
      </h3>

      <p>
        The secret code is not shown anywhere
        on the calculator. The emergency process
        is checked only when "=" is pressed.
      </p>

    </div>

  `;


  $("changePasswordBtn")
    ?.addEventListener(
      "click",
      changePassword
    );


  $("changeSecretBtn")
    ?.addEventListener(
      "click",
      changeSecretCode
    );
}


async function changePassword() {

  const password =
    $("newPassword")
      ?.value.trim() || "";

  const message =
    $("passwordMessage");


  if (password.length < 6) {

    setMessage(
      message,
      "Password must contain at least 6 characters."
    );

    return;
  }


  try {

    const {
      error
    } =
      await supabase.auth
        .updateUser({
          password
        });


    if (error) {
      throw error;
    }


    setMessage(
      message,
      "Password updated successfully.",
      true
    );


    $("newPassword").value =
      "";


  } catch (error) {

    console.error(
      "Password update error:",
      error
    );

    setMessage(
      message,
      error?.message ||
        "Unable to update password."
    );
  }
}


async function changeSecretCode() {

  const secret =
    $("newSecretCode")
      ?.value.trim() || "";

  const message =
    $("secretMessage");


  if (
    secret.length < 4 ||
    !/^\d+$/.test(secret)
  ) {

    setMessage(
      message,
      "Secret code must contain at least 4 numbers."
    );

    return;
  }


  try {

    const {
      error
    } =
      await supabase.auth
        .updateUser({

          data: {
            secret_code:
              secret
          }
        });


    if (error) {
      throw error;
    }


    setMessage(
      message,
      "Secret SOS code updated successfully.",
      true
    );


    $("newSecretCode").value =
      "";


  } catch (error) {

    console.error(
      "Secret code update error:",
      error
    );

    setMessage(
      message,
      error?.message ||
        "Unable to update secret code."
    );
  }
}


/* =========================================================
   HELP DESK DATA
========================================================= */

const helpText = {

  en: {

    introTitle:
      "SilentSOS Help Desk",

    introText:
      "This guide explains the complete application in simple steps. SilentSOS can be used like a normal calculator while emergency features remain available in the background.",

    language:
      "Help language",

    calculator:
      "Using the calculator",

    calculatorBody: `

      <p>
        The main screen is a normal calculator.
        You can perform everyday calculations
        without seeing emergency controls.
      </p>

      <ol>
        <li>Tap a number to enter it.</li>
        <li>Use +, −, × or ÷ for calculations.</li>
        <li>Use % for percentage calculations.</li>
        <li>Use DEL to remove the last number.</li>
        <li>Use AC to clear the calculator.</li>
        <li>Press = to calculate the answer.</li>
      </ol>

      <div class="warning-box">
        The emergency function does not activate
        simply because a number appears on screen.
        It is checked only when "=" is pressed.
      </div>

    `,

    menu:
      "Opening the application menu",

    menuBody: `

      <p>
        The three-dot button is inside the calculator
        display at the upper-right corner.
      </p>

      <ol>
        <li>Tap the three dots.</li>
        <li>The menu appears from the side.</li>
        <li>Select the feature you need.</li>
        <li>Use the back button to return.</li>
      </ol>

    `,

    contacts:
      "Emergency contacts",

    contactsBody: `

      <p>
        Emergency contacts are the people who
        receive the emergency SMS.
      </p>

      <ol>
        <li>Open the three-dot menu.</li>
        <li>Select Emergency Contacts.</li>
        <li>Tap Add emergency contact.</li>
        <li>Enter the person's name.</li>
        <li>Enter the mobile number.</li>
        <li>Save the contact.</li>
      </ol>

      <p>
        You can edit or remove contacts later.
      </p>

    `,

    secret:
      "Secret SOS code",

    secretBody: `

      <p>
        The secret SOS code is a private number
        chosen by you.
      </p>

      <ol>
        <li>Open the three-dot menu.</li>
        <li>Open Settings.</li>
        <li>Find Secret SOS code.</li>
        <li>Enter a new code.</li>
        <li>Select Update secret code.</li>
      </ol>

      <p>
        During an emergency, enter the exact
        secret code and press "=".
      </p>

      <div class="warning-box">
        Never share your secret SOS code.
      </div>

    `,

    emergency:
      "What happens during an emergency",

    emergencyBody: `

      <ol>
        <li>Enter your private secret code.</li>
        <li>Press "=".</li>
        <li>The calculator continues normally.</li>
        <li>The application attempts to obtain your location.</li>
        <li>A short audio recording is created.</li>
        <li>The recording is uploaded securely.</li>
        <li>TextBee sends the emergency SMS.</li>
        <li>Your emergency contacts receive the message.</li>
      </ol>

      <p>
        No emergency popup is displayed on the
        calculator when the process starts.
      </p>

    `,

    location:
      "Live location",

    locationBody: `

      <p>
        If location permission is available,
        the emergency SMS contains a Google Maps link.
      </p>

      <p>
        The recipient can tap the link to open
        the location.
      </p>

      <div class="warning-box">
        Browser location permission and device
        location services must be available.
      </div>

    `,

    audio:
      "Emergency audio",

    audioBody: `

      <p>
        SilentSOS can record a short audio clip
        when the emergency process starts.
      </p>

      <ol>
        <li>The browser may ask for microphone permission.</li>
        <li>A short recording is made.</li>
        <li>The recording is uploaded to private storage.</li>
        <li>The SMS contains an audio access link.</li>
      </ol>

    `,

    history:
      "Activity history",

    historyBody: `

      <p>
        Activity History shows previous emergency
        alerts associated with your account.
      </p>

      <ul>
        <li>Date and time</li>
        <li>Processing status</li>
        <li>Location when available</li>
        <li>Audio recording when available</li>
      </ul>

    `,

    profile:
      "Profile",

    profileBody: `

      <p>
        Profile contains your name, email address,
        verification status and account information.
      </p>

    `,

    settings:
      "Settings",

    settingsBody: `

      <p>
        Settings contains important security controls.
      </p>

      <ul>
        <li>Change account password</li>
        <li>Change secret SOS code</li>
        <li>Review security information</li>
      </ul>

    `,

    troubleshooting:
      "Troubleshooting",

    troubleshootingBody: `

      <p>
        <strong>No SMS received:</strong>
      </p>

      <p>
        Check that an emergency contact exists,
        the TextBee phone is online and the SIM
        can send SMS.
      </p>

      <p>
        <strong>Location unavailable:</strong>
      </p>

      <p>
        Check browser location permission and
        device location services.
      </p>

      <p>
        <strong>Audio unavailable:</strong>
      </p>

      <p>
        Check microphone permission.
      </p>

      <p>
        <strong>Account problem:</strong>
      </p>

      <p>
        Make sure your email is verified and
        your password is correct.
      </p>

    `,

    demo:
      "Interactive demonstration"
  },


  hi: {

    introTitle:
      "SilentSOS सहायता केंद्र",

    introText:
      "यह गाइड पूरे application को आसान भाषा में समझाती है। SilentSOS सामान्य calculator की तरह इस्तेमाल किया जा सकता है और emergency सुविधाएँ background में उपलब्ध रहती हैं।",

    language:
      "सहायता की भाषा",

    calculator:
      "Calculator का उपयोग",

    calculatorBody: `

      <p>
        मुख्य screen सामान्य calculator की तरह दिखाई देती है।
      </p>

      <ol>
        <li>Number दबाकर number डालें।</li>
        <li>+, −, × या ÷ से calculation करें।</li>
        <li>% से percentage निकालें।</li>
        <li>DEL से आखिरी number हटाएँ।</li>
        <li>AC से calculator साफ करें।</li>
        <li>Answer के लिए = दबाएँ।</li>
      </ol>

      <div class="warning-box">
        केवल number दिखाई देने से SOS शुरू नहीं होता।
        SOS की जाँच केवल "=" दबाने के बाद होती है।
      </div>

    `,

    menu:
      "Menu कैसे खोलें",

    menuBody: `

      <p>
        Calculator display के ऊपर दाईं तरफ
        तीन dots का button है।
      </p>

      <ol>
        <li>तीन dots दबाएँ।</li>
        <li>Side menu खुलेगा।</li>
        <li>जरूरी feature चुनें।</li>
        <li>वापस आने के लिए back दबाएँ।</li>
      </ol>

    `,

    contacts:
      "Emergency Contacts",

    contactsBody: `

      <p>
        Emergency Contacts वे लोग हैं जिन्हें
        emergency SMS मिलेगा।
      </p>

      <ol>
        <li>तीन dots खोलें।</li>
        <li>Emergency Contacts चुनें।</li>
        <li>Add emergency contact दबाएँ।</li>
        <li>नाम डालें।</li>
        <li>Mobile number डालें।</li>
        <li>Save करें।</li>
      </ol>

    `,

    secret:
      "गुप्त SOS Code",

    secretBody: `

      <p>
        Secret SOS Code आपका निजी emergency number है।
      </p>

      <ol>
        <li>तीन dots खोलें।</li>
        <li>Settings खोलें।</li>
        <li>Secret SOS code चुनें।</li>
        <li>नया code डालें।</li>
        <li>Update secret code दबाएँ।</li>
      </ol>

      <div class="warning-box">
        अपना Secret SOS Code किसी दूसरे व्यक्ति को न बताएं।
      </div>

    `,

    emergency:
      "Emergency में क्या होता है",

    emergencyBody: `

      <ol>
        <li>Secret code डालें।</li>
        <li>"=" दबाएँ।</li>
        <li>Calculator सामान्य रूप से चलता रहता है।</li>
        <li>App location प्राप्त करने की कोशिश करता है।</li>
        <li>छोटा audio record होता है।</li>
        <li>Audio सुरक्षित रूप से upload होता है।</li>
        <li>TextBee के माध्यम से SMS भेजा जाता है।</li>
        <li>Emergency contacts को message मिलता है।</li>
      </ol>

    `,

    location:
      "Live Location",

    locationBody: `

      <p>
        Location उपलब्ध होने पर SMS में
        Google Maps link मिलेगा।
      </p>

      <p>
        Recipient link दबाकर location देख सकता है।
      </p>

    `,

    audio:
      "Emergency Audio",

    audioBody: `

      <p>
        Emergency के समय SilentSOS छोटा audio
        record कर सकता है।
      </p>

      <ol>
        <li>Microphone permission मांगी जा सकती है।</li>
        <li>कुछ seconds की recording होगी।</li>
        <li>Audio सुरक्षित storage में upload होगा।</li>
        <li>SMS में audio access link मिलेगा।</li>
      </ol>

    `,

    history:
      "Activity History",

    historyBody: `

      <p>
        यहाँ आपके पिछले emergency alerts दिखाई देंगे।
      </p>

      <ul>
        <li>Date और time</li>
        <li>Status</li>
        <li>Location</li>
        <li>Audio recording</li>
      </ul>

    `,

    profile:
      "Profile",

    profileBody: `

      <p>
        Profile में आपका नाम, email,
        verification status और account information दिखाई देती है।
      </p>

    `,

    settings:
      "Settings",

    settingsBody: `

      <p>
        Settings में password और Secret SOS Code बदला जा सकता है।
      </p>

    `,

    troubleshooting:
      "समस्या होने पर",

    troubleshootingBody: `

      <p>
        <strong>SMS नहीं आया:</strong>
      </p>

      <p>
        Emergency contact मौजूद है या नहीं,
        TextBee phone online है या नहीं और SIM
        SMS भेज सकती है या नहीं देखें।
      </p>

      <p>
        <strong>Location नहीं मिली:</strong>
      </p>

      <p>
        Browser location permission और phone
        location services देखें।
      </p>

      <p>
        <strong>Audio नहीं बना:</strong>
      </p>

      <p>
        Microphone permission check करें।
      </p>

    `,

    demo:
      "इंटरैक्टिव डेमो"
  },


  mr: {

    introTitle:
      "SilentSOS मदत केंद्र",

    introText:
      "हे मार्गदर्शन संपूर्ण application अगदी सोप्या पद्धतीने समजावते. SilentSOS सामान्य calculator सारखे वापरता येते आणि emergency सुविधा background मध्ये उपलब्ध असतात.",

    language:
      "मदतीची भाषा",

    calculator:
      "Calculator कसा वापरायचा",

    calculatorBody: `

      <p>
        मुख्य screen सामान्य calculator सारखी दिसते.
      </p>

      <ol>
        <li>Number टाकण्यासाठी number दाबा.</li>
        <li>+, −, × किंवा ÷ वापरा.</li>
        <li>Percentage साठी % वापरा.</li>
        <li>शेवटचा number काढण्यासाठी DEL वापरा.</li>
        <li>Calculator साफ करण्यासाठी AC वापरा.</li>
        <li>उत्तरासाठी = दाबा.</li>
      </ol>

      <div class="warning-box">
        स्क्रीनवर फक्त number दिसल्यामुळे SOS सुरू होत नाही.
        SOS ची तपासणी फक्त "=" दाबल्यानंतर होते.
      </div>

    `,

    menu:
      "Menu कसा उघडायचा",

    menuBody: `

      <p>
        Calculator display च्या वरच्या उजव्या बाजूला
        तीन dots चे button आहे.
      </p>

      <ol>
        <li>तीन dots दाबा.</li>
        <li>उजव्या बाजूला menu उघडेल.</li>
        <li>आवश्यक feature निवडा.</li>
        <li>परत calculator वर जाण्यासाठी back दाबा.</li>
      </ol>

    `,

    contacts:
      "Emergency Contacts",

    contactsBody: `

      <p>
        Emergency Contacts म्हणजे emergency SMS
        मिळणारे विश्वासू लोक.
      </p>

      <ol>
        <li>तीन dots चे menu उघडा.</li>
        <li>Emergency Contacts निवडा.</li>
        <li>Add emergency contact दाबा.</li>
        <li>नाव टाका.</li>
        <li>Mobile number टाका.</li>
        <li>Save करा.</li>
      </ol>

    `,

    secret:
      "Secret SOS Code",

    secretBody: `

      <p>
        Secret SOS Code हा तुमचा private emergency number आहे.
      </p>

      <ol>
        <li>तीन dots उघडा.</li>
        <li>Settings उघडा.</li>
        <li>Secret SOS code निवडा.</li>
        <li>नवीन code टाका.</li>
        <li>Update secret code दाबा.</li>
      </ol>

    `,

    emergency:
      "Emergency मध्ये काय होते",

    emergencyBody: `

      <ol>
        <li>Secret code टाका.</li>
        <li>"=" दाबा.</li>
        <li>Calculator सामान्यपणे सुरू राहतो.</li>
        <li>Application location मिळवण्याचा प्रयत्न करते.</li>
        <li>छोटे audio recording केले जाते.</li>
        <li>Audio सुरक्षितपणे upload केले जाते.</li>
        <li>TextBee द्वारे SMS पाठवला जातो.</li>
        <li>Emergency contacts ला message मिळतो.</li>
      </ol>

    `,

    location:
      "Live Location",

    locationBody: `

      <p>
        Location उपलब्ध असल्यास SMS मध्ये
        Google Maps link मिळेल.
      </p>

      <p>
        Recipient link दाबून location पाहू शकतो.
      </p>

    `,

    audio:
      "Emergency Audio",

    audioBody: `

      <p>
        Emergency वेळी SilentSOS छोटा audio record करू शकते.
      </p>

      <ol>
        <li>Microphone permission मागितली जाऊ शकते.</li>
        <li>काही seconds चे recording केले जाईल.</li>
        <li>Audio सुरक्षित storage मध्ये upload होईल.</li>
        <li>SMS मध्ये audio access link असेल.</li>
      </ol>

    `,

    history:
      "Activity History",

    historyBody: `

      <p>
        येथे मागील emergency alerts दिसतील.
      </p>

      <ul>
        <li>Date आणि time</li>
        <li>Status</li>
        <li>Location</li>
        <li>Audio recording</li>
      </ul>

    `,

    profile:
      "Profile",

    profileBody: `

      <p>
        Profile मध्ये तुमचे नाव, email आणि
        account information दिसते.
      </p>

    `,

    settings:
      "Settings",

    settingsBody: `

      <p>
        Settings मध्ये password आणि Secret SOS Code बदलता येतो.
      </p>

    `,

    troubleshooting:
      "अडचण आल्यास",

    troubleshootingBody: `

      <p>
        <strong>SMS आला नाही:</strong>
      </p>

      <p>
        Emergency contact आहे का, TextBee phone online आहे का
        आणि SIM SMS पाठवू शकते का तपासा.
      </p>

      <p>
        <strong>Location मिळाली नाही:</strong>
      </p>

      <p>
        Browser location permission आणि phone location services तपासा.
      </p>

      <p>
        <strong>Audio तयार झाले नाही:</strong>
      </p>

      <p>
        Microphone permission तपासा.
      </p>

    `,

    demo:
      "Interactive Demo"
  }

};


/* =========================================================
   HELP DESK
========================================================= */

let currentHelpLanguage = "en";

let demoStep = 0;


const demoSteps = {

  en: [

    {
      number: "01",
      title: "Open SilentSOS",
      text:
        "After successful login, the application opens directly to the calculator."
    },

    {
      number: "02",
      title: "Open the menu",
      text:
        "Tap the three-dot button located inside the calculator display."
    },

    {
      number: "03",
      title: "Add contacts",
      text:
        "Open Emergency Contacts and save the people who should receive an emergency message."
    },

    {
      number: "04",
      title: "Set your secret code",
      text:
        "Open Settings and create a private code that only you know."
    },

    {
      number: "05",
      title: "Emergency action",
      text:
        "Enter the secret code into the calculator and press =. The calculator continues normally while the emergency process runs."
    },

    {
      number: "06",
      title: "Contact receives SMS",
      text:
        "The emergency contact receives an emergency message containing the location and audio access link."
    }

  ],


  hi: [

    {
      number: "01",
      title: "SilentSOS खोलें",
      text:
        "Login के बाद application सीधे calculator पर खुलता है।"
    },

    {
      number: "02",
      title: "Menu खोलें",
      text:
        "Calculator display में दिए गए तीन dots दबाएँ।"
    },

    {
      number: "03",
      title: "Contacts जोड़ें",
      text:
        "Emergency Contacts खोलकर trusted लोगों को save करें।"
    },

    {
      number: "04",
      title: "Secret code सेट करें",
      text:
        "Settings में जाकर अपना private emergency code बनाएं।"
    },

    {
      number: "05",
      title: "Emergency action",
      text:
        "Secret code डालकर = दबाएँ। Calculator सामान्य रूप से चलता रहेगा और emergency process background में चलेगा।"
    },

    {
      number: "06",
      title: "SMS मिलेगा",
      text:
        "Emergency contact को location और audio access link वाला message मिलेगा।"
    }

  ],


  mr: [

    {
      number: "01",
      title: "SilentSOS उघडा",
      text:
        "Login झाल्यानंतर application थेट calculator वर उघडते."
    },

    {
      number: "02",
      title: "Menu उघडा",
      text:
        "Calculator display मधील तीन dots दाबा."
    },

    {
      number: "03",
      title: "Contacts जोडा",
      text:
        "Emergency Contacts मध्ये trusted लोकांचे नंबर save करा."
    },

    {
      number: "04",
      title: "Secret code सेट करा",
      text:
        "Settings मध्ये तुमचा private emergency code तयार करा."
    },

    {
      number: "05",
      title: "Emergency action",
      text:
        "Secret code टाकून = दाबा. Calculator सामान्यपणे सुरू राहील आणि emergency process background मध्ये चालेल."
    },

    {
      number: "06",
      title: "SMS मिळेल",
      text:
        "Emergency contact ला location आणि audio access link असलेला message मिळेल."
    }

  ]

};


/* =========================================================
   RENDER HELP DESK
========================================================= */

function renderHelpDesk() {

  const t =
    helpText[
      currentHelpLanguage
    ];


  $("detailContent").innerHTML = `

    <div class="help-intro">

      <h3>
        ${t.introTitle}
      </h3>

      <p>
        ${t.introText}
      </p>

    </div>


    <label>
      ${t.language}
    </label>


    <select
      id="helpLanguage"
      class="language-selector"
    >

      <option
        value="en"
        ${
          currentHelpLanguage === "en"
            ? "selected"
            : ""
        }
      >
        English
      </option>

      <option
        value="hi"
        ${
          currentHelpLanguage === "hi"
            ? "selected"
            : ""
        }
      >
        हिंदी
      </option>

      <option
        value="mr"
        ${
          currentHelpLanguage === "mr"
            ? "selected"
            : ""
        }
      >
        मराठी
      </option>

    </select>


    <details
      class="help-section"
      open
    >

      <summary>
        ${t.calculator}
      </summary>

      <div class="help-body">
        ${t.calculatorBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.menu}
      </summary>

      <div class="help-body">
        ${t.menuBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.contacts}
      </summary>

      <div class="help-body">
        ${t.contactsBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.secret}
      </summary>

      <div class="help-body">
        ${t.secretBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.emergency}
      </summary>

      <div class="help-body">
        ${t.emergencyBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.location}
      </summary>

      <div class="help-body">
        ${t.locationBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.audio}
      </summary>

      <div class="help-body">
        ${t.audioBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.history}
      </summary>

      <div class="help-body">
        ${t.historyBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.profile}
      </summary>

      <div class="help-body">
        ${t.profileBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.settings}
      </summary>

      <div class="help-body">
        ${t.settingsBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.troubleshooting}
      </summary>

      <div class="help-body">
        ${t.troubleshootingBody}
      </div>

    </details>


    <details class="help-section">

      <summary>
        ${t.demo}
      </summary>

      <div class="help-body">

        <div class="demo-box">

          <div class="demo-screen">

            <div
              id="demoNumber"
              class="demo-screen-number"
            >
              01
            </div>

            <h3 id="demoTitle">
            </h3>

            <p
              id="demoText"
              class="demo-screen-text"
            >
            </p>

          </div>


          <div class="demo-controls">

            <button
              id="demoPrev"
            >
              Previous
            </button>

            <button
              id="demoNext"
            >
              Next
            </button>

          </div>


          <div
            id="demoCounter"
            class="demo-step-counter"
          >
          </div>

        </div>

      </div>

    </details>

  `;


  $("helpLanguage")
    ?.addEventListener(
      "change",
      (event) => {

        currentHelpLanguage =
          event.target.value;

        demoStep = 0;

        renderHelpDesk();
      }
    );


  $("demoPrev")
    ?.addEventListener(
      "click",
      () => {

        demoStep--;

        if (demoStep < 0) {

          demoStep =
            demoSteps[
              currentHelpLanguage
            ].length - 1;
        }

        updateDemo();
      }
    );


  $("demoNext")
    ?.addEventListener(
      "click",
      () => {

        demoStep++;

        if (
          demoStep >=
          demoSteps[
            currentHelpLanguage
          ].length
        ) {

          demoStep = 0;
        }

        updateDemo();
      }
    );


  updateDemo();
}


function updateDemo() {

  const steps =
    demoSteps[
      currentHelpLanguage
    ];


  const step =
    steps[demoStep];


  if (!step) return;


  $("demoNumber").textContent =
    step.number;


  $("demoTitle").textContent =
    step.title;


  $("demoText").textContent =
    step.text;


  $("demoCounter").textContent =
    `Step ${demoStep + 1} of ${steps.length}`;
}


/* =========================================================
   SIGN OUT
========================================================= */

$("signOutBtn")?.addEventListener(
  "click",
  async () => {

    try {

      await supabase.auth.signOut();

    } catch (error) {

      console.error(
        "Sign out error:",
        error
      );

    } finally {

      clearCalculator();

      closeMenu();

      closeDetail();
    }
  }
);


/* =========================================================
   LOCATION
========================================================= */

function getCurrentLocation() {

  return new Promise(
    (resolve) => {

      if (
        !navigator.geolocation
      ) {

        resolve(null);

        return;
      }


      navigator.geolocation.getCurrentPosition(

        (position) => {

          resolve({

            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude
          });
        },


        () => {

          resolve(null);
        },


        {

          enableHighAccuracy:
            true,

          timeout:
            15000,

          maximumAge:
            0
        }
      );

    }
  );
}


/* =========================================================
   AUDIO RECORDING
========================================================= */

async function recordEmergencyAudio() {

  if (
    !navigator.mediaDevices
      ?.getUserMedia
  ) {

    return null;
  }


  let stream = null;


  try {

    stream =
      await navigator.mediaDevices
        .getUserMedia({
          audio: true
        });


    const recorder =
      new MediaRecorder(
        stream
      );


    const chunks = [];


    recorder.ondataavailable =
      (event) => {

        if (
          event.data.size > 0
        ) {

          chunks.push(
            event.data
          );
        }
      };


    const recordingPromise =
      new Promise(
        (resolve) => {

          recorder.onstop =
            () => {

              const blob =
                new Blob(
                  chunks,
                  {
                    type:
                      "audio/webm"
                  }
                );

              resolve(blob);
            };
        }
      );


    recorder.start();


    await new Promise(
      (resolve) => {

        setTimeout(
          resolve,
          AUDIO_SECONDS * 1000
        );
      }
    );


    if (
      recorder.state !==
      "inactive"
    ) {

      recorder.stop();
    }


    const blob =
      await recordingPromise;


    return blob;


  } catch (error) {

    console.error(
      "Audio recording failed:",
      error
    );

    return null;


  } finally {

    if (stream) {

      stream
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );
    }
  }
}
/* =========================================================
   SILENT SOS
========================================================= */

async function triggerSilentSOS() {

  try {

    const {
      data: { session }
    } =
      await supabase.auth
        .getSession();


    if (!session) {

      console.error(
        "SilentSOS: no active session."
      );

      return;
    }


    /*
      Get location.
      If permission is denied, the SMS can still
      be sent without location.
    */

    const location =
      await getCurrentLocation();


    /*
      Record short emergency audio.
    */

    let audioPath = null;


    const audio =
      await recordEmergencyAudio();


    /*
      Upload audio to private Supabase storage.
    */

    if (audio) {

      const filePath =
        `${session.user.id}/${crypto.randomUUID()}.webm`;


      const {
        error: uploadError
      } =
        await supabase.storage
          .from("sos-audio")
          .upload(
            filePath,
            audio,
            {
              contentType:
                "audio/webm",

              upsert:
                false
            }
          );


      if (!uploadError) {

        audioPath =
          filePath;

      } else {

        console.error(
          "Audio upload failed:",
          uploadError
        );
      }
    }


    /*
      Send the emergency request
      to the Supabase Edge Function.
    */

    const response =
      await fetch(
        EDGE_FUNCTION_URL,
        {

          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              latitude:
                location?.latitude ??
                null,

              longitude:
                location?.longitude ??
                null,

              audio_path:
                audioPath
            })
        }
      );


    /*
      The Edge Function may return JSON.
      Safely handle a non-JSON response too.
    */

    let result = null;

    try {

      result =
        await response.json();

    } catch {

      result = null;
    }


    if (!response.ok) {

      console.error(
        "SilentSOS Edge Function error:",
        response.status,
        result
      );

      return;
    }


    console.log(
      "SilentSOS background result:",
      result
    );


  } catch (error) {

    /*
      VERY IMPORTANT:
      No popup.
      No toast.
      No visible SOS message.

      The calculator stays normal.
    */

    console.error(
      "SilentSOS background error:",
      error
    );
  }
}


/* =========================================================
   INITIAL CALCULATOR DISPLAY
========================================================= */

updateCalculatorDisplay();


/* =========================================================
   EXTRA MOBILE / TOUCH SAFETY
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    /*
      Do not reset calculator when the browser
      temporarily changes visibility.
    */

    if (
      document.visibilityState ===
      "visible"
    ) {

      updateCalculatorDisplay();
    }
  }
);