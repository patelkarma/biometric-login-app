# SecureID — Passwordless Login with a 6-digit Code, Face ID & Fingerprint

A full-stack web app built for the **Rsvr Technologies – React JS Developer** assignment.
Users sign up with an **email or a phone number**, their **date of birth and surname**, and sign in with a
**6-digit code** or **Face ID / fingerprint / Windows Hello**. An account can be active on **only one device at a time**.

**Stack:** React 19 · Vite 8 · Spring Boot 4 (Java 17) · Spring Security · JPA · H2 database · WebAuthn passkeys

---

## Contents

1. [About the project](#1-about-the-project)
2. [Requirement checklist](#2-requirement-checklist)
3. [What you need on your PC](#3-what-you-need-on-your-pc)
4. [Run it on localhost (step by step)](#4-run-it-on-localhost-step-by-step)
5. [Where do the 6-digit codes go?](#5-where-do-the-6-digit-codes-go)
6. [Try every feature (≈5 minutes)](#6-try-every-feature-5-minutes)
7. [Troubleshooting](#7-troubleshooting)
8. [How it works](#8-how-it-works)
9. [Database](#9-database)
10. [Tests](#10-tests)
11. [Developer mode](#11-developer-mode-hot-reload)
12. [API reference](#12-api-reference)
13. [Project structure](#13-project-structure)
14. [Configuration](#14-configuration)
15. [Security notes & future improvements](#15-security-notes--future-improvements)

---

## 1. About the project

**The assignment**

> Build an app with email or phone sign-up, DOB and surname. Allow login by 6-digit code, Face ID or other
> biometrics. Limit users to one active device.

**What was built**

- **Sign-up** with email *or* phone, first name, surname and date of birth, confirmed with a 6-digit code.
- **Login** with a 6-digit code, *or* with Face ID, Touch ID, fingerprint or Windows Hello (WebAuthn passkeys).
- **One active device**: signing in on a new device ends the session on the old one, which is told within seconds
  *("You've been signed out — your account was signed in on another device (Safari on iPhone)")*.
- **Dashboard** with three pages: *Overview*, *Devices* (session details) and *Biometrics* (add / remove biometric logins).
- **Email + phone on one account**: add your other contact later and sign in with either.
- **"Is this you?"**: if someone signs up again with the same name and date of birth, they are offered a *secure*
  way to link the two accounts (it needs a code from both contacts — matching details alone never log anyone in).
- **Responsive design** for phones, tablets and laptops.
- **Runs with one command**, no database or API keys to set up.

---

## 2. Requirement checklist

| Requirement | How it is implemented |
|---|---|
| **Sign-up with email** | Sign-up form → *Email* → 6-digit code verifies the address |
| **Sign-up with phone** | Sign-up form → *Phone* (country code picker, +91 default, Indian mobile validation) → 6-digit code |
| **Date of birth** | Required; not in the future; minimum age 13. Checked in the browser **and** on the server |
| **Surname** | Required (with first name); letters, spaces, `'` and `-` only. Checked in the browser and on the server |
| **Login by 6-digit code** | Code sent to the email / phone typed; expires in 5 min; locks after 5 wrong tries; resend cooldown; a new code cancels the old one; one code can be used only once (even by 5 devices at the same moment) |
| **Login by Face ID** | WebAuthn passkey with *user verification required* → Face ID on iPhone / iPad |
| **Other biometrics** | Same passkey flow → Touch ID (Mac), fingerprint / face unlock (Android), Windows Hello (face, fingerprint or PIN) |
| **One active device** | Every login ends all other sessions of the account in one locked database transaction; the old device finds out within ~5 s |

---

## 3. What you need on your PC

| Needed | Version | Check it with | Download |
|---|---|---|---|
| **Java JDK** | **17 or newer** (a JDK, not only a JRE) | `java -version` | <https://adoptium.net> |
| **Node.js** (includes npm) | **20 or newer** | `node -v` and `npm -v` | <https://nodejs.org> (LTS) |
| **Web browser** | Chrome, Edge, Safari or Firefox (recent) | — | — |
| **Internet** | first run only | — | downloads Maven and npm packages (~300 MB) |
| **Free port** | 8080 | — | see [Troubleshooting](#7-troubleshooting) if it is busy |

You do **not** need to install Maven (the Maven wrapper `mvnw` is included), a database (H2 is built in),
or any email / SMS account.

**Optional:** a device with Face ID, Touch ID, a fingerprint reader or Windows Hello to try biometric login
(a phone can also be used through a QR code — see section 6).

Works on **Windows, macOS and Linux**.

---

## 4. Run it on localhost (step by step)

1. **Unzip** `biometric-login-app.zip` anywhere, e.g. `D:\biometric-login-app`.
2. **Open the folder** that contains `run.bat`, `run.sh`, `backend` and `frontend`.
3. **Start the app**
   - **Windows:** double-click **`run.bat`**
     (or open PowerShell / Command Prompt in the folder and run `.\run.bat`)
   - **macOS / Linux:** open a terminal in the folder and run `sh run.sh`
4. **Wait** until the window shows a line like:
   ```
   Started BackendApplication in 12.1 seconds
   ```
   The **first run takes 1–3 minutes** because it downloads dependencies. Later runs take ~15 seconds.
5. **Open <http://localhost:8080>** in your browser.
   Use **`localhost`**, not `127.0.0.1` — browsers allow Face ID / fingerprint only on `localhost` or HTTPS.
6. **Keep the window open.** It is the backend: the 6-digit codes appear in it.
7. **To stop** the app, press **`Ctrl + C`** in that window.

**What `run.bat` / `run.sh` do**

```
[1/3] npm install       -> installs the frontend packages
[2/3] npm run build     -> builds the React app and copies it into the backend
[3/3] mvnw spring-boot:run -> starts the backend, which also serves the React app on port 8080
```

---

## 5. Where do the 6-digit codes go?

No email or SMS service is configured (real SMS needs a paid, registered gateway), so the backend
**prints every code in its terminal window**:

```
==================================================
  DEMO DELIVERY (SMS gateway not configured)
  To:   +919876543210
  Code: 482913
==================================================
```

The Verify screen reminds you: *"Check the backend logs for your code"*.
The code is **never sent to the browser** (not even in the API response) — just as a real one-time code would only
reach the owner's phone or inbox.

**Optional – real emails:** set a Gmail address and a
[Gmail App Password](https://myaccount.google.com/apppasswords) before starting; email codes are then really sent:

```bat
:: Windows (Command Prompt)
set MAIL_USERNAME=you@gmail.com
set MAIL_PASSWORD=your16charapppassword
run.bat
```
```sh
# macOS / Linux
MAIL_USERNAME=you@gmail.com MAIL_PASSWORD=your16charapppassword sh run.sh
```

---

## 6. Try every feature (≈5 minutes)

1. **Sign up with a phone** — *Create account* → first name, surname, date of birth → *Phone* → `98765 43210`
   → *Continue* → type the code from the backend window.
2. **Enable biometrics** — you are offered *Enable biometrics* right after signing up. Approve with Face ID /
   Touch ID / fingerprint / Windows Hello. (*Skip for now* is fine too.)
3. **Biometric login** — *Log out*, then press **Face ID / Fingerprint** on the login screen. No email or code needed.
4. **One active device** — keep the dashboard open, open an **Incognito / InPrivate window** (or another browser —
   each counts as a separate device) and sign in to the same account. Within ~5 seconds the first window shows
   *"You've been signed out"*, naming the new device.
5. **Dashboard pages** — *Overview*, *Devices* (signed in, method, last activity, expiry) and *Biometrics*
   (list, add, remove). On a phone these are tabs under the top bar.
6. **Add your email to the same account** — Overview → *Email & phone* → **+ Add email** → enter the code.
   Log out and sign in with the email: it opens the same account.
7. **"Is this you?"** — sign up with an **email**, log out, then sign up again with a **phone** using the **same
   first name, surname and date of birth**. After verifying the phone you are asked whether the existing account
   (shown masked, e.g. `ka***@example.com`) is yours:
   *Yes* → enter the code sent to that email → the accounts become one. *No* → you keep a separate account.
8. **Code rules** — enter a wrong code 5 times → the code is locked and a new one is needed.
9. **Responsive** — press `F12` → `Ctrl + Shift + M` (device toolbar) → pick a phone.

> **No biometric hardware?** Chrome / Edge offer *"Use a phone or tablet"* in the passkey dialog — scan the QR code
> with your phone and use its Face ID / fingerprint. Chrome DevTools → ⋮ → *More tools* → *WebAuthn* can also
> emulate an authenticator.

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| `'java' is not recognized` / `npm is not recognized` | Install Java 17+ / Node.js 20+ (section 3), then open a **new** terminal window. |
| `Port 8080 was already in use` | Close the program using 8080, **or** start on another port (Windows): `set SERVER_PORT=8090` and `set APP_WEBAUTHN_ORIGINS=http://localhost:8090`, then `run.bat`, and open <http://localhost:8090>. |
| The **Face ID / Fingerprint** button does nothing or is disabled | Open the app at `http://localhost:…` (not an IP address) in Chrome, Edge or Safari, and set up biometrics once after a code login. |
| *"Biometric login is not set up for this account yet"* | Sign in with a code first, then *Enable biometrics* (or Dashboard → Biometrics → *Add*). |
| *"Please wait 30 seconds before requesting a new code"* | Expected: there is a short cooldown between codes. |
| First start is slow | Normal: dependencies are downloaded once. |
| Want an empty database | Stop the app and delete the folder `backend/data`. |
| In developer mode every request fails with **502** | The frontend cannot reach the backend: start the backend first, and if it is not on 8080 set `BACKEND_URL` (section 11). |

---

## 8. How it works

```
 Browser (React)                         Spring Boot                                   H2 database
 ───────────────                         ───────────                                   ───────────
 Sign-up / Login / Verify   ── /api ──▶  AuthController ─▶ AuthService ─▶ OtpService ──▶ otp_codes (hashed)
 Face ID / fingerprint      ── /api ──▶  WebAuthnService (Yubico library) ──────────────▶ passkey_credentials (public keys)
 Dashboard, add contact     ── /api ──▶  AccountController ─▶ Account / Contact / AccountLink services ─▶ app_users
 Heartbeat every 5 s        ── /api ──▶  TokenAuthFilter ─▶ SessionService ────────────▶ device_sessions (hashed tokens)
```

### 6-digit codes
A random code from `SecureRandom` is stored **only as a SHA-256 hash**. It expires after 5 minutes and locks after
5 wrong tries (wrong guesses are saved in their own transaction, so they cannot be undone). A new code cancels the
old one, there is a resend cooldown, and optimistic locking makes sure one code works only once even when several
devices send it at the same moment. The code goes to the email or phone the user **typed** (an account may have both).

### Face ID / fingerprint (WebAuthn passkeys)
1. After a code login, the browser creates a key pair inside the device's secure hardware (Secure Enclave / TPM),
   unlocked only by the user's face or fingerprint. The server stores **only the public key**.
2. To sign in, the server sends a random challenge; the device asks for Face ID / fingerprint and signs it.
3. The server (Yubico `webauthn-server-core`) checks the signature, the website origin, the *user verified* flag
   and the signature counter.

Biometric data never leaves the device. Passkeys are *discoverable*, so **Face ID / Fingerprint** works without
typing an email.

### One active device
- Each browser gets a random `deviceId`; each login creates a `device_sessions` row with a random 256-bit token
  (only its SHA-256 hash is stored).
- `SessionService.startSession` locks the user row, **ends every other active session** and creates the new one in
  one transaction — two simultaneous logins can never both stay active.
- Requests with an ended token get `401 SESSION_REVOKED`. The React app checks a heartbeat every 5 seconds (and when
  the window gets focus), so the old device shows the *signed out* screen almost immediately.

### One person, one account (email + phone)
- An account can have **one email and one phone**; each email / phone belongs to only one account.
- **Add email / phone:** a code is sent to the new contact; it is attached only after that code is entered.
  These codes are tied to the signed-in user, so nobody else can use them.
- **"Is this you?":** the same first name + surname + date of birth is only a *hint* — different people can share
  them and anyone could type them — so it never logs anyone in or blocks a sign-up. Linking requires a code sent to
  the **existing** account's contact. The masked contact is shown only to someone who has just verified their own
  new contact. After linking, the duplicate account is deleted and the device is signed in to the original account.

---

## 9. Database

The app uses **H2**, a full SQL database that runs inside the Java backend, so reviewers do not have to install
or configure a database server.

- **File:** `backend/data/biometricdb.mv.db` — created on first start; data survives restarts.
- **Tables:** `app_users`, `otp_codes` (hashed codes), `device_sessions` (hashed tokens), `passkey_credentials`
  (public keys only). They are created automatically from the Java entity classes.
- **Look inside:** while the app runs, open <http://localhost:8080/h2-console> → JDBC URL
  `jdbc:h2:file:./data/biometricdb`, user `sa`, empty password.
- **Production:** because all access goes through Spring Data JPA, switching to PostgreSQL / MySQL is mainly a
  configuration change (datasource URL + driver), plus Flyway migrations instead of automatic schema updates.

---

## 10. Tests

```sh
cd backend
./mvnw test        # Windows: .\mvnw test
```

**11 integration tests** run against the real HTTP API with an in-memory database. They include a **software WebAuthn
authenticator** (ES256 key pair) that creates a passkey and signs in with it, so the biometric flow is tested
end-to-end without a real finger:

- email sign-up → code → enable biometrics → biometric login on a second device → first device gets `SESSION_REVOKED` → replayed login rejected → logout
- phone sign-up; duplicate account rejected
- validation (missing surname / date of birth, under 13, invalid email)
- 5 wrong codes lock the code; the same code sent by 5 devices at once signs in only one
- codes are read from the backend log, and the API response never contains the code
- add a phone to an email account → sign in with either → still one active device
- a contact used by another account cannot be added, and someone else's code cannot be used
- "Is this you?": linking only with a code from the existing account; a different person / different birthday is not linked
- database columns for enums are stored as text, so new values never need a database change

---

## 11. Developer mode (hot reload)

Run backend and frontend separately (two terminals):

```sh
# Terminal 1 – backend (API on http://localhost:8080; codes are printed here)
cd backend
./mvnw spring-boot:run

# Terminal 2 – frontend (UI on http://localhost:5173, forwards /api to the backend)
cd frontend
npm install
npm run dev
```

Port 8080 busy? Use another backend port and tell the frontend (Windows PowerShell):

```powershell
# Terminal 1
.\mvnw spring-boot:run "-Dspring-boot.run.arguments=--server.port=8090"
# Terminal 2
$env:BACKEND_URL="http://localhost:8090"; npm run dev
```

---

## 12. API reference

| Method | Path | Sign-in needed | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | – | first name, surname, date of birth, email **or** phone → sends a code |
| POST | `/api/auth/otp/request` | – | send a login code |
| POST | `/api/auth/otp/verify` | – | check the code → session (signs out other devices) |
| POST | `/api/auth/passkey/login/start` · `/finish` | – | biometric login → session (signs out other devices) |
| GET | `/api/me` | ✔ | profile, this device's session, biometric logins |
| GET | `/api/session/heartbeat` | ✔ | "is this device still the active one?" |
| POST | `/api/session/logout` | ✔ | end this session |
| POST | `/api/passkeys/register/start` · `/finish` | ✔ | enable biometrics on this device |
| DELETE | `/api/passkeys/{id}` | ✔ | remove a biometric login |
| POST | `/api/contacts/start` · `/verify` | ✔ | add the missing email / phone (code sent to it) |
| GET | `/api/link/match` | ✔ | "Is this you?" — the existing account (masked contact) |
| POST | `/api/link/start` · `/verify` | ✔ | code to the existing account → merge into it |

Errors always look like `{"code": "CODE_INCORRECT", "message": "Incorrect code. 4 attempts left."}`.

---

## 13. Project structure

```
biometric-login-app/
├── run.bat / run.sh          one command: build the frontend and start everything on :8080
├── backend/                  Spring Boot API  (src/main/java/com/biometric/backend/)
│   ├── web/                  HTTP only: AuthController, AccountController, GlobalExceptionHandler, SpaController
│   ├── service/              business rules:
│   │                           AuthService (sign-up, code login)      OtpService (6-digit codes)
│   │                           SessionService (one active device)     AccountService (profile, biometrics list)
│   │                           ContactService (add email / phone)     AccountLinkService ("Is this you?")
│   │                           NotificationService (email, or code printed in the log)
│   ├── webauthn/             Face ID / fingerprint: WebAuthnService + JpaCredentialRepository
│   ├── repository/           database access (Spring Data JPA)
│   ├── model/                database entities: User, OtpCode, DeviceSession, PasskeyCredential
│   ├── dto/                  request / response bodies
│   ├── security/             TokenAuthFilter (bearer token → signed-in user)
│   ├── config/               AppProperties (all app.* settings), SecurityConfig, WebAuthnConfig
│   ├── util/                 Crypto (hashing, random tokens), Identifiers (email / phone rules), DeviceNames
│   └── src/test/             integration tests (incl. software WebAuthn authenticator)
└── frontend/                 React app  (src/)
    ├── pages/                Login, SignUp, VerifyCode, EnableBiometrics, LinkAccount, SignedOut,
    │                         Dashboard (Overview), Devices, Biometrics
    ├── components/           AuthLayout, DashboardLayout, ContactInput, ContactsCard, DeviceRow, Logo, Icons,
    │                         code.jsx (OtpInput, CodeTimers, CodeDeliveryNote), ui.jsx (Alert, Button, TextField)
    ├── hooks/                useAsyncAction (busy / error state for API calls)
    ├── context/              AuthContext (token, profile, heartbeat, sign-out on another device)
    └── lib/                  api.js (all HTTP calls), biometrics.js, validation.js, format.js, contact.js,
                              device.js, pendingOtp.js
```

Request flow: `page → lib/api.js → web/*Controller → service/* → repository/* → H2`.
Each layer only calls the one below it.

---

## 14. Configuration

| Setting | Where | Default | Purpose |
|---|---|---|---|
| `MAIL_USERNAME`, `MAIL_PASSWORD` | environment variables | empty | send real emails (Gmail App Password) |
| `SERVER_PORT` | environment variable | `8080` | backend / app port |
| `APP_WEBAUTHN_ORIGINS` | environment variable | `http://localhost:5173,http://localhost:8080` | addresses allowed to use Face ID / fingerprint |
| `BACKEND_URL` | environment variable (frontend dev mode) | `http://localhost:8080` | where `npm run dev` forwards `/api` |
| `app.otp.*`, `app.session.*` | `backend/src/main/resources/application.properties` | 5 min, 5 tries, 30 s, 7 days | code expiry / attempts / cooldown, session length |

---

## 15. Security notes & future improvements

**Already in place**
- Codes and session tokens are stored only as SHA-256 hashes and compared in constant time.
- Codes are never sent to the browser; codes for adding a contact or linking accounts work only for the user who asked.
- Bearer tokens (no cookies) → no CSRF risk. One code works only once, even under concurrent requests.
- Biometric data never reaches the server — only public keys are stored.

**For production I would add**
- A real SMS provider (e.g. Twilio / MSG91) and email service.
- Tokens in an `HttpOnly; Secure; SameSite=Strict` cookie instead of `localStorage`.
- Per-IP rate limiting, HTTPS with the real domain as the WebAuthn RP ID.
- WebAuthn challenges in Redis (needed with more than one server), PostgreSQL with Flyway migrations.
