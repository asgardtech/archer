const fs = require('fs');
const path = require('path');

const DOCS_PATH = path.resolve(__dirname, '..', 'docs', 'steam-release.md');
const README_PATH = path.resolve(__dirname, '..', 'README.md');

let docContent;
let readmeContent;

beforeAll(() => {
  docContent = fs.existsSync(DOCS_PATH) ? fs.readFileSync(DOCS_PATH, 'utf-8') : null;
  readmeContent = fs.existsSync(README_PATH) ? fs.readFileSync(README_PATH, 'utf-8') : null;
});

function extractSection(markdown, sectionTitle) {
  const lines = markdown.split('\n');
  const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const titleRe = new RegExp(`^##\\s+${escapedTitle}\\b`);
  let inSection = false;
  const sectionLines = [];

  for (const line of lines) {
    if (!inSection && titleRe.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^## (?!#)/.test(line)) {
      break;
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }

  return sectionLines.length > 0 ? sectionLines.join('\n') : null;
}

function getHeadings(markdown) {
  const headingRe = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRe.exec(markdown)) !== null) {
    headings.push({ level: match[1].length, text: match[2].trim() });
  }
  return headings;
}

// ====================================================================
// File existence and structure
// ====================================================================

describe('File existence and structure', () => {
  test('Documentation file exists at docs/steam-release.md', () => {
    expect(fs.existsSync(DOCS_PATH)).toBe(true);
  });

  test('File is valid Markdown (contains headings)', () => {
    expect(docContent).not.toBeNull();
    const headings = getHeadings(docContent);
    expect(headings.length).toBeGreaterThan(0);
  });

  test('Contains all required top-level sections', () => {
    const headings = getHeadings(docContent);
    const h2Texts = headings.filter(h => h.level === 2).map(h => h.text);

    const requiredSections = [
      'Prerequisites',
      'Steamworks Portal Setup',
      'GitHub Secrets Configuration',
      'Updating App/Depot IDs',
      'Performing a Release',
      'Troubleshooting',
    ];

    for (const section of requiredSections) {
      expect(h2Texts).toContainEqual(expect.stringContaining(section));
    }
  });
});

// ====================================================================
// Prerequisites section
// ====================================================================

describe('Prerequisites section', () => {
  let section;
  beforeAll(() => {
    section = extractSection(docContent, 'Prerequisites');
  });

  test('Section exists', () => {
    expect(section).not.toBeNull();
  });

  test('Mentions Steamworks partner account', () => {
    expect(section).toMatch(/steamworks\s+partner\s+account/i);
  });

  test('Mentions Steam App ID and Depot IDs', () => {
    expect(section).toMatch(/app\s*id/i);
    expect(section).toMatch(/depot\s*id/i);
  });

  test('Mentions dedicated Steam builder account for CI', () => {
    expect(section).toMatch(/dedicated/i);
    expect(section).toMatch(/builder/i);
  });

  test('Mentions GitHub repository admin access', () => {
    expect(section).toMatch(/github/i);
    expect(section).toMatch(/admin\s+access/i);
  });
});

// ====================================================================
// Steamworks Portal Setup section
// ====================================================================

describe('Steamworks Portal Setup section', () => {
  let section;
  beforeAll(() => {
    section = extractSection(docContent, 'Steamworks Portal Setup');
  });

  test('Section exists', () => {
    expect(section).not.toBeNull();
  });

  test('Explains creating Windows, macOS, and Linux depots', () => {
    expect(section).toMatch(/windows/i);
    expect(section).toMatch(/macos/i);
    expect(section).toMatch(/linux/i);
    expect(section).toMatch(/depot/i);
  });

  test('Explains how to configure launch options per platform', () => {
    expect(section).toMatch(/launch\s+option/i);
    expect(section).toMatch(/Archer\.exe/);
    expect(section).toMatch(/Archer\.app/);
    expect(section).toMatch(/\barcher\b/);
  });

  test('Explains staging, beta, and default branches', () => {
    expect(section).toMatch(/staging/i);
    expect(section).toMatch(/beta/i);
    expect(section).toMatch(/default/i);
  });
});

// ====================================================================
// GitHub Secrets Configuration section
// ====================================================================

