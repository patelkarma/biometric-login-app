# SecureID — Passwordless Login with 6-digit Code, Face ID & Fingerprint

A full-stack app built for the **Rsvr Technologies – React JS Developer** assignment:

> Build an app with email or phone sign-up, DOB and surname. Allow login by 6-digit code, Face ID or other biometrics. Limit users to one active device.

**Stack:** React 19 + Vite (frontend) · Spring Boot 4 + Spring Security + JPA (backend) · H2 database (no setup) · WebAuthn / passkeys for biometrics

---

## Requirement checklist

| Requirement | How it is implemented |
|---|---|
| **Sign-up with email** | Sign-up form → *Email* tab → 6-digit code verifies the address |
| **Sign-up with phone** | Sign-up form → *Phone* tab (country code picker, +91 default, Indian mobile validation) → 6-digit code |
| **Date of birth** | Mandatory; can't be in the future; minimum age 13. Checked in the browser **and** on the server |
| **Surname** | Mandatory (plus first name); letters, spaces, `'` and `-` only. Checked in the browser and on the server |
| **Login by 6-digit code** | Code sent to the email/phone; expires in 5 min; locks after 5 wrong attempts; resend cooldown; new code invalidates the old one |
| **Login by Face ID** | WebAuthn passkey with user verification **required** → iPhone/iPad Face ID |
| **Other biometrics** | Same passkey flow → Touch ID (Mac), fingerprint / face unlock (Android), Windows Hello (face, fingerprint or PIN) |
| **One active device** | Every login revokes all other sessions in one locked DB transaction. The old device finds out within ~5 s (heartbeat) and shows *"You've been signed out — your account was signed in on another device (Safari on iPhone)"* |

---

## Run it (one command)

**Prerequisites:** Java 17+ and Node.js 20+ (Maven is **not** needed — the Maven wrapper is included).

| OS | Command |
|---|---|
| Windows | double-click **`run.bat`** (or run it from a terminal) |
| macOS / Linux | `sh run.sh` |

Then open **http://localhost:8080** once the console shows `Started BackendApplication`
(the first run downloads dependencies and takes 1–2 minutes).

> Use **`localhost`**, not `127.0.0.1` — browsers only allow Face ID / fingerprint (WebAuthn) on `localhost` or HTTPS.

### Where do the 6-digit codes go?

No accounts or API keys are needed to try the app:

