export async function onRequest(context) {
  const appName = context.env.APP_NAME || "Suenolytics";

  return new Response(
    JSON.stringify(
      {
        name: appName,
        short_name: "Suenolytics",
        description: "PWA para registrar el sueno del bebe y medir latencia de sueno.",
        start_url: "/",
        display: "standalone",
        background_color: "#07111f",
        theme_color: "#6d5efc",
        orientation: "portrait",
        lang: "es-ES",
        icons: [
          {
            src: "/icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
