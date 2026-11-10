# Confident

AI-assisted panoramic X-ray analysis for dental clinics.

Upload a panoramic X-ray and two YOLO models, running entirely in the browser with TensorFlow.js,
detect pathologies and number the teeth (FDI). The clinician reviews the boxes, corrects them, and
downloads a PDF radiology report. Patient records, a GDPR consent form and a 3D viewer for `.stl`
scans round it out.

The AI findings support the clinician's diagnosis; they don't replace it.

## Try it

Live: _link added after the first deploy_

Click **Try the demo** on the sign-in page to open a read-only clinic with fictional patients.
To try your own X-rays, register a clinic (free). Each clinic only ever sees its own data.

## Features

- **Patients**: list with search, add, edit, delete (deleting a patient also deletes their cases).
- **New case**: upload an X-ray; the AI runs on your device, nothing is sent to an AI server.
- **Case review**: show/hide findings and teeth, draw new boxes, relabel or delete boxes. Changes save automatically.
- **PDF report**: annotated X-ray, dental chart, findings table and report fields.
- **GDPR consent form**: blank, or pre-filled for a patient.
- **3D viewer**: rotate, pan and zoom `.stl` dental scans (a sample tooth is included).
- **Privacy**: analytics only start after the visitor accepts the consent banner.

## Tech stack

| Area | Tools |
| --- | --- |
| App | React 18, TypeScript, Vite 6, React Router 6 |
| Styling | Tailwind CSS with the "Sage" design tokens in `src/ui/tokens.ts` |
| AI | TensorFlow.js 4, YOLO11n detection + segmentation models in `public/models/` |
| Data | Firebase Auth (email/password), Firestore, Analytics (after consent) |
| PDF / 3D | jsPDF, html2canvas, three.js |
| Tests | Vitest, React Testing Library, Firestore emulator for the security rules |
| Hosting | Cloudflare Pages (free plan) |

X-ray images are stored in Firestore as compressed JPEGs (under 700 KB each), so the app
needs no paid Firebase Storage. Heavy code (TensorFlow.js, PDF, three.js) loads only when a
screen needs it.

## Project structure

```
src/
  app/        app shell: router, layout, top navigation
  ui/         design-system components (Button, Field, DataTable, Dialog, ...)
  features/
    auth/      sign in, register, demo login, route guards
    patients/  patient list, detail, form
    cases/     new case, case review, annotation canvas, findings
    clinic/    clinic settings
    stl/       3D viewer
    consent/   analytics consent banner
    dev/       demo seeding page (dev server only)
  ml/         model loading and inference
  lib/        Firebase, PDF generation, image helpers, dates
  types/      domain types
firestore.rules   security rules (deployed with npm run rules:deploy)
```

## Run locally

Requirements: Node 22 and a Firebase project with Email/Password sign-in and a Firestore database.

```bash
cp .env.example .env.local   # fill in your Firebase web config
npm install
npm run dev                  # http://localhost:5173
```

The Firebase web keys are not secrets. Access is controlled by `firestore.rules`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built app |
| `npm test` | Unit and component tests |
| `npm run test:rules` | Security-rules tests against the Firestore emulator (needs Java) |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run rules:deploy` | Deploy `firestore.rules` (needs `npx firebase login`) |

## Security model

- Every user belongs to one clinic. The rules only allow reading and writing documents whose
  `clinicId` matches the user's own clinic.
- Users can't change their own role or clinic.
- The `demo` role is read-only everywhere.

## Demo account

1. Put the demo email and password in `.env.local` (`VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD`).
2. Run `npm run dev`, register a new clinic with that email and password.
3. Open `/dev/seed-demo`, pick 2–4 anonymized panoramic X-rays and click **Seed demo clinic**.
   It creates 6 fictional patients and runs the AI on each X-ray.
4. Review the cases, then click **Lock as demo**. The account becomes read-only.

**Caveat:** the demo password is shipped in the site's code so the button can sign in. A visitor
could use it to change the demo account's password through the Firebase Auth API, which would
break the demo button. They still can't change any data. If that happens, reset the password in
the Firebase console (Authentication → Users).

## Deploy (Cloudflare Pages)

1. Push the repo to GitHub.
2. In Cloudflare: Workers & Pages → Create → Pages → connect the repo.
   - Framework preset: none
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variables: `NODE_VERSION=22` and every `VITE_*` value from `.env.local`
3. In Firebase: Authentication → Settings → Authorized domains, add `<project>.pages.dev`.

Every push to `main` deploys again. `public/_headers` lets browsers cache the AI models for a week.
Page refreshes on deep links work because Cloudflare Pages serves `index.html` for unknown paths
when there is no `404.html`.

## License

See [LICENSE](LICENSE).
