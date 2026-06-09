"use client";

import dynamic from "next/dynamic";

// Publishing center is client-only (session + live polling of the satellite).
const PublishApp = dynamic(() => import("./publish-app"), {
	ssr: false,
	loading: () => null,
});

export default function PublishRoute() {
	return <PublishApp />;
}
