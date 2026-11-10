# Confident Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the imported `dental_app` (dev branch) into a clean, single-UI-system React app at the repo root, styled with the "Sage" design system, running on the owner's free Firebase project and deployed free on Cloudflare Pages with a read-only demo.

**Architecture:** Vite + React + TypeScript SPA. TensorFlow.js runs two YOLO models in the browser. Firebase Auth (email/password) and Firestore are called directly from the client, and security comes from Firestore rules that scope every document to a clinic. X-rays are stored as compressed JPEG data URLs in a separate `xrays/{caseId}` document. The old code is moved to `legacy/` as read-only reference and gets rebuilt feature by feature under `src/`. `legacy/` is deleted in the last task.

**Tech Stack:** Node 22, React 18, Vite 6, TypeScript 5, Tailwind CSS 3.4, react-router-dom 6, Firebase JS SDK 11 (auth, firestore, analytics), @tensorflow/tfjs 4.22, three 0.177, jspdf 3, html2canvas 1.4, date-fns 4, lucide-react, @fontsource-variable/inter. Tests: Vitest, @testing-library/react, jsdom, @firebase/rules-unit-testing, firebase-tools (devDependency, uses the local Java 21 for the emulator).

**Spec:** `docs/superpowers/specs/2026-11-07-confident-revamp-design.md`

## Global Constraints