describe('GitHub Secrets Configuration section', () => {
  let section;
  beforeAll(() => {
    section = extractSection(docContent, 'GitHub Secrets Configuration');
  });

  test('Section exists', () => {
    expect(section).not.toBeNull();
  });

  test('Contains instructions for STEAM_USERNAME secret', () => {
    expect(section).toMatch(/STEAM_USERNAME/);
  });

  test('Specifies value is the builder account username', () => {
    expect(section).toMatch(/builder\s+account.*username|username.*builder/is);
  });

  test('Instructs installing SteamCMD locally', () => {
    expect(section).toMatch(/install\s+steamcmd/i);
  });

  test('Includes the steamcmd +login command', () => {
    expect(section).toMatch(/steamcmd\s+\+login/i);
  });

  test('Mentions Steam Guard authentication', () => {
    expect(section).toMatch(/steam\s*guard/i);
  });

  test('Lists config.vdf file paths for Linux, macOS, and Windows', () => {
    expect(section).toMatch(/~\/\.steam/);
    expect(section).toMatch(/Library\/Application Support\/Steam/);
    expect(section).toMatch(/Program Files.*Steam/i);
  });

  test('Includes base64 encoding command with no-wrap flag', () => {
    expect(section).toMatch(/base64\s+-w\s*0/);
  });

  test('Instructs storing result as STEAM_CONFIG_VDF repository secret', () => {
    expect(section).toMatch(/STEAM_CONFIG_VDF/);
    expect(section).toMatch(/secret/i);
  });

  test('Describes symptoms of expired config.vdf', () => {
    expect(section).toMatch(/expired?\s*login/i);
  });

  test('Explains how to regenerate and update the secret', () => {
    expect(section).toMatch(/rotat/i);
    expect(section).toMatch(/repeat|re-?encode|regenerat/i);
  });
});

// ====================================================================
// Updating App/Depot IDs section
// ====================================================================

describe('Updating App/Depot IDs section', () => {
  let section;
  beforeAll(() => {
    section = extractSection(docContent, 'Updating App/Depot IDs');
  });

  test('Section exists', () => {
    expect(section).not.toBeNull();
  });

  test('References steamcmd/app_build.vdf with placeholder 1000', () => {
    expect(section).toMatch(/app_build\.vdf/);
    expect(section).toMatch(/1000/);
  });

  test('References steamcmd/depot_build_windows.vdf with placeholder 1001', () => {
    expect(section).toMatch(/depot_build_windows\.vdf/);
    expect(section).toMatch(/1001/);
  });

  test('References steamcmd/depot_build_macos.vdf with placeholder 1002', () => {
    expect(section).toMatch(/depot_build_macos\.vdf/);
    expect(section).toMatch(/1002/);
  });

  test('References steamcmd/depot_build_linux.vdf with placeholder 1003', () => {
    expect(section).toMatch(/depot_build_linux\.vdf/);
    expect(section).toMatch(/1003/);
  });

  test('References steam_appid.txt with placeholder 480', () => {
    expect(section).toMatch(/steam_appid\.txt/);
    expect(section).toMatch(/480/);
  });

  test('Mentions steam_appid.txt is bundled into Electron builds', () => {
    expect(section).toMatch(/bundl|cop(y|ied)|packag/i);
    expect(section).toMatch(/electron/i);
  });

  test('References electron-builder.yml extraFiles configuration', () => {
    expect(section).toMatch(/electron-builder\.yml/);
    expect(section).toMatch(/extraFiles/);
  });
});

// ====================================================================
// Performing a Release section
// ====================================================================

