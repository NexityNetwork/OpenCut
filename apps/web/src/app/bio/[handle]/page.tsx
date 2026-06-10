"use client";

import dynamic from "next/dynamic";

const BioPublic = dynamic(() => import("./bio-public"), {
	ssr: false,
	loading: () => null,
});

export default function BioHandlePage() {
	return <BioPublic />;
}
