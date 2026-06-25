import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: currentDirectory });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", ".next-dev/**", ".next.stale-*/**", "node_modules/**", "next-env.d.ts"] },
  { rules: { "@next/next/no-img-element": "off" } },
];

export default config;
