"use client";

import dynamic from "next/dynamic";

// Projects management is client-only (browser storage + WASM). Disable SSR.
const ProjectsApp = dynamic(() => import("./projects-app"), {
	ssr: false,
	loading: () => null,
});

export default function ProjectsRoute() {
	return <ProjectsApp />;
}
