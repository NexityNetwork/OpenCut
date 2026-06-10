/* Monolith Bio embed — paste where you want the page to appear:
   <script src="https://edits.51ultron.com/embed.js" data-handle="yourhandle" async></script> */
(function () {
	var script = document.currentScript;
	if (!script) return;
	var handle = script.getAttribute("data-handle");
	if (!handle) return;
	var origin = new URL(script.src).origin;
	var frame = document.createElement("iframe");
	frame.src = origin + "/bio/" + encodeURIComponent(handle) + "/embed";
	frame.title = handle + " — links";
	frame.loading = "lazy";
	frame.style.width = "100%";
	frame.style.border = "0";
	frame.style.display = "block";
	frame.style.borderRadius = script.getAttribute("data-radius") || "16px";
	frame.style.height = "480px";
	frame.setAttribute("allowtransparency", "true");
	window.addEventListener("message", function (e) {
		if (e.origin !== origin) return;
		var d = e.data;
		if (d && d.type === "monolith-bio-height" && e.source === frame.contentWindow) {
			frame.style.height = Math.max(120, d.height) + "px";
		}
	});
	script.parentNode.insertBefore(frame, script);
})();
