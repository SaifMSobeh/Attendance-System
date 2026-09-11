# Hossam Mohammed — Math Sessions System

A student management system for a math teacher: attendance with automatic
WhatsApp notifications to parents, exam grades, monthly payment tracking,
and separate logins for the teacher (admin) and each student.

## What it does

- **Mr. Hossam (admin login)** sees every student, grouped into classes,
  with attendance history, exam grades, and monthly payment status. Marking
  a student "present" for a session automatically sends the parent a
  WhatsApp message.
- **Students** log in and see only their own info: their group, attendance
  record and rate, exam grades, and payment history.
- WhatsApp sending uses **whatsapp-web.js**, which drives a real WhatsApp
  Web session — no paid API, but it does need a phone with WhatsApp
  installed to stay linked (see "About WhatsApp sending" below).

## Requirements

- [Node.js](https://nodejs.org) version 18 or newer
- A phone with WhatsApp installed, to link as the sending device
- Google Chrome dependencies for Puppeteer (installed automatically on
  Windows/macOS; on Linux servers you may need to install a few system
  packages — see the whatsapp-web.js docs if you hit a Chromium launch error)

## Setup

1. Unzip the project and open a terminal in the project folder.

2. Install dependencies:
   ```
   npm install
   ```

3. Create your environment file:
   ```
   cp .env.example .env
   ```
   Then open `.env` and set:
   - `JWT_SECRET` — any long random string
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Mr. Hossam's login (used the
     very first time the server starts to create the admin account)
   - `ADMIN_NAME` — shown on WhatsApp messages, e.g. "Mr. Hossam"

4. Run the project:
   - **Development mode** (runs Express backend + Vite with hot reload concurrently):
     ```
     npm run dev
     ```
   - **Production mode** (builds React app and serves it via Express):
     ```
     npm run build
     npm start
     ```
   You should see `Hossam Mohammed math system running at http://localhost:3000`.

5. Open `http://localhost:5173` (development) or `http://localhost:3000` in a browser and log in with the admin username/password from your `.env`.

