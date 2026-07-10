import React from "react";
import ReactDOM from "react-dom/client";
import { RootApp } from "./RootApp";
import { initPwaInstall } from "./lib/pwaInstall";
import { initPwaUpdate } from "./lib/pwaUpdate";
import "./index.css";

initPwaInstall();
initPwaUpdate();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);