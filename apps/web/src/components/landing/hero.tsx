"use client";

import { Button } from "../ui/button";
import { Handlebars } from "./handlebars";
import Link from "next/link";
import GeometricBackground from "./geometric-background";

export function Hero() {
	return (
		<GeometricBackground className="min-h-[calc(100svh-60px)]">
			<div className="relative z-20 mx-auto flex min-h-[calc(100svh-60px)] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
				<div className="inline-block text-4xl font-bold tracking-tighter text-white md:text-[4rem]">
					<h1>The open source</h1>
					<Handlebars>Video editor</Handlebars>
				</div>

				<p className="mx-auto mt-10 max-w-xl text-base font-light tracking-wide text-white/60 sm:text-xl">
					A simple but powerful video editor that gets the job done. Works on
					any platform.
				</p>

				<div className="mt-8 flex justify-center gap-8">
					<Link href="/projects">
						<Button
							size="lg"
							className="h-11 rounded-full bg-white px-6 text-base font-semibold text-black hover:bg-white/90"
						>
							Start Creating
						</Button>
					</Link>
				</div>
			</div>
		</GeometricBackground>
	);
}
