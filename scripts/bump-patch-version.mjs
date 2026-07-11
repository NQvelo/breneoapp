import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");

function bumpPatchVersion(version) {
  const parts = version.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`Invalid semver in package.json: "${version}"`);
  }

  const patch = Number(parts[2]) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

function updatePackageJson(nextVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const currentVersion = packageJson.version;
  packageJson.version = nextVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return currentVersion;
}

function updatePackageLock(nextVersion) {
  if (!fs.existsSync(packageLockPath)) return;

  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
  packageLock.version = nextVersion;

  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = nextVersion;
  }

  fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
}

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const nextVersion = bumpPatchVersion(packageJson.version);
  const previousVersion = updatePackageJson(nextVersion);
  updatePackageLock(nextVersion);

  console.log(`Version bumped: ${previousVersion} -> ${nextVersion}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