- No MUI, emotion, Bootstrap, react-bootstrap, FontAwesome, axios, react-query, dotenv, shadcn/radix, class-variance-authority, or tailwindcss-animate anywhere in `package.json` or `src/`.
- Colors come only from the Sage tokens (spec §6). `tailwind.config.ts` **replaces** `theme.colors` (it does not extend it), so the default Tailwind palette is unavailable. Non-Tailwind code (canvas, PDF) imports hex values from `src/ui/tokens.ts`. No other hex literals in `src/`.
- Font: Inter, self-hosted via `@fontsource-variable/inter` (no Google Fonts request, GDPR-friendly). Radius 6px, badges 999px. Hairline borders instead of shadows.
- Firebase Spark plan only: no `firebase/storage`, no Cloud Functions.
- **Every Firestore query has `where("clinicId", "==", clinicId)`**, otherwise the rules reject it.
- Box format everywhere: `[y1, x1, y2, x2]` in **pixels of the stored (compressed) image**. Firestore stores boxes as `{y1,x1,y2,x2}` objects (Firestore can't store nested arrays).
- X-ray doc `dataUrl` ≤ 700 KB. Longest side ≤ 1600 px. JPEG quality starts at 0.85.
- UI copy is in English. Dates are displayed as `dd.MM.yyyy`, and ages come from date of birth.
- Firebase web config comes from `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`. Demo login comes from `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD`.
- Firebase project id: `big-crow-443210-t0`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `npm run build`, `npm run lint`, and `npm test` must pass at the end of every task.

## Review Focus

1. **Queries without a clinic filter.** Any list query that is missing `clinicId` works in unit tests but fails live with "Missing or insufficient permissions". Task 5's rules tests run a query without the filter and expect it to be denied, and every API in Task 4 is code-reviewed against this.
2. **Huge or odd X-rays** (a 12 MB, 6000×3000 PNG, or a portrait image). They must still save under 700 KB, with boxes still lined up on the image. Covered by Task 2 tests (`fitWithin`, the compression loop, `scaleBoxes`) and a Task 9 manual check.
3. **The AI finds nothing** (a blank or non-dental image). The case must still save, and the findings panel shows an empty state instead of crashing. Covered by Task 10 `buildFindingRows([])` and FindingsPanel tests.
4. **The demo user tries to change data** through the UI or directly through Firestore. Edit controls are hidden and the rules deny the write. Covered by Task 5 rules tests and the Task 6/10 `isDemo` UI tests.
5. **Reloading a deep link** (e.g. `/patients/abc/cases/xyz` on the live site). It must load the app, not a 404. Covered by Task 15 (no `404.html` in `dist`, so Cloudflare Pages falls back to the SPA) with a live check step.

---

### Task 1: Restructure repo, remove dead code, new tooling baseline

**Files:**
- Move: `frontend/*` → repo root. Move `frontend/src` → `legacy/src` (reference only, not compiled).
- Move: `frontend/public/yolo11n_detect_web_model/*` → `public/models/detect/`, `frontend/public/y11n_seg640_web_model/*` → `public/models/segment/`, `frontend/asstes/Tooth_15.stl` → `public/samples/tooth.stl`
- Delete: `.DS_Store`, `frontend/README.md`, `frontend/components.json`, `frontend/cors-config.json`, `frontend/vite.config.js`, `frontend/postcss.config.js` (recreated), `frontend/tailwind.config.js` (recreated), `frontend/.eslintrc.cjs`, `frontend/firebase.json` (recreated in Task 5), `public/404.html`, `public/index.html`, `public/vite.svg`, `public/teeth/`, root and frontend `.gitignore` (replaced by one)
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts` (or `test` block in vite config), `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js` (flat config, typescript-eslint, react-hooks, react-refresh), `postcss.config.js`, `tailwind.config.ts` (placeholder content globs, tokens come in Task 3), `.gitignore`, `.env.example`, `.env.local` (gitignored, with the owner's config values from `task.md`), `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/index.css`, `src/test/setup.ts`, `src/app/App.test.tsx`
- Modify: `README.md` (stub: what it is, `npm install`, `npm run dev`. Completed in Task 15)

**Interfaces:**
- Produces: the `@/` alias → `src/`. Scripts `dev`, `build` (`tsc -b && vite build`), `preview`, `lint`, `test` (`vitest run`), `test:watch`. `tsconfig` `include: ["src"]` (so `legacy/` is excluded). ESLint ignores `legacy/` and `dist/`.

- [ ] **Step 1: Baseline commit of the imported code as-is** (before any change, so history shows the original).

```bash
git add -A && git commit -m "chore: import dental_app dev branch (without landing page and patient files)"
```

- [ ] **Step 2: Do the moves and deletes listed above** with `git mv` / `git rm`.
- [ ] **Step 3: Write `package.json`** with only the Tech Stack dependencies (dependencies: react, react-dom, react-router-dom, firebase, @tensorflow/tfjs, three, jspdf, html2canvas, date-fns, lucide-react, @fontsource-variable/inter. devDependencies: typescript, vite, @vitejs/plugin-react, tailwindcss@3.4, postcss, autoprefixer, eslint, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, vitest, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @types/react, @types/react-dom, @types/three, @types/node, firebase-tools, @firebase/rules-unit-testing). Delete the old `package-lock.json` and run `npm install`.
- [ ] **Step 4: Write the failing smoke test** `src/app/App.test.tsx`:

```tsx
it("renders the Confident wordmark", () => {
  render(<App />);
  expect(screen.getByText(/confi/i)).toBeInTheDocument();
});
```

- [ ] **Step 5: Run `npm test`.** Expected: FAIL (App not defined).
- [ ] **Step 6: Implement a placeholder `App`** that renders the wordmark, plus `main.tsx` (imports `@fontsource-variable/inter` and `index.css`) and an `index.html` titled "Confident".
- [ ] **Step 7: Run `npm test && npm run lint && npm run build`.** Expected: all pass, and `dist/models/detect/model.json` exists.
- [ ] **Step 8: Commit** `chore: move app to repo root, drop dead code and unused deps, add vitest`.

---

### Task 2: Pure core libraries: geometry, tooth mapping, image compression

**Files:**
- Create: `src/types/domain.ts`, `src/lib/geometry.ts`, `src/lib/teeth-mapping.ts`, `src/lib/image-compress.ts`, `src/ml/labels/pathologies.json` (copy of `legacy/src/ml/detect_labels.json`), `src/ml/labels/teeth.json` (copy of `segmentation_labels.json`), `src/ml/labels/treatments.json`, and the tests `src/lib/geometry.test.ts`, `src/lib/teeth-mapping.test.ts`, `src/lib/image-compress.test.ts`

**Interfaces:**
- Produces (`src/types/domain.ts`):

```ts
export type Box = [y1: number, x1: number, y2: number, x2: number];
export interface Detections { boxes: Box[]; scores: number[]; classes: number[] }
export const emptyDetections = (): Detections => ({ boxes: [], scores: [], classes: [] });
export type Role = "admin" | "demo";
export interface UserProfile { uid: string; email: string; doctorName: string; clinicId: string; role: Role }
export interface Clinic { id: string; name: string; address: string; ownerUid: string }
export interface Patient { id: string; clinicId: string; firstName: string; lastName: string; gender: string; email: string; phoneNumber: string; dateOfBirth: Date | null; address: string; notes: string; createdAt: Date | null; updatedAt: Date | null }
export type PatientInput = Omit<Patient, "id" | "clinicId" | "createdAt" | "updatedAt">;
export interface ReportDetails { /* every field of legacy ReportDetailsType, all `string | undefined`, plus showAdvancedFindings?: boolean */ }
export interface Case extends ReportDetails { id: string; clinicId: string; patientId: string; scanDate: Date | null; referringDentist: string; clinicalIndication: string; description: string; radiologist: string; radiologistId: string; imageFileName: string; imageWidth: number; imageHeight: number; pathologies: Detections; teeth: Detections; createdAt: Date | null; updatedAt: Date | null }
export type CaseInput = Omit<Case, "id" | "createdAt" | "updatedAt">;
export interface XRay { caseId: string; clinicId: string; dataUrl: string; width: number; height: number }
```

- Produces (`geometry.ts`): `iou(a: Box, b: Box): number`, `scaleBoxes(boxes: Box[], factor: number): Box[]`, `normalizeBox(y1, x1, y2, x2): Box` (orders min/max).
- Produces (`teeth-mapping.ts`): `TOOTH_LABELS: string[]` (index → `"1.8"`…), `PATHOLOGY_LABELS: string[]`, `isTreatment(classIndex: number): boolean`, `assignTooth(box: Box, teeth: Detections): string | null` (the FDI label of the tooth with the highest IoU, but only if IoU > 0.01), `processFindings(teeth: Detections, pathologies: Detections): ProcessedFindings`, `toFdi(findings: ProcessedFindings): ProcessedFindings`. Port the last two from `legacy/src/lib/reportUtils.ts` (same categories, same implant→missing rule).
- Produces (`image-compress.ts`): `fitWithin(width: number, height: number, maxSide = 1600): { width: number; height: number; scale: number }` (scale ≤ 1, never upscales), `dataUrlBytes(dataUrl: string): number`, `compressImage(img: HTMLImageElement, opts?: { maxSide?: number; maxBytes?: number }): Promise<{ dataUrl: string; width: number; height: number; scale: number }>`. Algorithm: draw onto a canvas at `fitWithin` size, then `toDataURL("image/jpeg", q)` with q = 0.85, 0.75, 0.65, 0.55, 0.45. If it's still over `maxBytes` (default 700·1024), multiply maxSide by 0.8 and repeat. Throw `Error("Image too large to store")` below a 600 px max side.

- [ ] **Step 1: Write the failing tests:**

```ts
// geometry.test.ts
expect(iou([0,0,10,10],[0,0,10,10])).toBe(1);
expect(iou([0,0,10,10],[20,20,30,30])).toBe(0);
expect(iou([0,0,10,10],[0,5,10,15])).toBeCloseTo(1/3);
expect(scaleBoxes([[10,20,30,40]], 0.5)).toEqual([[5,10,15,20]]);
expect(normalizeBox(30,40,10,20)).toEqual([10,20,30,40]);
// teeth-mapping.test.ts
const teeth = { boxes: [[0,0,10,10],[0,20,10,30]] as Box[], scores:[1,1], classes:[7,8] }; // 1.1, 2.1
expect(assignTooth([1,21,9,29], teeth)).toBe("2.1");
expect(assignTooth([50,50,60,60], teeth)).toBeNull();
expect(assignTooth([1,1,9,9], emptyDetections())).toBeNull();
expect(isTreatment(PATHOLOGY_LABELS.indexOf("Dental Filling"))).toBe(true);
expect(isTreatment(PATHOLOGY_LABELS.indexOf("Caries"))).toBe(false);
// implant on tooth 1.1 → 1.1 counted missing, not present
const f = processFindings(teeth, { boxes:[[1,1,9,9]], scores:[1], classes:[0] });
expect(f.implantedTeeth).toEqual([7]); expect(f.presentTeeth).toEqual([8]); expect(f.missingTeeth).toContain(7);
expect(toFdi(f).implantedTeeth).toEqual([1.1]);
// image-compress.test.ts
expect(fitWithin(6000, 3000)).toEqual({ width: 1600, height: 800, scale: 1600/6000 });
expect(fitWithin(1000, 3000)).toEqual({ width: 533, height: 1600, scale: 1600/3000 }); // portrait, rounded
expect(fitWithin(800, 400)).toEqual({ width: 800, height: 400, scale: 1 });
expect(dataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(3);
```

  Plus a `compressImage` test that stubs `HTMLCanvasElement.prototype.toDataURL` to return big strings for q ≥ 0.65 and a small one for q = 0.55, and asserts the small one is returned and `getContext().drawImage` got the `fitWithin` size. A second stub always returns big strings and asserts the throw.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the three modules and the types.
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add geometry, tooth mapping and image compression libs`.

---

### Task 3: Sage design system and UI kit

**Files:**
- Create: `src/ui/tokens.ts`, `tailwind.config.ts` (full), `src/index.css` (Tailwind layers, CSS variables, base styles: `body` bg `page`, text `ink`, 14px Inter, `font-variant-numeric` helper class `.num`), and components `src/ui/Button.tsx`, `Field.tsx` (label, hint, error wrapper), `Input.tsx`, `Textarea.tsx`, `Select.tsx`, `DateInput.tsx`, `Checkbox.tsx`, `RadioGroup.tsx`, `Card.tsx`, `DataTable.tsx`, `Badge.tsx`, `Tabs.tsx`, `Dialog.tsx`, `Alert.tsx`, `Spinner.tsx`, `ProgressBar.tsx`, `EmptyState.tsx`, `PageHeader.tsx`, `src/ui/index.ts`. Tests: `src/ui/ui.test.tsx`

**Interfaces:**
- Produces: `tokens` (exact hexes from spec §6: `brand #2E7D5B`, `brandHover #266B4D`, `brandSoft #E8F3ED`, `brandInk #22613F`, `page #F7F8F7`, `surface #FFFFFF`, `line #E4E7E5`, `lineStrong #D5DAD7`, `muted #5F6B66`, `ink #1B1F1D`, `warn #8A5A14`, `warnSoft #FBF1E3`, `danger #A3362B`, `dangerSoft #FBEAE8`, `annotPathology #D98A1C`, `annotTooth #2E7D5B`). Tailwind colors: `brand.{DEFAULT,hover,soft,ink}`, `page`, `surface`, `line.{DEFAULT,strong}`, `muted`, `ink`, `warn.{DEFAULT,soft}`, `danger.{DEFAULT,soft}`, `annot.{pathology,tooth}`, `transparent`, `current`, `black` (only for the X-ray canvas background).
- `Button` props: `variant?: "primary" | "secondary" | "danger" | "ghost"` (default primary), `size?: "sm" | "md"`, `loading?: boolean`, plus the native button props. While loading it is disabled and shows a `Spinner`.
- `Input`/`Textarea`/`Select`/`DateInput` take `label: string`, `error?: string`, `hint?: string`. `DateInput` value is `Date | null`, `onChange(d: Date | null)`, using a native `<input type="date">`. `Select` takes `options: { value: string; label: string; disabled?: boolean }[]`.
- `DataTable<T>`: `{ columns: { key: string; header: string; render: (row: T) => ReactNode; className?: string }[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; empty: ReactNode }`
- `Badge`: `{ tone: "neutral" | "brand" | "warn" | "danger"; children }`
- `Tabs`: `{ tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }`. Active tab has a 2px brand underline, as in the mockup.
- `Dialog`: `{ open: boolean; onClose: () => void; title: string; children; footer?: ReactNode; size?: "md" | "lg" }`. Rendered in a portal, closes on Escape and on backdrop click, and moves focus to the first focusable element.
- `Alert`: `{ tone: "success" | "error" | "info"; children; onClose?: () => void }`
- `ProgressBar`: `{ value: number /*0..1*/; label?: string }`
- `PageHeader`: `{ title: string; subtitle?: ReactNode; breadcrumbs?: { label: string; to?: string }[]; actions?: ReactNode }`
- `EmptyState`: `{ title: string; description?: string; action?: ReactNode }`

- [ ] **Step 1: Write the failing tests** in `ui.test.tsx`: `Button` with `loading` is disabled and has `role="status"` inside. `Dialog` calls `onClose` on Escape and renders nothing when `open=false`. `DataTable` with `rows=[]` renders the `empty` node and calls `onRowClick(row)` when a row is clicked. `Input` with `error="Required"` sets `aria-invalid="true"` and shows the text. `Tabs` calls `onChange("b")`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement the tokens, Tailwind config and components.** Match the Sage mockup: 52px nav height, 6px radius, hairline `line` borders, primary = `brand` bg / white text, secondary = white bg + `line-strong` border, focus ring `ring-2 ring-brand/40`, table header 11.5px `muted` text.
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add Sage design tokens and UI kit`.

---

### Task 4: Firebase setup and data layer

**Files:**
- Create: `src/lib/firebase.ts`, `src/lib/firestore-mappers.ts`, `src/features/auth/auth.api.ts`, `src/features/clinic/clinic.api.ts`, `src/features/patients/patients.api.ts`, `src/features/cases/cases.api.ts`, `src/features/cases/xrays.api.ts`. Test: `src/lib/firestore-mappers.test.ts`

**Interfaces:**
- Produces (`firebase.ts`): `app`, `auth`, `db` (config from the `VITE_FIREBASE_*` env vars), `initAnalytics(): Promise<void>` (idempotent: `isSupported()` then `getAnalytics(app)`. It is never called on import).
- Produces (`firestore-mappers.ts`): `detectionsToFirestore(d: Detections): { boxes: {y1:number;x1:number;y2:number;x2:number}[]; scores: number[]; classes: number[] }`, `detectionsFromFirestore(raw: unknown): Detections` (missing or invalid → `emptyDetections()`), `toDate(v: unknown): Date | null` (Timestamp, Date or null), `patientFromDoc(id: string, data: DocumentData): Patient`, `caseFromDoc(id: string, data: DocumentData): Case` (missing strings → `""`, missing numbers → `0`).
- Produces (APIs, each a plain async function):
  - `auth.api.ts`: `registerClinic(i: { email: string; password: string; clinicName: string; clinicAddress: string; doctorName: string }): Promise<void>` (create the auth user, then `addDoc(clinics, {name, address, ownerUid})`, then `setDoc(users/uid, {email, doctorName, clinicId, role:"admin"})`, in that order), `signIn(email, password)`, `signInDemo()` (uses `VITE_DEMO_*`. Throws if they are unset), `signOutUser()`, `getUserProfile(uid): Promise<UserProfile | null>`, `lockAsDemo(uid): Promise<void>` (`updateDoc(users/uid, {role:"demo"})`).
  - `clinic.api.ts`: `getClinic(clinicId): Promise<Clinic | null>`, `updateClinic(clinicId, v: { name: string; address: string }): Promise<void>`
  - `patients.api.ts`: `listPatients(clinicId): Promise<Patient[]>` (sorted by lastName, then firstName, case-insensitive), `getPatient(id): Promise<Patient | null>`, `createPatient(clinicId, input: PatientInput): Promise<string>`, `updatePatient(id, input: PatientInput): Promise<void>`, `deletePatient(clinicId, patientId): Promise<void>` (one `writeBatch`: delete the patient's cases, their `xrays/{caseId}` docs, and the patient), `filterPatients(patients: Patient[], term: string): Patient[]` (pure. Case-insensitive match on first or last name. Search runs client-side, so no composite index is needed).
  - `cases.api.ts`: `listPatientCases(clinicId, patientId): Promise<Case[]>` (sorted by scanDate, newest first, client-side), `getCase(id): Promise<Case | null>`, `createCase(input: CaseInput, image: { dataUrl: string; width: number; height: number }): Promise<string>` (pre-generate the id with `doc(collection(db,"cases"))`, then one batch writes `cases/{id}` and `xrays/{id}`. Timestamps via `serverTimestamp()`), `updateCaseAnnotations(id, a: { pathologies?: Detections; teeth?: Detections }): Promise<void>`, `updateCaseReport(id, d: ReportDetails): Promise<void>`, `deleteCase(id): Promise<void>` (batch: case + xray).
  - `xrays.api.ts`: `getXRay(caseId): Promise<XRay | null>`

- [ ] **Step 1: Write the failing mapper tests:** a round trip `detectionsFromFirestore(detectionsToFirestore(d))` equals `d`. `detectionsFromFirestore(undefined)` equals empty. `toDate({ toDate: () => new Date(0) })` equals `new Date(0)`. `caseFromDoc("c1", {clinicId:"k", patientId:"p"})` has `pathologies` empty, `referringDentist: ""`, `imageWidth: 0`. `filterPatients` matches "ION" against "Maria Ionescu" and returns all patients when the term is empty.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** `firebase.ts`, the mappers and the APIs. Port the field lists from `legacy/src/services/*`. Do not port `searchPatients`, `TeethService`, or `XRayService`.
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS. Grep `src/` for `collection(db` and confirm every query includes the clinicId `where`.
- [ ] **Step 5: Commit** `feat: add Firebase client and Firestore data layer`.

---

### Task 5: Firestore security rules and emulator tests

**Files:**
- Create: `firestore.rules`, `firebase.json` (firestore rules path, emulator port 8080, no hosting), `.firebaserc` (`{"projects":{"default":"big-crow-443210-t0"}}`), `vitest.rules.config.ts` (node environment, includes `tests/rules/**`), `tests/rules/firestore.rules.test.ts`
- Modify: `package.json` scripts: `"test:rules": "firebase emulators:exec --only firestore --project demo-confident \"vitest run --config vitest.rules.config.ts\""`, `"rules:deploy": "firebase deploy --only firestore:rules"`. The default `vitest` config excludes `tests/rules`.

**Interfaces:**
- Rule helpers: `signedIn()`, `me()` = `get(/users/$(request.auth.uid)).data`, `myClinic()` = `me().clinicId`, `isAdmin()` = `me().role == "admin"`.
- `users/{uid}`: read if `uid == auth.uid`. Create if `uid == auth.uid`, keys `hasOnly(["email","doctorName","clinicId","role"])`, `role == "admin"`, and `get(/clinics/$(clinicId)).data.ownerUid == auth.uid`. Update if `uid == auth.uid` and **either** only `doctorName` changed **or** only `role` changed from `"admin"` to `"demo"`. Delete: never.
- `clinics/{id}`: read if `myClinic() == id`. Create if `ownerUid == auth.uid` and keys `hasOnly(["name","address","ownerUid"])`. Update if `myClinic() == id && isAdmin()`, `ownerUid` unchanged, and keys still a subset of those three. Delete: never.
- `patients/{id}`, `cases/{id}`, `xrays/{id}`: read if `resource.data.clinicId == myClinic()`. Create if `request.resource.data.clinicId == myClinic() && isAdmin()`. Update if both the old and the new `clinicId == myClinic()` and `isAdmin()`. Delete if `resource.data.clinicId == myClinic() && isAdmin()`.
- Everything else: denied.

- [ ] **Step 1: Write the failing rules tests** (using `@firebase/rules-unit-testing`, seeding with `withSecurityRulesDisabled`). Two clinics, `k1` (admin `alice`) and `k2` (admin `bob`), plus `demo` (role demo, clinic `kd`):
  - alice can create/read/update/delete a patient with `clinicId: "k1"`.
  - alice **cannot** read bob's patient. A `patients` query with `where("clinicId","==","k2")` is denied, and **a query without a clinicId filter is denied**.
  - alice cannot create a patient with `clinicId: "k2"`, or change an existing patient's clinicId to `k2`.
  - demo can read `kd` patients/cases/xrays, and **cannot** create, update or delete any of them, or update clinic `kd`.
  - A new user `carol` can create `clinics/kc` with `ownerUid: "carol"`, then `users/carol` with role admin and clinicId `kc`. She cannot create `users/carol` pointing at `k1`, or with `role: "demo"` plus an extra key.
  - alice can update her own role admin→demo. demo cannot change role demo→admin. alice cannot change her own clinicId.
  - An unauthenticated user can read nothing.
- [ ] **Step 2: Run `npm run test:rules`.** Expected: FAIL (no rules file / permission results wrong).
- [ ] **Step 3: Write `firestore.rules`** implementing the Interfaces above.
- [ ] **Step 4: Run `npm run test:rules`.** Expected: all PASS.
- [ ] **Step 5: Owner action (pause and ask the owner):** in the Firebase console, enable Authentication → Email/Password, and create the Firestore database in production mode, location `eur3`. Then run `npx firebase login`.
- [ ] **Step 6: Run `npm run rules:deploy`.** Expected: "Deploy complete!", and the rules show in the console.
- [ ] **Step 7: Commit** `feat: add clinic-scoped Firestore rules with emulator tests`.

---

### Task 6: App shell, authentication, demo mode

**Files:**
- Create: `src/features/auth/AuthProvider.tsx`, `useAuth.ts`, `RequireAuth.tsx`, `RedirectIfAuthed.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `src/app/router.tsx`, `src/app/AppLayout.tsx` (TopNav, DemoBar, `<Outlet/>`, `ConsentBanner` slot added in Task 13), `src/app/NotFoundPage.tsx`, `src/app/FullPageSpinner.tsx`. Tests: `src/features/auth/auth.test.tsx`
- Modify: `src/app/App.tsx` (AuthProvider + RouterProvider), `src/app/App.test.tsx` (update the wordmark test for the new tree)

**Interfaces:**
- Consumes: the Task 4 `auth.api` functions and the Task 3 UI kit.
- Produces: `useAuth(): { user: UserProfile | null; loading: boolean; isDemo: boolean; refreshProfile: () => Promise<void> }`. The profile fetch after `onAuthStateChanged` retries 5× every 500 ms, because the profile doc is written right after sign-up.
- Final route table (react-router `createBrowserRouter`). Each route is registered by the task that builds its page: `/login`, `/register` (wrapped in `RedirectIfAuthed` → `/patients`). Inside `RequireAuth` + `AppLayout`: `/` → redirect `/patients`, `/patients`, `/patients/new`, `/patients/:patientId`, `/patients/:patientId/edit`, `/patients/:patientId/cases/:caseId`, `/clinic`, and `/dev/seed-demo` **only when `import.meta.env.DEV`**. `*` → `NotFoundPage`. Routes for pages from later tasks are added by those tasks.
- TopNav: wordmark `Confi` + `dent` in brand color, links "Patients" and "Clinic" (active = 2px brand underline), the doctor's name on the right, and "Sign out".
- DemoBar (only when `isDemo`): "You're viewing a read-only demo. Register a free clinic to upload your own X-rays." with a "Register" link that signs out first.
- Login: email, password, "Sign in" button, a "Try the demo" secondary button (hidden when `VITE_DEMO_EMAIL` is unset), and a link to register. Error messages: `auth/invalid-credential` → "Wrong email or password.", `auth/too-many-requests` → "Too many attempts. Try again in a few minutes.", otherwise "Sign-in failed. Please try again."
- Register: the fields from spec §7.2. Validation: email regex from legacy, password ≥ 6, passwords match, and all fields required, with errors shown after the first submit. `auth/email-already-in-use` → "This email is already registered." On success, call `refreshProfile()` and navigate to `/patients`.

- [ ] **Step 1: Write the failing tests** (mock `auth.api`, render with `MemoryRouter`/`createMemoryRouter`): an unauthenticated visit to `/patients` ends on the login page. A demo user sees the DemoBar text. An admin user does not see it. Login shows "Wrong email or password." when `signIn` rejects with `{code:"auth/invalid-credential"}`. Register with mismatched passwords shows "Passwords must match" and doesn't call `registerClinic`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Manual check:** `npm run dev`, register a test clinic, land on `/patients` (an empty page placeholder is fine), sign out, sign in again.
- [ ] **Step 6: Commit** `feat: add app shell, auth flow and demo mode`.

---

### Task 7: Patients and clinic screens

**Files:**
- Create: `src/features/patients/PatientListPage.tsx`, `PatientFormPage.tsx` (new and edit), `PatientForm.tsx`, `PatientDetailPage.tsx` (info card + tabs; the tab bodies "New case" and "3D model" are placeholders until Tasks 9/12), `CaseHistoryTable.tsx`, `src/features/clinic/ClinicPage.tsx`, `src/lib/dates.ts`. Tests: `src/features/patients/patients.test.tsx`, `src/lib/dates.test.ts`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `patients.api`, `cases.api` (`listPatientCases`, `deleteCase`), `clinic.api`, `useAuth`, and the UI kit.
- Produces: `formatDate(d: Date | null): string` (`dd.MM.yyyy`, or `"—"`), `ageFromDob(dob: Date | null, today?: Date): number | null` (never negative; legacy's "age 0 → 1" hack is dropped). The patient detail tab is held in the `?tab=` query param, with values `cases` (default), `new-case`, `3d`. The consent-form buttons call `downloadConsentForm` from Task 11 (until then, render them disabled).
- Patient list columns: Name (last, first), Date of birth, Phone, Email. Search box (client-side `filterPatients`). "New patient" and "Consent form" buttons. EmptyState "No patients yet" + "Add your first patient" (the button is hidden for demo).
- Case history columns: Scan date, Referring dentist, Findings (`Badge` warn "N findings" counting pathology boxes that are **not** treatments, or brand "No findings"), and a delete icon button (admin only, confirm with `Dialog`). Clicking a row opens the case.
- Patient detail: header with name and age, Edit / Delete patient (admin only, delete confirm explains that cases are deleted too), Consent form.
- Patient form fields and gender options: copy them from `legacy/src/components/patient/PatientForm.tsx`. Required: first name, last name, date of birth, gender.
- Clinic page: name and address form (read-only inputs for demo).

- [ ] **Step 1: Write the failing tests:** `formatDate(new Date(2026,10,2))` is `"02.11.2026"`. `ageFromDob(new Date(1984,2,12), new Date(2026,10,7))` is `42`, and a future DOB → `0`. The patient list filters rows when typing "ion". The patient list for a demo user has no "New patient" button. The case history shows "3 findings" when the pathologies have 3 non-treatment classes plus 1 treatment.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Manual check:** add, edit and delete a patient, and update the clinic name.
- [ ] **Step 6: Commit** `feat: add patient and clinic screens`.

---

### Task 8: ML module (cached model loading and inference)

**Files:**
- Create: `src/ml/models.ts`, `src/ml/detect.ts`, `src/ml/segment.ts`, `src/ml/analyze.ts`. Test: `src/ml/models.test.ts`

**Interfaces:**
- Produces: `type LoadedModel = { net: tf.GraphModel; inputShape: number[]; outputShape?: number[][] }`, `loadModels(onProgress?: (p: { stage: "detect" | "segment"; fraction: number }) => void): Promise<{ detect: LoadedModel; segment: LoadedModel }>`. It loads `/models/detect/model.json`, then `/models/segment/model.json`, and warms both up with `tf.ones(inputShape)`. It returns **one shared promise per page session**, and resets the cache if loading rejects so a retry works. It sets the backend to `webgl` once.
- `detect(img: HTMLImageElement, m: LoadedModel): Promise<Detections>` and `segment(img: HTMLImageElement, m: LoadedModel): Promise<Detections>` are ports of `legacy/src/ml/detect.tsx` and `segment.js`. They return boxes in **original image pixels**, and `segment` drops mask computation.
- `analyzeXRay(img: HTMLImageElement): Promise<{ pathologies: Detections; teeth: Detections }>` (awaits `loadModels()`, then runs both).

- [ ] **Step 1: Write the failing tests** (`vi.mock("@tensorflow/tfjs")` with a fake `loadGraphModel`): two parallel `loadModels()` calls → `loadGraphModel` is called exactly twice in total (once per model). After a rejected load, the next call tries again. `onProgress` receives `{stage:"detect"}` before `{stage:"segment"}`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** (port the detect/segment math unchanged, with types added and console logs removed).
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add cached TF.js model loading and inference`.

---

### Task 9: New case flow

**Files:**
- Create: `src/features/cases/NewCaseForm.tsx`, `src/features/cases/AnnotationCanvas.tsx` (used read-only here, with editing completed in Task 10), `src/features/cases/ModelLoadingCard.tsx`. Test: `src/features/cases/new-case.test.tsx`
- Modify: `src/features/patients/PatientDetailPage.tsx` (the `new-case` tab renders `NewCaseForm`, hidden for demo)

**Interfaces:**
- Consumes: `loadModels`, `analyzeXRay`, `compressImage`, `scaleBoxes`, `createCase`, `useAuth`.
- Produces: `AnnotationCanvas` props: `{ imageSrc: string; imageWidth: number; imageHeight: number; pathologies: Detections; teeth: Detections; showPathologies: boolean; showTeeth: boolean; selected?: Selection | null; onSelect?: (s: Selection | null) => void; onEditRequest?: (s: Selection) => void; drawTool?: "pathology" | "teeth" | null; onDrawBox?: (box: Box, type: "pathology" | "teeth") => void; readOnly?: boolean }` with `type Selection = { type: "pathology" | "teeth"; index: number }`. Boxes are in `imageWidth × imageHeight` pixels and scaled to the displayed size. Label chip above each box (pathology label / FDI tooth). Colors `tokens.annotPathology` / `tokens.annotTooth`, and the selected box gets a thicker stroke. Port the drawing/hit-test logic from `legacy/src/components/common/CanvasDrawer.tsx`. Resizes with its container (ResizeObserver).
- Behaviour: when the tab opens, `loadModels` runs while a `ModelLoadingCard` shows a `ProgressBar` and "Loading AI models (first time only, ~22 MB)". On failure it shows an error + Retry. Fields: Scan date (default today, required), Referring dentist (required), Clinical indication, Description, and an X-ray drop zone (image/* only, ≤ 12 MB, otherwise the inline error "Please choose an image under 12 MB"). On file select it runs `analyzeXRay` on the original image and shows the result read-only with counts ("3 findings · 28 teeth"). "Save case" is enabled only when the required fields are filled and analysis has finished. On save it runs `compressImage`, scales both detections by `result.scale`, then `createCase` (radiologist = `user.doctorName`, radiologistId = `user.uid`, `imageWidth/imageHeight` from the compression), then navigates to `/patients/:patientId/cases/:newId`.

- [ ] **Step 1: Write the failing tests** (mock `analyzeXRay`, `loadModels`, `compressImage` returning `{scale:0.5,...}`, and `createCase`): Save is disabled until the referring dentist is typed and analysis resolves. On save, `createCase` receives pathologies with boxes halved and `imageWidth` from the compression result. Selecting a 13 MB file shows the size error and doesn't call `analyzeXRay`. A rejected `loadModels` shows a Retry button.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Manual check (Review Focus 2):** create a case from a large panoramic X-ray and from a portrait image. In the Firebase console, confirm the `xrays` doc is under 700 KB. The case page (next task) is checked later.
- [ ] **Step 6: Commit** `feat: add new case flow with in-browser AI analysis`.

---

### Task 10: Case screen (layout 2)

**Files:**
- Create: `src/features/cases/CaseViewPage.tsx`, `src/features/cases/CaseToolbar.tsx`, `src/features/cases/FindingsPanel.tsx`, `src/features/cases/LabelDialog.tsx`, `src/features/cases/ReportDetailsDialog.tsx`, `src/features/cases/report-fields.ts`, `src/features/cases/annotations.ts`, `src/features/cases/findings.ts`, `src/features/cases/useAutosave.ts`. Tests: `src/features/cases/annotations.test.ts`, `findings.test.ts`, `case-view.test.tsx`
- Modify: `AnnotationCanvas.tsx` (finish drag-to-draw and double-click → `onEditRequest`), `src/app/router.tsx`

**Interfaces:**
- Consumes: `getCase`, `getXRay`, `getPatient`, `updateCaseAnnotations`, `updateCaseReport`, `assignTooth`, `isTreatment`, `PATHOLOGY_LABELS`, `TOOTH_LABELS`, `AnnotationCanvas`, `useAuth`.
- Produces (`annotations.ts`, pure): `addBox(d: Detections, box: Box, cls: number): Detections` (score 1), `removeBox(d: Detections, index: number): Detections`, `relabelBox(d: Detections, index: number, cls: number): Detections`, `availableToothClasses(teeth: Detections, editingIndex?: number): number[]` (all 32 classes minus those used, except the class of `editingIndex`).
- Produces (`findings.ts`, pure): `type FindingRow = { index: number; label: string; tooth: string | null; score: number; treatment: boolean }`, `buildFindingRows(pathologies: Detections, teeth: Detections): FindingRow[]` (pathologies before treatments, then by tooth, nulls last), `buildToothRows(teeth: Detections): { index: number; label: string; score: number }[]` (in `TOOTH_LABELS` order).
- Produces (`report-fields.ts`): `REPORT_FIELDS: { key: keyof ReportDetails; label: string; options: string[]; descriptionKey?: keyof ReportDetails; describeWhen?: string; advanced?: boolean; section: string }[]`, copied from `legacy/src/components/dentalChart/PdfReportForm.tsx` (same keys, options and defaults: the first option is the default). Plus `recommendation` as free text.
- `useAutosave`: saves are serialized and the latest annotation state wins. Exposes `status: "idle" | "saving" | "saved" | "error"` and `retry()`.
- Screen (mockup layout 2): `PageHeader` with breadcrumbs `Patients › {name} › Case {scan date}`, title "Panoramic X-ray · {date}", subtitle "{name} · {age} y · Referred by {dentist}", and actions "Report details" (admin) and "Download PDF" (all users; wired in Task 11). Toolbar toggles "Pathologies" / "Teeth" (show/hide), "+ Pathology box" / "+ Tooth box" (admin), and the autosave status text "Saving…" / "Saved" / "Couldn't save — Retry". Right panel with `Tabs` "Findings (n)" / "Teeth (n)". Rows: color dot, label, tooth, confidence %. A selected row has the brand-soft background. Clicking a row selects the box on the canvas (and the other way around). "Change label" / "Delete" act on the selection (admin). After drawing a box, `LabelDialog` asks for its class: pathology options are sorted pathologies first, then treatments; tooth options are `availableToothClasses`, with "All teeth are already labeled." if there are none. An empty findings list shows "No findings detected".

- [ ] **Step 1: Write the failing tests:**

```ts
const d = { boxes: [[0,0,1,1],[2,2,3,3]] as Box[], scores: [0.9,0.8], classes: [4,2] };
expect(removeBox(d, 0)).toEqual({ boxes: [[2,2,3,3]], scores: [0.8], classes: [2] });
expect(relabelBox(d, 1, 5).classes).toEqual([4,5]);
expect(addBox(d, [5,5,6,6], 7).scores).toEqual([0.9,0.8,1]);
const t = { boxes: [[0,0,1,1],[0,2,1,3]] as Box[], scores:[1,1], classes:[0,1] };
expect(availableToothClasses(t)).not.toContain(0);
expect(availableToothClasses(t, 0)).toContain(0);
expect(availableToothClasses(t)).toHaveLength(30);
expect(buildFindingRows(emptyDetections(), emptyDetections())).toEqual([]);
// filling (treatment) listed after caries even if added first
expect(buildFindingRows({ boxes:[[0,0,1,1],[0,0,1,1]], scores:[1,1], classes:[2,4] }, emptyDetections()).map(r => r.label)).toEqual(["Caries","Dental Filling"]);
```

  `case-view.test.tsx` (mock the APIs): it renders "No findings detected" for an empty case. Clicking the "Caries" row marks it selected. "Delete" calls `updateCaseAnnotations` without that box. The demo user sees no "Delete", no "+ Pathology box", and no "Report details", but does see "Download PDF".
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Manual check:** on the case from Task 9, the boxes line up with the image (for both the large and the portrait X-ray), drawing, relabeling and deleting persist after a reload, and the report details save.
- [ ] **Step 6: Commit** `feat: add case screen with findings panel and autosaved annotations`.

---

### Task 11: PDF radiology report and English GDPR consent form

**Files:**
- Create: `src/lib/pdf/report.ts`, `src/lib/pdf/gdpr.ts`, `src/lib/pdf/annotated-image.ts`. Tests: `src/lib/pdf/gdpr.test.ts`, `src/lib/pdf/report.test.ts`
- Modify: `CaseViewPage.tsx` (wire "Download PDF"), `PatientListPage.tsx` and `PatientDetailPage.tsx` (enable the consent-form buttons)

**Interfaces:**
- Consumes: `processFindings`, `toFdi`, `tokens`, `formatDate`, `ageFromDob`, `getClinic`, `getXRay`.
- Produces: `generateCaseReport(c: Case, patient: Patient, xray: XRay, clinic: Clinic): Promise<void>`. It saves `{lastName}-{firstName}-radiography-report-{yyyy-MM-dd}.pdf`. It's a port of `generatePdf2` from `legacy/src/lib/reportUtils.ts` with the same sections and logic, header/accent colors from `tokens.brand`, and the clinic name/address in the header. It uses the X-ray `dataUrl` directly (no fetch/CORS). `renderAnnotatedImage(xray: XRay, pathologies: Detections): Promise<string>` returns a JPEG dataUrl with pathology boxes and labels drawn in `tokens.annotPathology`.
- Produces: `consentFormPages(clinic: Clinic, patient?: Patient): string[]` (pure, 3 HTML page strings) and `downloadConsentForm(clinic: Clinic, patient?: Patient): Promise<void>` (html2canvas + jsPDF, as in legacy). This is a **full English translation** of `legacy/src/lib/gdprUtils.ts`, with the same structure and blanks, in Sage colors. File name: `consent-form-{lastName or "blank"}.pdf`.

- [ ] **Step 1: Write the failing tests:** `consentFormPages(clinic, patient)` has length 3, contains the clinic name and "Maria Ionescu", contains "Information Notice on Personal Data Processing", and contains none of `["Stimate", "Pacient", "Datele", "Operatorul"]`. Without a patient it contains a blank name line. `report.test.ts` mocks `jspdf` and checks that `generateCaseReport` calls `save` with `"Ionescu-Maria-radiography-report-2026-11-02.pdf"`.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Manual check:** open both PDFs. The report lists findings per FDI tooth and shows both images. The consent form is fully in English.
- [ ] **Step 6: Commit** `feat: restyle PDF report and translate GDPR consent form to English`.

---

### Task 12: 3D STL viewer

**Files:**
- Create: `src/features/stl/StlViewer.tsx`
- Modify: `PatientDetailPage.tsx` (the `3d` tab)

**Interfaces:**
- Produces: `StlViewer` (no props) is a port of `legacy/src/components/stl/StlViewer.tsx` (three, STLLoader, OrbitControls). It has a "Choose .stl file" button and a "Load sample" button (fetches `/samples/tooth.stl`). Scene background `tokens.page`, mesh color `tokens.brand`. The renderer, controls and geometry are disposed on unmount, and the canvas resizes with its container.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run `npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 3: Manual check:** "Load sample" shows a rotatable tooth. Switching tabs back and forth five times doesn't show multiple canvases (no leak).
- [ ] **Step 4: Commit** `feat: restyle 3D STL viewer with sample model`.

---

### Task 13: Analytics consent banner

**Files:**
- Create: `src/features/consent/consent.ts`, `src/features/consent/ConsentBanner.tsx`. Test: `src/features/consent/consent.test.tsx`
- Modify: `src/app/AppLayout.tsx` and the login/register pages (the banner shows on every page), `src/main.tsx` (call `initAnalytics()` at start-up if consent is already `"accepted"`)

**Interfaces:**
- Consumes: `initAnalytics` (Task 4).
- Produces: `getConsent(): "accepted" | "declined" | null` and `setConsent(v: "accepted" | "declined"): void`. localStorage key `confident.analytics-consent`, every access wrapped in try/catch (blocked storage → `null`, and the banner still works for the session). `ConsentBanner` is a bottom bar with the text "We use analytics to understand how Confident is used. No patient data is ever sent." and the buttons "Decline" (secondary) and "Accept" (primary).

- [ ] **Step 1: Write the failing tests:** the banner renders when there is no stored choice. "Accept" stores `"accepted"`, calls `initAnalytics` once, and hides the banner. "Decline" stores `"declined"`, doesn't call it, and hides the banner. With `"declined"` stored, nothing renders. If `localStorage.getItem` throws, the banner still renders.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: add analytics consent banner`.

---

### Task 14: Demo seed tool

**Files:**
- Create: `src/features/dev/SeedDemoPage.tsx`, `src/features/dev/demo-patients.ts`
- Modify: `src/app/router.tsx` (add the `/dev/seed-demo` route, registered only when `import.meta.env.DEV`)
- Spec note: this implements the spec's allowed alternative (a dev-only page instead of `scripts/seed-demo.mjs`), because running TF.js in Node needs native bindings.

**Interfaces:**
- Consumes: `analyzeXRay`, `compressImage`, `scaleBoxes`, `createPatient`, `createCase`, `updateClinic`, `lockAsDemo`, `useAuth`.
- Produces: `DEMO_PATIENTS: PatientInput[]` (6 fictional patients with Romanian-sounding names, plausible DOBs, `example.com` emails, and `+40 700 000 00x` phone numbers). The page only works when signed in as an admin whose clinic has zero patients, otherwise it shows "Use a fresh account for the demo." Steps on the page: (1) set the clinic name to "Smile Dental Clinic (Demo)", (2) choose 2–4 X-ray files, (3) "Seed" creates all patients and one case per image for the first N patients (referring dentist "Dr. Radu Stan", the scan dates spread over the last 2 months), with a progress list, (4) "Lock as demo" calls `lockAsDemo(user.uid)` after a confirm dialog that says it can't be undone from the app.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run `npm run lint && npm run build`.** Expected: PASS, and `grep -r "seed-demo" dist/` finds nothing (the route is tree-shaken out of production).
- [ ] **Step 3: Owner action (pause and ask the owner):** provide 2–4 anonymized X-rays, and choose the demo email/password. Register that account at `/register` (clinic "Smile Dental Clinic (Demo)"), open `/dev/seed-demo`, seed, check the cases, then lock. Put `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` in `.env.local`.
- [ ] **Step 4: Manual check:** "Try the demo" on the login page opens the seeded clinic with the DemoBar, and no edit controls are shown anywhere.
- [ ] **Step 5: Commit** `feat: add dev-only demo seeding tool`.

---

### Task 15: Final cleanup, README, deploy to Cloudflare Pages

**Files:**
- Delete: `legacy/`
- Create: `public/_headers` (`/models/*` → `Cache-Control: public, max-age=604800`), `public/favicon.svg` (simple brand-green tooth mark)
- Modify: `README.md` (what Confident is, a screenshot, live URL, demo login note, tech stack, local setup with `.env.example`, `npm run test` / `test:rules`, deploy notes, demo-account caveat: a visitor could change the shared demo password through the Firebase Auth API; the owner restores it in the Firebase console), the design spec §5 (seed script → dev page) and §8 (no composite indexes are needed because sorting and search run client-side, so there's no `firestore.indexes.json`)

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Delete `legacy/`.** Then run `npm test && npm run test:rules && npm run lint && npm run build`. Expected: all PASS. `grep -rE "@mui|bootstrap|firebase/storage" src package.json` finds nothing, and `ls dist/404.html` doesn't exist.
- [ ] **Step 2: Full local run-through** (spec §10): register → patient → new case → edit boxes → PDF → consent PDF → STL sample → demo login → consent banner.
- [ ] **Step 3: Commit** `chore: remove legacy code, finish README`.
- [ ] **Step 4: Owner confirmation, then create the public GitHub repo and push:** `gh repo create Tiberiw/confident --public --source . --push`.
- [ ] **Step 5: Owner action:** in Cloudflare Pages, create a project from the GitHub repo. Framework preset: none, build command `npm run build`, output `dist`, env var `NODE_VERSION=22`, plus all the `VITE_*` vars from `.env.local`.
- [ ] **Step 6: Owner action:** in Firebase Auth → Settings → Authorized domains, add `<project>.pages.dev`.
- [ ] **Step 7: Live check** on the `pages.dev` URL. Demo login works. Models load (DevTools Network shows `/models/detect/*.bin` with the cache header). Reloading `/patients/<id>/cases/<id>` loads the app (Review Focus 5). Register a new clinic, create a case, and check that the demo clinic's data is not visible to it. The consent banner appears in a fresh private window.
- [ ] **Step 8: Commit** any fixes `fix: production deploy adjustments` (only if needed).
