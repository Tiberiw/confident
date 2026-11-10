# Confident — Project Revamp Design

Date: 2026-11-07
Status: Approved by owner on 2026-11-07 (including the builder's calls listed in chat)

## 1. Intent

Confident (shown in the UI as "Confident") is a college startup project: a web app for dental clinics that runs two YOLO computer-vision models **in the browser** (TensorFlow.js) on panoramic X-rays. One model detects pathologies/treatments, the other segments and numbers teeth. Clinicians review and correct the AI results and generate a PDF radiology report.

The original Firebase project belonged to a colleague who has run out of credits. The goal is to bring the app back to life on the owner's own Firebase account, clean it up, give it a professional look, and deploy it publicly **at zero cost**, so people and recruiters can try it.

## 2. Goals, non-goals, anti-goals

**Goals**
- The app runs from this repository root (`C:\Users\amari\confident`), based on the `dev` branch of `cristi-an-pop/dental_app` (the newest code: GDPR form, PDF report, teeth fixes).
- Much simpler codebase: no dead code, one UI system, one source of truth for each feature, clear folder structure.
- One design system ("Sage": white / gray / green) used on every screen. It should look like a calm, professional healthcare tool, not a generic AI-generated template.
- Works locally (`npm install && npm run dev`).
- Live on the internet for free, with a read-only demo account so recruiters can see it working within seconds.

**Non-goals**
- No backend server and no Cloud Functions (they need Firebase's paid plan).
- No migration of the colleague's old Firebase data. The new project starts empty, plus seeded demo data.
- No landing page.
- No retraining or changing of the ML models.

**Anti-goals** (would count as failure even if the app technically works)
- Any cost, or anything that requires a billing card (Firebase Blaze plan).
- Real patient data anywhere in the repo or in the live app.
- A look full of AI clichés: gradients, glows, emoji, purple/blue accents, heavy shadows, oversized rounded cards.
- One clinic able to read or change another clinic's data.

## 3. Decisions made by the owner

| Topic | Decision |
|---|---|
| Base branch | `dev` |
| Git history | Fresh repo, no old history (done) |
| Patient PDF / signature / stamp in `public/pdfReport` | Deleted (done) |
| Landing page | Deleted (done) |
| Folder structure | App moves from `frontend/` to the repo root |
| UI library | Rewrite with Tailwind CSS. Remove MUI, Bootstrap, shadcn leftovers |
| Design direction | **A · Sage** (see §6) |
| Case screen layout | **Layout 2**: toolbar above the X-ray, findings list on the right |
| 3D STL viewer | Keep, restyle |
| Hosting | Cloudflare Pages (free, unlimited bandwidth). Models are 22 MB per new visitor |
| Firebase plan | Spark (free): Auth + Firestore only. **No Firebase Storage** |
| X-ray storage | Compressed JPEG stored in Firestore |
| Visitor access | Open signup **and** a demo account |
| Demo account | **Read-only** |
| Demo X-rays | Owner provides 2–4 anonymized panoramic X-rays |
| GDPR consent PDF | Translate from Romanian to English |
| Analytics | Google Analytics (Firebase), **only after the visitor accepts a small consent banner** |
| GitHub repo | New **public** repo on the owner's account (Tiberiw) |

## 4. Architecture

```
Browser (React + Vite + TS + Tailwind)
 ├─ TensorFlow.js: loads /models/detect and /models/segment from the same site, runs inference locally
 ├─ Firebase Auth (email/password)
 ├─ Firestore: users, clinics, patients, cases, xrays
 └─ Firebase Analytics: initialised only after consent
Hosting: Cloudflare Pages, built from the GitHub repo on every push to main
```

Firebase config comes from the owner's snippet (project `big-crow-443210-t0`). It is read from `VITE_FIREBASE_*` environment variables, with a committed `.env.example`. These web keys are not secrets. Security comes from Firestore rules (§8).

## 5. Target project structure

```
confident/
├─ docs/                     design + plan
├─ public/
│  ├─ models/
│  │  ├─ detect/             (was yolo11n_detect_web_model)
│  │  └─ segment/            (was y11n_seg640_web_model)
│  └─ samples/tooth.stl      (was asstes/Tooth_15.stl, offered as a sample in the 3D viewer)
├─ src/
│  ├─ app/                   App.tsx, router, providers, layout (top nav, breadcrumbs)
│  ├─ ui/                    design-system components (Button, Input, Select, Textarea, DateInput, Card,
│  │                         Table, Badge, Tabs, Dialog, Alert, Spinner, ProgressBar, EmptyState, PageHeader)
│  ├─ features/
│  │  ├─ auth/               Login, Register, AuthProvider, RequireAuth, useAuth
│  │  ├─ patients/           PatientList, PatientDetail, PatientForm, patients.api.ts
│  │  ├─ cases/              NewCase, CaseView, FindingsPanel, AnnotationCanvas, ReportDetailsForm, cases.api.ts, xrays.api.ts
│  │  ├─ clinic/             ClinicSettings, clinic.api.ts
│  │  ├─ stl/                StlViewer
│  │  ├─ dev/                SeedDemoPage (dev build only: fills the demo clinic, then locks it read-only)
│  │  └─ consent/            ConsentBanner, analytics.ts
│  ├─ ml/                    model loading (cached singleton), detect.ts, segment.ts, labels/*.json
│  ├─ lib/                   firebase.ts, pdf/report.ts, pdf/gdpr.ts, image-compress.ts, teeth-mapping.ts, dates.ts
│  ├─ types/
│  ├─ index.css              Tailwind + design tokens as CSS variables
│  └─ main.tsx
├─ firestore.rules, firebase.json, .firebaserc
├─ index.html, package.json, vite.config.ts, tailwind.config.ts, tsconfig.json, eslint config
├─ .env.example, README.md, LICENSE
```

**Removed:** `landing-page/`, `frontend/` wrapper, `config/Config.ts` (server dotenv leftover), `config/Theme.ts`, duplicate `vite.config.js`, `components.json`, `cors-config.json`, `public/404.html`, `public/index.html`, `public/vite.svg`, unused `public/teeth/*.svg`, `.DS_Store`, and the never-imported files: `TeethService`, `TeethGrid`, `XRayViewer`, `InferenceOverlay`, `renderMasks`, `TabPanel`, `lib/utils.ts`. Also unused dependencies: MUI (all), emotion, Bootstrap, react-bootstrap, FontAwesome, axios, react-query, dotenv, class-variance-authority, radix slot, tailwindcss-animate, `@types/date-fns`.

## 6. Design system — "Sage"

**Colors** (CSS variables, exposed as Tailwind theme colors. No other colors may be used in components)

| Token | Hex | Use |
|---|---|---|
| `brand` | #2E7D5B | primary buttons, active nav underline, focus ring, links |
| `brand-hover` | #266B4D | primary hover |
| `brand-soft` | #E8F3ED | selected rows, success badges, active toggles |
| `brand-ink` | #22613F | text on brand-soft |
| `page` | #F7F8F7 | app background |
| `surface` | #FFFFFF | cards, nav, inputs |
| `line` | #E4E7E5 | card borders, table dividers |
| `line-strong` | #D5DAD7 | input / secondary-button borders |
| `muted` | #5F6B66 | secondary text, labels |
| `ink` | #1B1F1D | primary text |
| `warn` / `warn-soft` | #8A5A14 / #FBF1E3 | findings badges |
| `danger` / `danger-soft` | #A3362B / #FBEAE8 | delete, errors |
| `annot-pathology` | #D98A1C | pathology boxes on X-ray |
| `annot-tooth` | #2E7D5B | tooth boxes on X-ray |

**Type:** Inter (400/500/600). Page title 20px/600, section 15px/600, body 13–14px, labels 11.5–12px/500 muted. Tabular numbers for dates, IDs and percentages.
**Shape:** radius 6px (inputs, buttons, cards), 999px only for badges. 1px hairline borders instead of shadows. Spacing on a 4px scale.
**Layout:** top navigation (logo, Patients, Clinic, user menu with sign out). Content max-width ~1200px on a `page` background. Breadcrumbs above the page title.
**Icons:** `lucide-react` only, 16px, used sparingly.
**States:** visible focus ring (brand, 2px), disabled = 50% opacity, loading via small spinner inside the button.

## 7. Screens

1. **Login:** email/password form plus a secondary "Try the demo" button that signs into the demo account. A link to Register. Friendly error messages.
2. **Register:** clinic name, clinic address, doctor name, email, password, confirm. Creates the clinic and user profile, then signs in directly. *(Builder's call: skip the extra "success, now log in" screen.)*
3. **Patients list:** search by last name, table (name, date of birth, phone, email), "New patient", "Consent form" (blank GDPR PDF). A row click opens the patient. Empty state for a new clinic.
4. **New / Edit patient:** single form (first/last name, gender, date of birth, phone, email, address, notes).
5. **Patient detail:** info card (with Edit and "Consent form" for this patient). Tabs: **Cases** (history table: scan date, referring dentist, findings count, delete), **New case**, **3D model** (STL viewer with "load sample" option).
6. **New case:** scan date, referring dentist, clinical indication, description, X-ray drop zone. The models load (a progress bar is shown the first time, then they're cached for the session). On upload, the AI runs and the boxes are shown read-only. "Save case" compresses and stores the image and opens the Case screen. *(Builder's call: annotation editing happens only on the Case screen, so the duplicated editor inside the upload component goes away.)*
7. **Case screen (layout 2):** header (patient, scan date, referring dentist, "Report details", "Download PDF"). Toolbar: show/hide Pathologies, show/hide Teeth, "+ Pathology box", "+ Tooth box". The canvas with boxes supports click to select, double-click to relabel, and drag to draw a new box. On the right, a panel with tabs **Findings** (label, tooth number via IoU mapping, confidence) and **Teeth**. Clicking a row selects the box. "Change label" / "Delete" act on the selection. Changes save automatically with a small "Saved" indicator.
8. **Report details:** a side panel / dialog with the existing radiology report fields. The values are saved to the case and used by the PDF.
9. **Clinic settings:** clinic name and address.
10. **Not found** and an **auth-loading** state. The "Unauthorized" page is removed (no roles beyond demo).
11. **Consent banner:** a bottom bar that says "We use analytics to improve Confident", with Accept and Decline. The choice is stored in localStorage. Analytics initialises only after Accept.
12. **Demo mode:** a slim notice bar under the nav says "You're viewing a read-only demo. Register a free clinic to upload your own X-rays." All edit, create and delete controls are hidden or disabled. PDF downloads still work.

**PDF report:** keep the current content and logic (findings per FDI tooth, pathologies before treatments, report fields, X-ray and annotated X-ray). Restyle the colors to Sage green. **GDPR consent PDF:** translate to English and restyle.

## 8. Data model and security

Collections (fields unchanged unless noted):
- `users/{uid}`: email, doctorName, clinicId, role (`admin` | `demo`)
- `clinics/{clinicId}`: name, address, ownerUid
- `patients/{id}`: patient fields + clinicId
- `cases/{id}`: case fields + clinicId, pathologies, teeth (boxes in **stored-image pixel coordinates**), report fields, `imageWidth`, `imageHeight`. `storageUrl` / `imageUrl` are dropped.
- `xrays/{caseId}` (**new**): `dataUrl` (JPEG), clinicId, width, height. This is kept apart from the case document so that patient/case lists don't download images.

**Image compression:** longest side up to 1600 px, JPEG quality 0.85, reduced step by step until the image is under 700 KB (Firestore's document limit is 1 MiB). Inference runs on the original image, and the boxes are then scaled by the same factor before saving.

**Firestore rules** (deployed from the repo):
- A user can read/write only documents whose `clinicId` equals the `clinicId` in their own `users` doc.
- `role == 'demo'` → read-only on everything.
- On sign-up, a user may create `clinics/{id}` with `ownerUid == auth.uid`, and their own `users/{uid}` with role `admin`, pointing at a clinic they own. Users cannot change their own role or clinicId afterwards.
- No composite indexes are needed: queries use equality filters only (`clinicId`, plus `patientId` for cases), and sorting and search run client-side. So there is no `firestore.indexes.json`.

**Demo seed:** a dev-only page at `/dev/seed-demo` (present in `npm run dev`, absent from the production build). The owner registers the demo account, opens the page, and picks 2–4 anonymized X-rays. It renames the clinic, creates 6 fictional patients, and runs the AI in the browser to create one case per X-ray. After reviewing, the owner clicks **Lock as demo**, which sets the role to `demo` (read-only). *(Builder's call: a Node script was impractical because TF.js needs the browser's WebGL backend.)*

## 9. Owner setup steps (guided, done by the owner)

1. Firebase console: enable **Authentication → Email/Password**. Create a **Firestore** database (production mode, EU region, e.g. `eur3`). Confirm Analytics is linked.
2. `npm i -g firebase-tools` → `firebase login` → we deploy `firestore.rules` and the indexes.
3. Create the public GitHub repo (or let Claude create it with `gh`).
4. Cloudflare Pages: connect the repo, build command `npm run build`, output `dist`, add the `VITE_FIREBASE_*` env vars.
5. Firebase Auth → Authorized domains: add the `*.pages.dev` domain.
6. Provide 2–4 anonymized X-rays, then run the demo seed.

## 10. Verification

- `npm run build` and `npm run lint` pass with no errors.
- Local manual run-through: register → add patient → new case with an X-ray → AI boxes appear → edit boxes on the Case screen → download PDF report → GDPR PDF → STL sample loads.
- Rules check: a second test clinic cannot read the first clinic's data, and the demo account cannot write.
- Live check on the `pages.dev` URL: demo login works, models load, consent banner behaves correctly.

## 11. Left to the builder

Component internals, exact copy/microcopy, how state is managed inside the case screen, the order of refactor steps, the lint config, and whether to use small hooks or plain functions for the Firestore calls.
