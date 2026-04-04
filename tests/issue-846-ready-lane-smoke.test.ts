import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const WORKFLOW_PATH = path.resolve(
  __dirname,
  "..",
  ".github",
  "workflows",
  "smoke-ready.yml"
);

let workflowContent: string;
let workflow: any;

beforeAll(() => {
  workflowContent = fs.readFileSync(WORKFLOW_PATH, "utf-8");
  workflow = yaml.load(workflowContent);
});

describe("Issue #846: Ready lane smoke workflow", () => {
  describe("Workflow file existence and validity", () => {
    test("'.github/workflows/smoke-ready.yml' exists in the repository", () => {
      expect(fs.existsSync(WORKFLOW_PATH)).toBe(true);
    });

    test("file is valid YAML", () => {
      expect(() => yaml.load(workflowContent)).not.toThrow();
      expect(workflow).toBeDefined();
      expect(typeof workflow).toBe("object");
    });

    test("workflow name is 'Ready Lane Smoke'", () => {
      expect(workflow).toHaveProperty("name");
      expect(workflow.name).toBe("Ready Lane Smoke");
    });

    test("defines a 'smoke' job under 'jobs'", () => {
      expect(workflow).toHaveProperty("jobs");
      expect(workflow.jobs).toHaveProperty("smoke");
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

    test("'pull_request' trigger is present", () => {
      const triggerKeys = Object.keys(workflow.on);
      expect(triggerKeys).toContain("pull_request");
    });

    test("'workflow_call' trigger is present", () => {
      const triggerKeys = Object.keys(workflow.on);
      expect(triggerKeys).toContain("workflow_call");
    });
  });

  describe("Smoke job configuration", () => {
    let smokeJob: any;

    beforeAll(() => {
      smokeJob = workflow.jobs.smoke;
    });

    test("runs on ubuntu-latest", () => {
      expect(smokeJob["runs-on"]).toBe("ubuntu-latest");
    });

    test("job name is 'Smoke Tests'", () => {
      expect(smokeJob.name).toBe("Smoke Tests");
    });
  });

  describe("Workflow steps", () => {
    let steps: any[];

    beforeAll(() => {
      steps = workflow.jobs.smoke.steps;
    });

    test("has at least 5 steps", () => {
      expect(steps.length).toBeGreaterThanOrEqual(5);
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
        installStep = steps.find((s: any) => s.name === "Install dependencies");
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

    describe("Run smoke tests step", () => {
      let testStep: any;

      beforeAll(() => {
        testStep = steps.find((s: any) => s.name === "Run smoke tests");
      });

      test("runs 'npm test'", () => {
        expect(testStep).toBeDefined();
        expect(testStep.run).toBe("npm test");
      });
    });
  });

  describe("Workflow step ordering", () => {
    let steps: any[];

    beforeAll(() => {
      steps = workflow.jobs.smoke.steps;
    });

    test("checkout happens before setup-node", () => {
      const checkoutIdx = steps.findIndex((s: any) => s.name === "Checkout code");
      const nodeIdx = steps.findIndex((s: any) => s.name === "Setup Node.js");
      expect(checkoutIdx).toBeLessThan(nodeIdx);
    });

    test("setup-node happens before cache", () => {
      const nodeIdx = steps.findIndex((s: any) => s.name === "Setup Node.js");
      const cacheIdx = steps.findIndex((s: any) => s.name === "Cache node_modules");
      expect(nodeIdx).toBeLessThan(cacheIdx);
    });

    test("cache happens before install", () => {
      const cacheIdx = steps.findIndex((s: any) => s.name === "Cache node_modules");
      const installIdx = steps.findIndex((s: any) => s.name === "Install dependencies");
      expect(cacheIdx).toBeLessThan(installIdx);
    });

    test("install happens before test", () => {
      const installIdx = steps.findIndex((s: any) => s.name === "Install dependencies");
      const testIdx = steps.findIndex((s: any) => s.name === "Run smoke tests");
      expect(installIdx).toBeLessThan(testIdx);
    });
  });

  describe("Workflow YAML structure completeness", () => {
    test("only one job is defined (smoke)", () => {
      const jobKeys = Object.keys(workflow.jobs);
      expect(jobKeys).toEqual(["smoke"]);
    });

    test("workflow file is non-empty and parses cleanly", () => {
      expect(workflowContent.trim()).not.toBe("");
      expect(yaml.load(workflowContent)).not.toBeNull();
    });
  });

  describe("npm test script exists in package.json", () => {
    let packageJson: any;

    beforeAll(() => {
      const pkgPath = path.resolve(__dirname, "..", "package.json");
      packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    });

    test("'test' script is defined in package.json", () => {
      expect(packageJson.scripts["test"]).toBeDefined();
    });

    test("'test' script invokes jest", () => {
      expect(packageJson.scripts["test"]).toContain("jest");
    });
  });
});
