import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Provider } from "jotai";

// biome-ignore lint/style/noNonNullAssertion: 这东西肯定在
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Provider>
			<App />
		</Provider>
	</StrictMode>,
);
