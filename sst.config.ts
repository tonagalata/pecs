/// <reference path="./.sst/platform/config.d.ts" />

/**
 * PictoTalk infrastructure on AWS (SST v4).
 *
 * Everything here is static files behind CloudFront. There is no server, no database
 * and no per-user cost: speech runs on the device, and boards, photos and recordings
 * are stored on the device.
 *
 *   Web  – landing page (apps/web, Next.js static export)        → S3 + CloudFront
 *   App  – web version of the board (apps/mobile, Expo web)       → S3 + CloudFront
 *   Cdn  – /voice/*   optional HD voice pack (S3 bucket)          → CloudFront
 *          /arasaac/* cache in front of ARASAAC's pictogram CDN   → CloudFront
 *
 * Deploy:   npx sst deploy --stage production
 * Domains:  set PICTOTALK_DOMAIN=pictotalk.org (needs a Route 53 hosted zone).
 *           Without it, CloudFront *.cloudfront.net URLs are used.
 */
export default $config({
  app(input) {
    return {
      name: "pictotalk",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: { aws: { region: "us-east-1" } },
    };
  },
  async run() {
    const root = process.env.PICTOTALK_DOMAIN;
    const prod = $app.stage === "production";
    const host = (sub: string) => (root ? (prod ? `${sub}.${root}` : `${sub}.${$app.stage}.${root}`) : undefined);

    // Static file CDN: voice pack + ARASAAC cache. CloudFront free tier covers 1 TB/month of transfer.
    const voicePack = new sst.aws.Bucket("VoicePack", { access: "cloudfront" });
    const cdn = new sst.aws.Router("Cdn", { domain: host("cdn") });
    cdn.routeBucket("/voice", voicePack, { rewrite: { regex: "^/voice/(.*)$", to: "/$1" } });
    cdn.route("/arasaac", "https://static.arasaac.org", { rewrite: { regex: "^/arasaac/(.*)$", to: "/$1" } });

    const app = new sst.aws.StaticSite("App", {
      path: "apps/mobile",
      build: { command: "npx expo export --platform web", output: "dist" },
      // errorPage defaults to index.html, which is what the single-page app needs for deep links.
      environment: {
        EXPO_PUBLIC_VOICE_PACK_URL: $interpolate`${cdn.url}/voice/${process.env.VOICE_PACK_VERSION ?? "kokoro-v1"}`,
        EXPO_PUBLIC_ARASAAC_STATIC: $interpolate`${cdn.url}/arasaac`,
      },
      domain: host("app"),
    });

    const web = new sst.aws.StaticSite("Web", {
      path: "apps/web",
      build: { command: "npm run build", output: "out" },
      environment: {
        NEXT_PUBLIC_APP_URL: app.url,
        NEXT_PUBLIC_APP_STORE_URL: process.env.APP_STORE_URL ?? "",
        NEXT_PUBLIC_CONTACT_EMAIL: process.env.CONTACT_EMAIL ?? "hello@pictotalk.org",
      },
      domain: root ? (prod ? { name: root, redirects: [`www.${root}`] } : `${$app.stage}.${root}`) : undefined,
    });

    /*
     * Not deployed: an optional server for the day PictoTalk needs one (for example, opt-in
     * backup/sync between a family's devices). It adds roughly $30–60/month before any users
     * (RDS, Fargate, NAT/ALB), so it is left out until there is a feature that needs it.
     *
     * const vpc = new sst.aws.Vpc("Vpc", { nat: "ec2" });
     * const db = new sst.aws.Postgres("Db", { vpc });
     * const cluster = new sst.aws.Cluster("Cluster", { vpc });
     * new sst.aws.Service("Api", {
     *   cluster,
     *   link: [db],
     *   image: { context: "services/api" },
     *   loadBalancer: { ports: [{ listen: "80/http", forward: "8080/http" }] },
     * });
     */

    return {
      web: web.url,
      app: app.url,
      cdn: cdn.url,
      voicePackBucket: voicePack.name,
    };
  },
});
