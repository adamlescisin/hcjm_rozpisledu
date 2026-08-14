"use client";

import { useEffect } from "react";

export default function IframeResizer() {
  useEffect(() => {
    function sendHeight() {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "hcjm-resize", height }, "*");
    }

    sendHeight();

    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);

    window.addEventListener("load", sendHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", sendHeight);
    };
  }, []);

  return null;
}
