import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import Embed from "./pages/Embed";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Embed />
  </StrictMode>,
);
