import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ConsentBanner } from "@/features/consent/ConsentBanner";
import { routes } from "./router";

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ConsentBanner />
    </AuthProvider>
  );
}