describe('Performing a Release section', () => {
  let section;
  beforeAll(() => {
    section = extractSection(docContent, 'Performing a Release');
  });

  test('Section exists', () => {
    expect(section).not.toBeNull();
  });

  test('Describes navigating to GitHub Actions UI', () => {
    expect(section).toMatch(/actions/i);
    expect(section).toMatch(/github/i);
  });

  test('References the "Release to Steam" workflow', () => {
    expect(section).toMatch(/Release to Steam/i);
  });

  test('Explains the "Run workflow" button', () => {
    expect(section).toMatch(/run\s+workflow/i);
  });

  test('Documents version input as optional with semver format', () => {
    expect(section).toMatch(/version/i);
    expect(section).toMatch(/semver/i);
    expect(section).toMatch(/optional|no\b/i);
  });

  test('Explains providing version bumps package.json and creates a git tag', () => {
    expect(section).toMatch(/package\.json/);
    expect(section).toMatch(/tag/i);
  });

  test('Documents steam_branch input with default "staging"', () => {
    expect(section).toMatch(/steam_branch/);
    expect(section).toMatch(/staging/);
  });

  test('Lists valid branch values: staging, beta, default', () => {
    expect(section).toMatch(/staging/);
    expect(section).toMatch(/beta/);
    expect(section).toMatch(/default/);
  });

  test('Documents description input as optional', () => {
    expect(section).toMatch(/description/i);
  });

  test('Describes the version-bump job and when it is skipped', () => {
    expect(section).toMatch(/version-bump/);
    expect(section).toMatch(/skip/i);
  });

  test('Describes the build job running on three platforms', () => {
    expect(section).toMatch(/build/i);
    expect(section).toMatch(/linux/i);
    expect(section).toMatch(/windows/i);
    expect(section).toMatch(/macos/i);
  });

  test('Describes the upload-to-steam job', () => {
    expect(section).toMatch(/upload[_-]to[_-]steam/i);
  });

  test('Instructs checking Steamworks partner portal for new build', () => {
    expect(section).toMatch(/steamworks/i);
    expect(section).toMatch(/partner\s*portal/i);
  });

  test('Explains how to promote a build from staging to production', () => {
    expect(section).toMatch(/promot|set\s+(build\s+)?live/i);
    expect(section).toMatch(/default/);
  });
});

// ====================================================================
// Troubleshooting section
// ====================================================================

describe('Troubleshooting section', () => {
  let section;
  beforeAll(() => {
    section = extractSection(docContent, 'Troubleshooting');
  });

  test('Section exists', () => {
    expect(section).not.toBeNull();
  });

  test('Addresses "Login Failure: Expired Login" with a fix', () => {
    expect(section).toMatch(/Expired\s*Login/i);
    expect(section).toMatch(/rotat|re-?generat|re-?encode|update/i);
  });

  test('Addresses "Login Failure: Invalid Login" with a fix', () => {
    expect(section).toMatch(/Invalid\s*Login/i);
  });

  test('Addresses failed application info errors', () => {
    expect(section).toMatch(/failed\s+to\s+get\s+application\s+info/i);
  });

  test('Mentions downloading steam-build-logs artifacts for debugging', () => {
    expect(section).toMatch(/steam-build-logs/);
  });

  test('Explains version tag already exists scenario', () => {
    expect(section).toMatch(/tag.*already\s+exist/i);
  });

  test('Provides options: use new version or omit version input', () => {
    expect(section).toMatch(/new\s+version|omit/i);
  });

  test('Covers partial failure recovery (version-bump succeeds but build fails)', () => {
    expect(section).toMatch(/version-bump/i);
    expect(section).toMatch(/fail/i);
  });

  test('Explains recovery options including tag deletion', () => {
    expect(section).toMatch(/delete.*tag|tag.*delet/i);
    expect(section).toMatch(/git\s+push\s+--delete/i);
  });
});

// ====================================================================
// README.md cross-reference
// ====================================================================

