"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import { useFileUpload } from "@/media/use-file-upload";
import { processMediaAssets } from "@/media/processing";
import { showMediaUploadToast } from "@/media/upload-toast";

interface UseMediaImportOptions {
	accept?: string;
	multiple?: boolean;
}

/**
 * Shared media-import flow (process files -> add as project media assets),
 * extracted from the Assets panel so any panel (e.g. Sounds) can offer the
 * same "Import" affordance. Mirrors the desktop Assets view exactly.
 */
export function useMediaImport({
	accept = "image/*,video/*,audio/*",
	multiple = true,
}: UseMediaImportOptions = {}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);

	const importFiles = async ({ files }: { files: File[] }) => {
		if (!files || files.length === 0) return;
		if (!activeProject) {
			toast.error("No active project");
			return;
		}

		setIsProcessing(true);
		setProgress(0);
		try {
			await showMediaUploadToast({
				filesCount: files.length,
				promise: async () => {
					const processedAssets = await processMediaAssets({
						files,
						onProgress: (p: { progress: number }) => setProgress(p.progress),
					});
					for (const asset of processedAssets) {
						await editor.media.addMediaAsset({
							projectId: activeProject.metadata.id,
							asset,
						});
					}
					return {
						uploadedCount: processedAssets.length,
						assetNames: processedAssets.map((asset) => asset.name),
					};
				},
			});
		} catch (error) {
			console.error("Error processing files:", error);
		} finally {
			setIsProcessing(false);
			setProgress(0);
		}
	};

	const upload = useFileUpload({
		accept,
		multiple,
		onFilesSelected: (files) => importFiles({ files }),
	});

	return { ...upload, isProcessing, progress, importFiles };
}
