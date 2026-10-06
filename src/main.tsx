import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ServerGameHost } from "./app/host/ServerGameHost";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App host={new ServerGameHost()} />
  </StrictMode>,
);