describe('README.md cross-reference', () => {
  test('README.md exists', () => {
    expect(fs.existsSync(README_PATH)).toBe(true);
  });

  test('Contains a section mentioning "Steam"', () => {
    expect(readmeContent).toMatch(/##\s+.*Steam/i);
  });

  test('Contains a relative link to docs/steam-release.md', () => {
    expect(readmeContent).toMatch(/\(docs\/steam-release\.md\)/);
  });

  test('Steam section is concise (no more than 5 lines)', () => {
    const section = extractSection(readmeContent, 'Steam Release');
    expect(section).not.toBeNull();
    const nonEmptyLines = section.trim().split('\n').filter(l => l.trim().length > 0);
    expect(nonEmptyLines.length).toBeLessThanOrEqual(5);
  });

  test('Steam section does not duplicate content from docs/steam-release.md', () => {
    const section = extractSection(readmeContent, 'Steam Release');
    expect(section).not.toBeNull();
    expect(section).not.toMatch(/SteamCMD/);
    expect(section).not.toMatch(/STEAM_CONFIG_VDF/);
    expect(section).not.toMatch(/depot/i);
  });
});

// ====================================================================
// Edge cases
// ====================================================================

describe('Edge cases', () => {
  test('Documents macOS architecture choice (arm64 / Apple Silicon)', () => {
    const armMatches = docContent.match(/arm64|apple\s*silicon/gi);
    expect(armMatches).not.toBeNull();
    expect(docContent).toMatch(/intel|x64/i);
    expect(docContent).toMatch(/depot_build_macos\.vdf/);
  });

  test('Documents how to switch to Intel builds', () => {
    expect(docContent).toMatch(/ContentRoot/);
    expect(docContent).toMatch(/release\/mac\b/);
  });

  test('Documents base64 -w 0 for Linux', () => {
    expect(docContent).toMatch(/base64\s+-w\s*0/);
  });

  test('Documents macOS base64 equivalent (-b 0)', () => {
    expect(docContent).toMatch(/base64\s+-b\s*0/);
  });

  test('Explains concurrent release behavior (only one at a time)', () => {
    expect(docContent).toMatch(/concurren/i);
    expect(docContent).toMatch(/one.*release.*at\s+a\s+time|only\s+one/i);
  });

  test('Explains subsequent dispatches queue rather than cancel', () => {
    expect(docContent).toMatch(/queue/i);
    expect(docContent).toMatch(/cancel/i);
  });

  test('Explains partial failure recovery (version-bump succeeds but build fails)', () => {
    const troubleshooting = extractSection(docContent, 'Troubleshooting');
    expect(troubleshooting).toMatch(/version-bump.*succeed|version-bump.*but/i);
    expect(troubleshooting).toMatch(/tag/i);
    expect(troubleshooting).toMatch(/delet/i);
  });
});

// ====================================================================
// Content accuracy against codebase artifacts
// ====================================================================

describe('Content accuracy against codebase artifacts', () => {
  test('Correctly references CyberAndrii/setup-steamcmd action', () => {
    expect(docContent).toMatch(/CyberAndrii\/setup-steamcmd/);
  });

  test('Correctly references ~/Steam/config/config.vdf CI path', () => {
    expect(docContent).toMatch(/~\/Steam\/config\/config\.vdf/);
  });

  test('Correctly references steam-build-logs artifact name', () => {
    expect(docContent).toMatch(/steam-build-logs/);
  });

  test('Correctly references build artifact names (build-linux, build-windows, build-macos)', () => {
    expect(docContent).toMatch(/build-linux/);
    expect(docContent).toMatch(/build-windows/);
    expect(docContent).toMatch(/build-macos/);
  });

  test('References release directory paths matching depot VDF configs', () => {
    expect(docContent).toMatch(/win-unpacked/);
    expect(docContent).toMatch(/mac-arm64/);
    expect(docContent).toMatch(/linux-unpacked/);
  });

  test('References steamcmd/README.md for additional VDF details', () => {
    expect(docContent).toMatch(/steamcmd\/README\.md/);
  });

  test('Security: warns never to commit credentials', () => {
    expect(docContent).toMatch(/never\s+commit/i);
  });

  test('Security: recommends dedicated builder account (not personal)', () => {
    expect(docContent).toMatch(/not.*personal|separate.*personal|dedicated/i);
  });

  test('Documents 14-day retention for build logs artifact', () => {
    expect(docContent).toMatch(/14\s*day/i);
  });

  test('Documents cancel-in-progress: false behavior', () => {
    expect(docContent).toMatch(/cancel-in-progress/);
  });

  test('Documents Spacewar test app (480) for local development', () => {
    expect(docContent).toMatch(/480/);
    expect(docContent).toMatch(/spacewar/i);
  });

  test('Mentions electron-builder.yml extraFiles for steam_appid.txt bundling', () => {
    expect(docContent).toMatch(/electron-builder\.yml/);
    expect(docContent).toMatch(/extraFiles/);
  });
});
