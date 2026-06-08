"use client";

import { Section, SectionContent, SectionFields } from "@/components/section";
import { useEditor } from "@/editor/use-editor";
import { PropertyParamField } from "./property-param-field";
import type { ParamValue } from "@/params";
import {
	getElementParams,
	readElementParamValue,
	writeElementParamValue,
	type ElementParamDefinition,
} from "@/params/registry";
import type { TimelineElement, TimelineTrack } from "@/timeline";

type ElementWithTrack = { element: TimelineElement; track: TimelineTrack };

// Batch editor: when several clips of the same type are selected (e.g. a whole
// caption row), edits here apply to all of them at once.
export function MultiSelectProperties({
	elementsWithTracks,
}: {
	elementsWithTracks: ElementWithTrack[];
}) {
	const type = elementsWithTracks[0]?.element.type;
	const allSameType = elementsWithTracks.every((e) => e.element.type === type);

	if (!type || !allSameType) {
		return (
			<div className="flex h-full flex-col items-center justify-center p-4">
				<p className="text-muted-foreground text-center text-sm text-balance">
					{elementsWithTracks.length} clips selected. Select clips of the same
					type to edit them together.
				</p>
			</div>
		);
	}

	const reference = elementsWithTracks[0].element;
	// Everything except per-clip text content (which is unique to each caption).
	// Font family / weight / alignment etc. are exactly what you batch-edit on a
	// caption row, so keep them even though they aren't keyframable.
	const params = getElementParams({ element: reference }).filter(
		(param) => param.key !== "content",
	);

	return (
		<Section sectionKey={`multi:${type}`}>
			<SectionContent className="pt-4">
				<p className="text-muted-foreground mb-3 text-xs leading-relaxed">
					{elementsWithTracks.length} clips selected — changes apply to all.
				</p>
				<SectionFields>
					{params.map((param) => (
						<MultiParamField
							key={param.key}
							param={param}
							elementsWithTracks={elementsWithTracks}
						/>
					))}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function MultiParamField({
	param,
	elementsWithTracks,
}: {
	param: ElementParamDefinition;
	elementsWithTracks: ElementWithTrack[];
}) {
	const editor = useEditor();
	const baseValue =
		readElementParamValue({ element: elementsWithTracks[0].element, param }) ??
		param.default;

	// Mirrors the single-element edit path exactly (no local state — the value
	// re-derives from the previewed scene): previewElements (live) for every
	// selected clip, then commitPreview to persist them all in one undo step.
	const preview = (value: ParamValue) => {
		editor.timeline.previewElements({
			updates: elementsWithTracks.map(({ element, track }) => ({
				trackId: track.id,
				elementId: element.id,
				updates: writeElementParamValue({ element, param, value }),
			})),
		});
	};

	return (
		<PropertyParamField
			param={param}
			value={baseValue}
			onPreview={preview}
			onCommit={() => editor.timeline.commitPreview()}
		/>
	);
}
