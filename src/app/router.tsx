import { lazy, Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { RedirectIfAuthed } from "@/features/auth/RedirectIfAuthed";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { CaseViewPage } from "@/features/cases/CaseViewPage";
import { ClinicPage } from "@/features/clinic/ClinicPage";
import { PatientDetailPage } from "@/features/patients/PatientDetailPage";
import { PatientFormPage } from "@/features/patients/PatientFormPage";
import { PatientListPage } from "@/features/patients/PatientListPage";
import { AppLayout } from "./AppLayout";
import { NotFoundPage } from "./NotFoundPage";

// Dev-only demo seeding page; the whole branch is removed from production builds.
const SeedDemoPage = import.meta.env.DEV ? lazy(() => import("@/features/dev/SeedDemoPage")) : null;

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/register",
    element: (
      <RedirectIfAuthed>
        <RegisterPage />
      </RedirectIfAuthed>
    ),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/patients" replace /> },
      { path: "patients", element: <PatientListPage /> },
      { path: "patients/new", element: <PatientFormPage /> },
      { path: "patients/:patientId", element: <PatientDetailPage /> },
      { path: "patients/:patientId/edit", element: <PatientFormPage /> },
      { path: "patients/:patientId/cases/:caseId", element: <CaseViewPage /> },
      { path: "clinic", element: <ClinicPage /> },
      ...(SeedDemoPage
        ? [{ path: "dev/seed-demo", element: <Suspense fallback={null}><SeedDemoPage /></Suspense> }]
        : []),
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];
