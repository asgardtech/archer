import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const WORKFLOW_PATH = path.resolve(
  __dirname,
  "..",
  ".github",
  "workflows",
  "build.yml"
);

let workflowContent: string;
let workflow: any;

beforeAll(() => {
  workflowContent = fs.readFileSync(WORKFLOW_PATH, "utf-8");
  workflow = yaml.load(workflowContent);
});

describe("Issue #649: Multi-platform Electron CI build workflow", () => {
  describe("Workflow file existence and validity", () => {
    test("'.github/workflows/build.yml' exists in the repository", () => {
      expect(fs.existsSync(WORKFLOW_PATH)).toBe(true);
    });

    test("file is valid YAML", () => {
      expect(() => yaml.load(workflowContent)).not.toThrow();
      expect(workflow).toBeDefined();
      expect(typeof workflow).toBe("object");
    });

    test("contains a 'name' key", () => {
      expect(workflow).toHaveProperty("name");
      expect(workflow.name).toBe("Build Electron App");
    });

    test("defines a 'build' job under 'jobs'", () => {
      expect(workflow).toHaveProperty("jobs");
      expect(workflow.jobs).toHaveProperty("build");
    });
  });

  describe("Workflow triggers", () => {
    test("defines an 'on' trigger", () => {
      expect(workflow).toHaveProperty("on");
    });

    test("'push' trigger includes branch 'main'", () => {
      const on = workflow.on;
      expect(on).toHaveProperty("push");
      expect(on.push).toHaveProperty("branches");
      expect(on.push.branches).toContain("main");
    });

    test("'workflow_call' trigger is present", () => {
      const on = workflow.on;
      const triggerKeys = Object.keys(on);
      expect(triggerKeys).toContain("workflow_call");
    });
  });

  describe("Build matrix covers all three platforms", () => {
    let matrixIncludes: any[];

    beforeAll(() => {
      matrixIncludes = workflow.jobs.build.strategy.matrix.include;
    });

    test("matrix uses 'include' directives", () => {
      expect(matrixIncludes).toBeDefined();
      expect(Array.isArray(matrixIncludes)).toBe(true);
      expect(matrixIncludes.length).toBe(3);
    });

    test("matrix includes ubuntu-latest with platform 'linux'", () => {
      const linux = matrixIncludes.find(
        (e: any) => e.os === "ubuntu-latest" && e.platform === "linux"
      );
      expect(linux).toBeDefined();
      expect(linux.package_script).toBe("electron:package:linux");
    });

    test("matrix includes windows-latest with platform 'windows'", () => {
      const windows = matrixIncludes.find(
        (e: any) => e.os === "windows-latest" && e.platform === "windows"
      );
      expect(windows).toBeDefined();
      expect(windows.package_script).toBe("electron:package:win");
    });

    test("matrix includes macos-latest with platform 'macos'", () => {
      const macos = matrixIncludes.find(
        (e: any) => e.os === "macos-latest" && e.platform === "macos"
      );
      expect(macos).toBeDefined();
      expect(macos.package_script).toBe("electron:package:mac");
    });

    test("each matrix entry maps to the correct npm script", () => {
      const scriptMap: Record<string, string> = {
        linux: "electron:package:linux",
        windows: "electron:package:win",
        macos: "electron:package:mac",
      };
      for (const entry of matrixIncludes) {
        expect(scriptMap[entry.platform]).toBe(entry.package_script);
      }
    });
  });

  describe("Job configuration", () => {
    let buildJob: any;

    beforeAll(() => {
      buildJob = workflow.jobs.build;
    });

    test("runs-on uses matrix.os", () => {
      expect(buildJob["runs-on"]).toBe("${{ matrix.os }}");
    });

    test("job name includes platform label", () => {
      expect(buildJob.name).toContain("${{ matrix.platform }}");
    });

    test("fail-fast is set to false", () => {
      expect(buildJob.strategy["fail-fast"]).toBe(false);
    });
  });

  describe("Workflow steps", () => {
    let steps: any[];

    beforeAll(() => {
      steps = workflow.jobs.build.steps;
    });

    test("has correct number of steps", () => {
      expect(steps.length).toBeGreaterThanOrEqual(6);
    });

    describe("Checkout step", () => {
      test("uses actions/checkout@v4", () => {
        const step = steps.find((s: any) => s.name === "Checkout code");
        expect(step).toBeDefined();
        expect(step.uses).toBe("actions/checkout@v4");
      });
    });

    describe("Setup Node.js step", () => {
      let nodeStep: any;

      beforeAll(() => {
        nodeStep = steps.find((s: any) => s.name === "Setup Node.js");
      });

      test("uses actions/setup-node@v4", () => {
        expect(nodeStep).toBeDefined();
        expect(nodeStep.uses).toBe("actions/setup-node@v4");
      });

      test("sets Node.js version to 20 (18+ LTS)", () => {
        expect(nodeStep.with["node-version"]).toBeGreaterThanOrEqual(18);
      });

      test("enables npm cache via setup-node built-in cache", () => {
        expect(nodeStep.with.cache).toBe("npm");
      });
    });

    describe("Cache node_modules step", () => {
      let cacheStep: any;

      beforeAll(() => {
        cacheStep = steps.find((s: any) => s.name === "Cache node_modules");
      });

      test("uses actions/cache@v4", () => {
        expect(cacheStep).toBeDefined();
        expect(cacheStep.uses).toBe("actions/cache@v4");
      });

      test("caches node_modules directory", () => {
        expect(cacheStep.with.path).toBe("node_modules");
      });

      test("cache key includes runner.os for platform-specific caching", () => {
        expect(cacheStep.with.key).toContain("${{ runner.os }}");
      });

      test("cache key includes package-lock.json hash", () => {
        expect(cacheStep.with.key).toContain(
          "${{ hashFiles('package-lock.json') }}"
        );
      });

      test("has an id for referencing in conditional steps", () => {
        expect(cacheStep.id).toBe("cache-node-modules");
      });
    });

    describe("Install dependencies step", () => {
      let installStep: any;

      beforeAll(() => {
        installStep = steps.find(
          (s: any) => s.name === "Install dependencies"
        );
      });

      test("runs npm ci", () => {
        expect(installStep).toBeDefined();
        expect(installStep.run).toBe("npm ci");
      });

      test("is conditional on cache miss", () => {
        expect(installStep.if).toContain("cache-node-modules");
        expect(installStep.if).toContain("cache-hit");
        expect(installStep.if).toContain("true");
      });
    });

    describe("Build step", () => {
      let buildStep: any;

      beforeAll(() => {
        buildStep = steps.find((s: any) =>
          s.name?.startsWith("Build for")
        );
      });

      test("runs the matrix package_script", () => {
        expect(buildStep).toBeDefined();
        expect(buildStep.run).toContain("${{ matrix.package_script }}");
      });

      test("disables macOS code signing via CSC_IDENTITY_AUTO_DISCOVERY", () => {
        expect(buildStep.env).toBeDefined();
        expect(buildStep.env.CSC_IDENTITY_AUTO_DISCOVERY).toBe(false);
      });
    });

    describe("Upload build artifacts step", () => {
      let uploadStep: any;

      beforeAll(() => {
        uploadStep = steps.find(
          (s: any) => s.name === "Upload build artifacts"
        );
      });

      test("uses actions/upload-artifact@v4", () => {
        expect(uploadStep).toBeDefined();
        expect(uploadStep.uses).toBe("actions/upload-artifact@v4");
      });

      test("artifact name follows 'build-{platform}' pattern", () => {
        expect(uploadStep.with.name).toBe("build-${{ matrix.platform }}");
      });

      test("uploads from release/ directory", () => {
        expect(uploadStep.with.path).toBe("release/");
      });

      test("retention is set to 7 days", () => {
        expect(uploadStep.with["retention-days"]).toBe(7);
      });

      test("fails if no files found (if-no-files-found: error)", () => {
        expect(uploadStep.with["if-no-files-found"]).toBe("error");
      });
    });
  });

  describe("Platform-specific build scripts match package.json", () => {
    let packageJson: any;

    beforeAll(() => {
      const pkgPath = path.resolve(__dirname, "..", "package.json");
      packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    });

    test("electron:package:linux script exists in package.json", () => {
      expect(packageJson.scripts["electron:package:linux"]).toBeDefined();
    });

    test("electron:package:win script exists in package.json", () => {
      expect(packageJson.scripts["electron:package:win"]).toBeDefined();
    });

    test("electron:package:mac script exists in package.json", () => {
      expect(packageJson.scripts["electron:package:mac"]).toBeDefined();
    });
  });

  describe("electron-builder.yml build output configuration", () => {
    let builderConfig: any;

    beforeAll(() => {
      const builderPath = path.resolve(
        __dirname,
        "..",
        "electron-builder.yml"
      );
      builderConfig = yaml.load(
        fs.readFileSync(builderPath, "utf-8")
      );
    });

    test("output directory is release/", () => {
      expect(builderConfig.directories.output).toBe("release/");
    });

    test("Windows targets include nsis and portable", () => {
      const winTargets = builderConfig.win.target.map(
        (t: any) => t.target
      );
      expect(winTargets).toContain("nsis");
      expect(winTargets).toContain("portable");
    });

    test("macOS targets include dmg and zip", () => {
      const macTargets = builderConfig.mac.target.map(
        (t: any) => t.target
      );
      expect(macTargets).toContain("dmg");
      expect(macTargets).toContain("zip");
    });

    test("Linux targets include AppImage and deb", () => {
      const linuxTargets = builderConfig.linux.target.map(
        (t: any) => t.target
      );
      expect(linuxTargets).toContain("AppImage");
      expect(linuxTargets).toContain("deb");
    });

    test("macOS builds target both x64 and arm64", () => {
      for (const target of builderConfig.mac.target) {
        expect(target.arch).toContain("x64");
        expect(target.arch).toContain("arm64");
      }
    });

    test("Windows builds target x64", () => {
      for (const target of builderConfig.win.target) {
        expect(target.arch).toContain("x64");
      }
    });

    test("Linux builds target x64", () => {
      for (const target of builderConfig.linux.target) {
        expect(target.arch).toContain("x64");
      }
    });
  });

  describe("Workflow step ordering", () => {
    let steps: any[];

    beforeAll(() => {
      steps = workflow.jobs.build.steps;
    });

    test("checkout happens before setup-node", () => {
      const checkoutIdx = steps.findIndex(
        (s: any) => s.name === "Checkout code"
      );
      const nodeIdx = steps.findIndex(
        (s: any) => s.name === "Setup Node.js"
      );
      expect(checkoutIdx).toBeLessThan(nodeIdx);
    });

    test("setup-node happens before cache", () => {
      const nodeIdx = steps.findIndex(
        (s: any) => s.name === "Setup Node.js"
      );
      const cacheIdx = steps.findIndex(
        (s: any) => s.name === "Cache node_modules"
      );
      expect(nodeIdx).toBeLessThan(cacheIdx);
    });

    test("cache happens before install", () => {
      const cacheIdx = steps.findIndex(
        (s: any) => s.name === "Cache node_modules"
      );
      const installIdx = steps.findIndex(
        (s: any) => s.name === "Install dependencies"
      );
      expect(cacheIdx).toBeLessThan(installIdx);
    });

    test("install happens before build", () => {
      const installIdx = steps.findIndex(
        (s: any) => s.name === "Install dependencies"
      );
      const buildIdx = steps.findIndex((s: any) =>
        s.name?.startsWith("Build for")
      );
      expect(installIdx).toBeLessThan(buildIdx);
    });

    test("build happens before upload", () => {
      const buildIdx = steps.findIndex((s: any) =>
        s.name?.startsWith("Build for")
      );
      const uploadIdx = steps.findIndex(
        (s: any) => s.name === "Upload build artifacts"
      );
      expect(buildIdx).toBeLessThan(uploadIdx);
    });
  });

  describe("Artifact naming convention", () => {
    test("Linux artifact is named 'build-linux'", () => {
      const linuxEntry = workflow.jobs.build.strategy.matrix.include.find(
        (e: any) => e.platform === "linux"
      );
      expect(linuxEntry).toBeDefined();
      const expectedName = `build-${linuxEntry.platform}`;
      expect(expectedName).toBe("build-linux");
    });

    test("Windows artifact is named 'build-windows'", () => {
      const winEntry = workflow.jobs.build.strategy.matrix.include.find(
        (e: any) => e.platform === "windows"
      );
      expect(winEntry).toBeDefined();
      const expectedName = `build-${winEntry.platform}`;
      expect(expectedName).toBe("build-windows");
    });

    test("macOS artifact is named 'build-macos'", () => {
      const macEntry = workflow.jobs.build.strategy.matrix.include.find(
        (e: any) => e.platform === "macos"
      );
      expect(macEntry).toBeDefined();
      const expectedName = `build-${macEntry.platform}`;
      expect(expectedName).toBe("build-macos");
    });
  });

  describe("Cache invalidation behavior", () => {
    test("cache key changes when package-lock.json changes", () => {
      const cacheStep = workflow.jobs.build.steps.find(
        (s: any) => s.name === "Cache node_modules"
      );
      const key = cacheStep.with.key;
      expect(key).toMatch(/hashFiles\(['"]package-lock\.json['"]\)/);
    });

    test("cache key is platform-specific via runner.os", () => {
      const cacheStep = workflow.jobs.build.steps.find(
        (s: any) => s.name === "Cache node_modules"
      );
      const key = cacheStep.with.key;
      expect(key).toContain("runner.os");
    });
  });

  describe("Code signing suppression", () => {
    test("CSC_IDENTITY_AUTO_DISCOVERY is set to false on build step", () => {
      const buildStep = workflow.jobs.build.steps.find((s: any) =>
        s.name?.startsWith("Build for")
      );
      expect(buildStep.env.CSC_IDENTITY_AUTO_DISCOVERY).toBe(false);
    });

    test("CSC_LINK is not set (Windows signing skipped by default)", () => {
      const buildStep = workflow.jobs.build.steps.find((s: any) =>
        s.name?.startsWith("Build for")
      );
      expect(buildStep.env.CSC_LINK).toBeUndefined();
    });
  });

  describe("Workflow YAML structure completeness", () => {
    test("no extra triggers beyond push and workflow_call", () => {
      const triggers = Object.keys(workflow.on);
      expect(triggers).toEqual(
        expect.arrayContaining(["push", "workflow_call"])
      );
      expect(triggers.length).toBe(2);
    });

    test("only one job is defined (build)", () => {
      const jobKeys = Object.keys(workflow.jobs);
      expect(jobKeys).toEqual(["build"]);
    });

    test("workflow file has no trailing content issues", () => {
      expect(workflowContent.trim()).not.toBe("");
      const parsed = yaml.load(workflowContent);
      expect(parsed).not.toBeNull();
    });
  });
});
