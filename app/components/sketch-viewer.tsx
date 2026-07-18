"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TYPE } from "@/lib/typography";

const THUMBNAIL_CAPTURE_DELAY_MS = 4000;

function escapeScriptClose(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

/**
 * The iframe is sandboxed without allow-same-origin, so it has an opaque
 * origin — CSP's 'self' keyword can't match an opaque origin, so script-src
 * has to name the real origin explicitly for /vendor/p5.min.js to load.
 */
function buildSketchDocument(sketchCode: string, origin: string): string {
  const safeCode = escapeScriptClose(sketchCode);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${origin} 'unsafe-inline'; style-src 'unsafe-inline';" />
<style>
  html, body { margin: 0; padding: 0; overflow: hidden; background: #0a0a0a; }
  canvas { display: block; }
</style>
</head>
<body>
<script>
(function () {
  function reportError() {
    parent.postMessage({ type: "sketch-error" }, "*");
  }
  window.onerror = reportError;
  window.addEventListener("unhandledrejection", reportError);
  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "sketch-capture") {
      try {
        var canvas = document.querySelector("canvas");
        if (!canvas) return;
        var dataUrl = canvas.toDataURL("image/png");
        parent.postMessage({ type: "sketch-thumbnail", dataUrl: dataUrl }, "*");
      } catch (e) {
        // canvas may be missing or tainted — nothing to capture
      }
    }
  });
})();
</script>
<script src="${origin}/vendor/p5.min.js"></script>
<script>
${safeCode}
</script>
</body>
</html>`;
}

export function SketchViewer({
  sketchCode,
  tokenId,
  hasThumbnail,
}: {
  sketchCode: string;
  tokenId: string;
  hasThumbnail: boolean;
}) {
  const [origin, setOrigin] = useState("");
  const [failed, setFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const capturedRef = useRef(hasThumbnail);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const html = useMemo(
    () => (origin ? buildSketchDocument(sketchCode, origin) : ""),
    [sketchCode, origin]
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "sketch-error") {
        setFailed(true);
      } else if (
        event.data?.type === "sketch-thumbnail" &&
        !capturedRef.current
      ) {
        capturedRef.current = true;
        fetch("/api/thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId, dataUrl: event.data.dataUrl }),
        }).catch(() => {});
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [tokenId]);

  useEffect(() => {
    if (hasThumbnail || !html) return;
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "sketch-capture" },
        "*"
      );
    }, THUMBNAIL_CAPTURE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasThumbnail, html]);

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
        <p className={`${TYPE.status} text-white/60`}>
          this piece isn&apos;t rendering
        </p>
      </div>
    );
  }

  if (!html) {
    return <div className="w-full h-full bg-[#0a0a0a]" />;
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      sandbox="allow-scripts"
      className="w-full h-full border-0"
      title="Living sketch"
    />
  );
}
