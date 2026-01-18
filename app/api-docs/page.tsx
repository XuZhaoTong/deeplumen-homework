"use client";
import dynamic from "next/dynamic";
import "@scalar/api-reference-react/style.css";

const ApiReferenceReact = dynamic(
  () =>
    import("@scalar/api-reference-react").then((mod) => mod.ApiReferenceReact),
  { ssr: false },
);

export default function ApiDocsPage() {
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  return (
    <ApiReferenceReact
      configuration={
        {
          spec: { url: "/openapi.yaml" },
          theme: "purple",
          servers: [{ url: currentOrigin, description: "当前环境" }],
        } as any
      }
    />
  );
}
