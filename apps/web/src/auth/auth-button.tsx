"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { signIn, signUp, signOut, useSession } from "@/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AuthButton() {
	const { data: session, isPending } = useSession();
	const [open, setOpen] = useState(false);

	if (isPending) {
		return <div className="bg-muted/50 size-9 animate-pulse rounded-full" />;
	}

	if (session?.user) {
		return <UserMenu user={session.user} />;
	}

	return (
		<>
			<Button
				variant="outline"
				className="h-10 rounded-full px-4"
				onClick={() => setOpen(true)}
			>
				Log in
			</Button>
			<LoginDialog open={open} onOpenChange={setOpen} />
		</>
	);
}

function UserMenu({
	user,
}: {
	user: { name?: string | null; email?: string | null; image?: string | null };
}) {
	const router = useRouter();
	const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="rounded-full outline-none"
					aria-label="Account"
				>
					<Avatar className="size-9">
						{user.image ? <AvatarImage src={user.image} alt="" /> : null}
						<AvatarFallback>{initial}</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex flex-col">
					<span className="truncate">{user.name || "Signed in"}</span>
					<span className="text-muted-foreground truncate text-xs font-normal">
						{user.email}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={async () => {
						await signOut();
						router.refresh();
					}}
				>
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function LoginDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [mode, setMode] = useState<"signin" | "signup">("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);

	const continueWithGoogle = async () => {
		setBusy(true);
		try {
			await signIn.social({
				provider: "google",
				callbackURL: window.location.href,
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Google sign-in failed");
			setBusy(false);
		}
	};

	const submit = async () => {
		if (!email.trim() || !password || busy) return;
		setBusy(true);
		try {
			const result =
				mode === "signin"
					? await signIn.email({ email: email.trim(), password })
					: await signUp.email({
							email: email.trim(),
							password,
							name: email.split("@")[0] || "User",
						});
			if (result.error) {
				toast.error(result.error.message || "Authentication failed");
				return;
			}
			onOpenChange(false);
			setPassword("");
			router.refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Something went wrong");
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm p-8">
				<div className="flex flex-col gap-1.5 text-center">
					<DialogTitle className="text-2xl font-semibold">
						{mode === "signin" ? "Log in or sign up" : "Create your account"}
					</DialogTitle>
					<DialogDescription>
						Save your projects and pick up on any device.
					</DialogDescription>
				</div>

				<div className="mt-6 flex flex-col gap-3">
					<button
						type="button"
						onClick={() => void continueWithGoogle()}
						disabled={busy}
						className="bg-card hover:bg-muted flex h-11 items-center justify-center gap-2.5 rounded-full border text-sm font-medium transition-colors disabled:opacity-50"
					>
						<FcGoogle className="size-5" />
						Continue with Google
					</button>

					<div className="text-muted-foreground my-1 flex items-center gap-3 text-xs">
						<span className="bg-border h-px flex-1" />
						OR
						<span className="bg-border h-px flex-1" />
					</div>

					<Input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Email address"
						autoComplete="email"
						className="h-11 rounded-full px-4"
						containerClassName="w-full"
					/>
					<Input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") void submit();
						}}
						placeholder="Password"
						autoComplete={mode === "signin" ? "current-password" : "new-password"}
						className="h-11 rounded-full px-4"
						containerClassName="w-full"
					/>

					<Button
						onClick={() => void submit()}
						disabled={busy || !email.trim() || !password}
						className="h-11 rounded-full"
					>
						{busy ? <Spinner className="size-4" /> : "Continue"}
					</Button>

					<p className="text-muted-foreground text-center text-sm">
						{mode === "signin"
							? "New here? "
							: "Already have an account? "}
						<button
							type="button"
							className="text-foreground underline-offset-2 hover:underline"
							onClick={() =>
								setMode(mode === "signin" ? "signup" : "signin")
							}
						>
							{mode === "signin" ? "Create an account" : "Log in"}
						</button>
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