- **Phone:** real SMS needs a paid, DLT-registered gateway, so codes are delivered in **demo mode** — shown in a yellow *Demo delivery* box on the Verify screen (click it to auto-fill) and printed in the server console.
- **Email:** same demo mode by default. To send **real emails**, set a Gmail address and a [Gmail App Password](https://myaccount.google.com/apppasswords) before starting:

  ```bat
  :: Windows
  set MAIL_USERNAME=you@gmail.com
  set MAIL_PASSWORD=your16charapppassword
  run.bat
  ```
  ```sh
  # macOS / Linux
  MAIL_USERNAME=you@gmail.com MAIL_PASSWORD=your16charapppassword sh run.sh
  ```

### Developer mode (hot reload)

```sh
cd backend  && ./mvnw spring-boot:run      # API on :8080
cd frontend && npm install && npm run dev  # UI on http://localhost:5173 (proxies /api to :8080)
```

Port 8080 already taken? Start the API on another port and point the UI at it:

```sh
cd backend  && ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8090
cd frontend && BACKEND_URL=http://localhost:8090 npm run dev
```

### Responsive design
The UI ("Sage" design) is built mobile-first: above 900 px it shows a split card (green panel + form);
below 900 px the green panel collapses into a compact header with a 3-step progress bar, fields stack,
and all tap targets are at least 44 px. The dashboard sidebar becomes a top bar on phones.

### Tests

```sh
cd backend && ./mvnw test
```

The integration tests drive the real HTTP API and include a **software WebAuthn authenticator** (ES256 key pair)
that registers a passkey and signs in with it, so the biometric flow is verified end-to-end without a human finger:

- email sign-up → code → enable biometrics → biometric login on a second device → first device gets `SESSION_REVOKED` → replayed assertion rejected → logout
- phone sign-up, duplicate account rejected
- validation (missing surname / DOB, under-age, invalid email)
- 5 wrong codes lock the code

---

## Try every feature (≈3 minutes)

1. **Sign up with phone** — *Create account* → name, surname, DOB → *Phone* tab → `98765 43210` → click the demo code → you're in.
2. **Enable biometrics** — you are offered *Enable biometrics* right after the first login (or use *Add* on the dashboard). Approve with Face ID / Touch ID / fingerprint / Windows Hello.
3. **Log out**, then on the login screen press **Sign in with Face ID / Fingerprint** — no email or code needed.
4. **One active device** — keep the dashboard open, then open an **Incognito window** (or another browser — each counts as a separate device) and sign in to the same account. Within ~5 seconds the first window switches to *"You've been signed out"*, naming the new device.
5. **Sign up with email** — repeat step 1 using the *Email* tab.
6. **Code rules** — enter a wrong code 5 times → the code is locked and a new one is required.

> **No biometric hardware on your laptop?** Chrome/Edge offer *"Use a phone or tablet"* in the passkey dialog — scan the QR code with your phone and use its Face ID / fingerprint.
> Chrome DevTools → ⋮ → *More tools* → *WebAuthn* can also emulate an authenticator.

---

## How it works

```
 React (Vite)                         Spring Boot                               H2
 ─────────────                        ───────────                               ──
 SignUp / Login / Verify  ── /api ──▶  AuthController ─▶ AuthService ─▶ OtpService ──▶ otp_codes (hashed)
 Enable biometrics        ── /api ──▶  AccountController ─▶ WebAuthnService (Yubico) ─▶ passkey_credentials (public keys)
 AuthContext heartbeat 5s ── /api ──▶  TokenAuthFilter ─▶ SessionService ───────────▶ device_sessions (hashed tokens)
```

### 6-digit code
`SecureRandom` code → stored only as `SHA-256(identifier:code)` → 5-minute expiry, 5 attempts (wrong guesses are
counted in their own transaction so they can't be rolled back), resend cooldown, newer code invalidates older ones.

### Face ID / fingerprint (WebAuthn passkeys)
1. After a code login, the browser creates a key pair inside the device's secure hardware (Secure Enclave / TPM),
   unlocked only by the user's biometric. The server stores the **public key** only.
2. To sign in, the server sends a random challenge; the device asks for Face ID / fingerprint and signs it.
3. The server (Yubico `webauthn-server-core`) verifies the signature, the origin, the RP ID, the
   *user verified* flag and the signature counter.

Biometric data never leaves the device and the server never sees it. Passkeys are *discoverable*, so users can tap
**Sign in with Face ID / Fingerprint** without typing their email.

### One active device
- Each browser gets a random `deviceId` (localStorage); each login creates a `device_sessions` row with a random
  256-bit token (only its SHA-256 hash is stored).
- `SessionService.startSession` locks the user row, **revokes every other active session** and creates the new one, all in
  one transaction — so even two simultaneous logins can't both stay active.
- `TokenAuthFilter` answers requests carrying a revoked token with `401 SESSION_REVOKED`. The React app polls a
  heartbeat every 5 s (and on window focus), so the old device shows the *signed out* screen almost immediately.

### API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | – | first name, surname, DOB, email **or** phone → sends code |
| POST | `/api/auth/otp/request` | – | send a login code |
| POST | `/api/auth/otp/verify` | – | verify code → session (signs out other devices) |
| POST | `/api/auth/passkey/login/start` · `/finish` | – | biometric login → session (signs out other devices) |
| GET | `/api/me` | ✔ | profile, current device, biometric logins |
| GET | `/api/session/heartbeat` | ✔ | "is this device still the active one?" |
| POST | `/api/session/logout` | ✔ | end this session |
| POST | `/api/passkeys/register/start` · `/finish` | ✔ | enable biometrics on this device |
| DELETE | `/api/passkeys/{id}` | ✔ | remove a biometric login |

---

## Project structure

```
backend/   Spring Boot API
  config/       SecurityConfig (stateless bearer auth, CORS), WebAuthnConfig
  model/        User, OtpCode, DeviceSession, PasskeyCredential
  service/      AuthService, OtpService, NotificationService, SessionService, WebAuthnService
  security/     TokenAuthFilter
  web/          AuthController, AccountController, GlobalExceptionHandler, SpaController
frontend/  React app
  pages/        Login, SignUp, VerifyCode, EnableBiometrics, Dashboard, SignedOut
  context/      AuthContext (token, profile, heartbeat)
  lib/          api.js, biometrics.js (WebAuthn), device.js, contact.js
run.bat / run.sh   build + start everything on http://localhost:8080
```

## Security notes & trade-offs

- OTPs and session tokens are hashed at rest; comparisons are constant-time.
- Bearer tokens (no cookies) → no CSRF surface. Tokens live in `localStorage`; in production I would move them to an
  `HttpOnly; Secure; SameSite=Strict` cookie and add CSRF protection.
- Pending WebAuthn challenges are kept in memory (single instance). With several servers they would go to Redis.
- Production would also add per-IP rate limiting, a real SMS provider (e.g. Twilio / MSG91) and HTTPS with the real
  domain as the WebAuthn RP ID.
