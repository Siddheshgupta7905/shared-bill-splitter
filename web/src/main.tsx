import React from "react";
import ReactDOM from "react-dom/client";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider
} from "@tanstack/react-router";
import { App } from "./pages/App";
import "./styles.css";

const rootRoute = createRootRoute({ component: App });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });
const routeTree = rootRoute.addChildren([indexRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