6. Go to the **WhatsApp** tab in the admin dashboard. The first time you
   run it, a QR code appears there (it can take a few seconds to show up —
   refresh the tab if it's blank). On the phone that should send
   notifications: open WhatsApp → **Settings → Linked devices → Link a
   device**, and scan the code. Once linked, the tab shows "Connected."

7. Go to **Groups** and add your class groups (e.g. "Grade 10 — Sun/Tue").

8. Go to **Students** → **Add student**. Fill in the parent's WhatsApp
   number **with the country code and no leading zero or plus sign**
   (e.g. an Egyptian number `01xxxxxxxxx` becomes `201xxxxxxxxx`). After
   saving, you'll see a one-time username and password — give these to the
   student so they can log in.

9. On any class day, go to **Take attendance**, pick the group and date,
   and tap **Present** for each student who showed up. Their parent gets a
   WhatsApp message right away. Tapping **Absent** just records it, no
   message is sent.

10. Use **Payments** to mark each student's tuition paid or unpaid for the
    month, and open a student's profile from the **Students** tab to add
    exam grades.

## QR badge check-in

Each student has a personal QR code that marks them present the instant it's
scanned, instead of tapping through the roster by hand.

1. Open a student's profile (Students tab → click their name) and click
   **QR badge**. Print it or save the image — this code doesn't change, so
   it can be laminated onto an ID card.
2. On any class day, go to the **Scan QR badge** tab and allow camera
   access when prompted.
3. Hold a student's badge up to the camera. It checks them in for today,
   sends the parent's WhatsApp message, and shows a green confirmation —
   scanning the same badge twice in one day just says "already checked in,"
   it won't send a second message.

Notes:
- The camera only works over `http://localhost:3000` or a proper `https://`
  address — browsers block camera access on a plain `http://` address typed
  as a phone/tablet's local network IP. If you want to scan from a device
  other than the one running the server, you'll need to put the site behind
  HTTPS (a reverse proxy with a free Let's Encrypt certificate, or a tunnel
  tool like ngrok/Cloudflare Tunnel, both work for this).
- Scanning still requires being logged into the admin account on the
  scanning device — a photographed or copied badge is useless without also
  being signed in as Mr. Hossam, so a student can't check themself in from
  home.

## QR check-in badges

Each student automatically gets a unique QR code. From a student's profile
(Students tab → click their name → **QR badge**), you can view and print it
— hand this to the student as an ID card.

To check a student in with their badge: open the **Scan QR badge** tab,
allow camera access when the browser asks, and point the camera at the
badge. It marks them present for today and sends the parent WhatsApp
message automatically, same as tapping "Present" in Take attendance — just
faster once you have a stack of badges to get through. Scanning the same
badge twice in one day is safe; it just confirms they're already checked in
without sending a second message.

The scanner needs `http://localhost` or `https://` (not a plain IP address)
for the browser to allow camera access, and needs an internet connection in
the browser tab itself (it loads the scanning library from a CDN).

## About WhatsApp sending

whatsapp-web.js works by remote-controlling a real WhatsApp Web session in
the background, the same way your browser would. A few things to know:

- The linked phone needs an internet connection when messages go out,
  the same as WhatsApp Web normally requires.
- Sending automated messages this way is outside WhatsApp's official Business
  API and technically against WhatsApp's terms of service; large volumes or
  spam-like behavior can get a number flagged or temporarily blocked. For a
  single teacher notifying parents of their own kids' attendance, the volume
  is low and this is commonly used for exactly this kind of project, but you
  should know the risk exists. If this ever needs to scale to many teachers
  or hundreds of daily messages, look into the official
  [WhatsApp Business Platform API](https://developers.facebook.com/docs/whatsapp)
  instead.
- The login session is saved in a local `whatsapp-session/` folder so you
  don't have to rescan the QR code every time you restart the server.
- **This library breaks periodically.** whatsapp-web.js works by driving a
  real WhatsApp Web page, so whenever WhatsApp updates their web client
  (which happens often), sending can start failing with a generic error
  until whatsapp-web.js is updated to match. This isn't a bug in this
  project specifically — it's a known tradeoff of using an unofficial
  library instead of WhatsApp's paid Business API. If messages stop sending
  after working fine for a while, the fix below is usually all you need.

### If messages fail to send ("Failed to send message" or similar)

1. Check the **WhatsApp tab** in the admin dashboard first — if it isn't
   showing "Connected," fix that first (rescan the QR code).
2. If it shows connected but sends still fail, look at the **terminal**
   where `npm start` is running. The dashboard only shows a short message,
   but the terminal logs the full underlying error for each failed send.
3. Update the library to the latest version:
   ```
   npm install whatsapp-web.js@latest
   ```
4. Clear the cached session and any version cache, then restart and rescan:
   ```
   rmdir /s /q whatsapp-session
   rmdir /s /q .wwebjs_cache
   npm start
   ```
   (On Mac/Linux, use `rm -rf whatsapp-session .wwebjs_cache` instead.)
5. If it's still failing after that, search the error text from step 2 on
   the [whatsapp-web.js GitHub issues page](https://github.com/pedroslopez/whatsapp-web.js/issues)
   — because this is such a common failure mode across everyone using the
   library, there's usually an open issue (and often a fix or workaround
   posted in the comments) within a day or two of WhatsApp pushing a
   breaking update.

## Keeping it running

For everyday use, keep the server running in the background rather than in
a terminal you might close. On a small VPS or home PC, a process manager
like [PM2](https://pm2.keymetrics.io/) works well:

```
npm install -g pm2
pm2 start server.js --name hossam-math
pm2 save
```

## Project structure

```
server.js                  Express app entry point
src/config/database.js     SQLite schema + admin account seeding
src/middleware/auth.js     Login-token checking
src/services/whatsapp.js   whatsapp-web.js client wrapper
src/routes/                API endpoints (auth, students, groups,
                            attendance, exams, payments, me, whatsapp)
public/                    Frontend — login page, admin dashboard,
                            student dashboard
data.sqlite                Created automatically on first run
```

## Notes on the design

The look is built around the subject: a faint coordinate-grid background,
a cyan/coral two-color palette (present & paid vs. absent & unpaid), and
monospaced numerals for grades, dates, and percentages so they read like
instrument readouts rather than plain text.
