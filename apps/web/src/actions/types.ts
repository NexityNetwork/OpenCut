import type { MutableRefObject } from "react";
import type { TAction } from "./definitions";
import { ACTIONS } from "./definitions";

export type { TAction };

export type TActionArgsMap = {
	"seek-forward": { seconds: number } | undefined;
	"seek-backward": { seconds: number } | undefined;
	"jump-forward": { seconds: number } | undefined;
	"jump-backward": { seconds: number } | undefined;
	"remove-media-asset": { projectId: string; assetId: string };
	"remove-media-assets": { projectId: string; assetIds: string[] };
};

type TKeysWithValueUndefined<T> = {
	[K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type TActionWithArgs = keyof TActionArgsMap;

export type TActionWithOptionalArgs =
	| TActionWithNoArgs
	| TKeysWithValueUndefined<TActionArgsMap>;

export type TActionWithNoArgs = Exclude<TAction, TActionWithArgs>;

// Actions whose args CANNOT be omitted — everything else is keybindable.
const ACTIONS_WITH_REQUIRED_ARGS = new Set<string>([
	"remove-media-asset",
	"remove-media-assets",
]);

/** Runtime guard matching TActionWithOptionalArgs (used when decoding persisted keybindings). */
export function isActionWithOptionalArgs(
	v: unknown,
): v is TActionWithOptionalArgs {
	return (
		typeof v === "string" &&
		v in ACTIONS &&
		!ACTIONS_WITH_REQUIRED_ARGS.has(v)
	);
}

export type TArgOfAction<A extends TAction> = A extends TActionWithArgs
	? TActionArgsMap[A]
	: undefined;

export type TActionFunc<A extends TAction> = A extends TActionWithArgs
	? (arg: TArgOfAction<A>, trigger?: TInvocationTrigger) => void
	: (_?: undefined, trigger?: TInvocationTrigger) => void;

export type TInvocationTrigger = "keypress" | "mouseclick";

export type TBoundActionList = {
	[A in TAction]?: Array<TActionFunc<A>>;
};

export type TActionHandlerOptions =
	| MutableRefObject<boolean>
	| boolean
	| undefined;
