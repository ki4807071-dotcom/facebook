#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function fail(message) {
  console.error(`generate-latest-json: ${message}`);
  process.exit(1);
}

const [releaseTag, repository, ...artifactArguments] = process.argv.slice(2);
if (!releaseTag || !repository || artifactArguments.length === 0) {
  fail(
    "usage: node scripts/generate-latest-json.mjs <tag> <owner/repo> <platform=artifact> [...]"
  );
}

if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
  fail(`invalid GitHub repository: ${repository}`);
}

const version = releaseTag.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`release tag is not a SemVer version: ${releaseTag}`);
}

const root = process.cwd();
const tauriConfig = JSON.parse(
  fs.readFileSync(path.join(root, "src-tauri/tauri.conf.json"), "utf8")
);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cargoToml = fs.readFileSync(path.join(root, "src-tauri/Cargo.toml"), "utf8");
const cargoPackage = cargoToml.match(/\[package\]([\s\S]*?)(?:\n\[|$)/)?.[1];
const cargoVersion = cargoPackage?.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1];

if (
  tauriConfig.version !== version ||
  packageJson.version !== version ||
  cargoVersion !== version
) {
  fail(
    `version mismatch: tag=${version}, tauri.conf.json=${tauriConfig.version}, package.json=${packageJson.version}, Cargo.toml=${cargoVersion}`
  );
}

const platforms = {};
for (const argument of artifactArguments) {
  const separator = argument.indexOf("=");
  if (separator <= 0 || separator === argument.length - 1) {
    fail(`expected platform=artifact-path, got: ${argument}`);
  }

  const platform = argument.slice(0, separator);
  const artifactPath = path.resolve(root, argument.slice(separator + 1));
  if (!/^(windows|darwin|linux)-(x86_64|aarch64|i686|armv7)$/.test(platform)) {
    fail(`unsupported platform key: ${platform}`);
  }
  if (Object.hasOwn(platforms, platform)) {
    fail(`duplicate platform key: ${platform}`);
  }
  if (!fs.statSync(artifactPath, { throwIfNoEntry: false })?.isFile()) {
    fail(`updater artifact does not exist: ${artifactPath}`);
  }

  const signaturePath = `${artifactPath}.sig`;
  if (!fs.statSync(signaturePath, { throwIfNoEntry: false })?.isFile()) {
    fail(`signature file does not exist: ${signaturePath}`);
  }
  const signature = fs.readFileSync(signaturePath, "utf8").trim();
  if (!signature) {
    fail(`signature file is empty: ${signaturePath}`);
  }

  const filename = path.basename(artifactPath);
  platforms[platform] = {
    signature,
    url: `https://github.com/${repository}/releases/download/${encodeURIComponent(
      releaseTag
    )}/${encodeURIComponent(filename)}`,
  };
}

const manifest = {
  version,
  notes: process.env.RELEASE_NOTES || "",
  pub_date: new Date().toISOString(),
  platforms,
};

fs.writeFileSync(
  path.join(root, "latest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);
console.log(`Wrote latest.json for ${version} (${Object.keys(platforms).join(", ")})`);
