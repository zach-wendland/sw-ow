// Simple HTTP-based UI testing
const BASE_URL = 'http://localhost:3000';

async function testEndpoint(path, expectedContent) {
  console.log(`\nTesting ${path}...`);
  try {
    const response = await fetch(`${BASE_URL}${path}`);
    const html = await response.text();

    console.log(`✓ Status: ${response.status}`);
    console.log(`✓ Content-Type: ${response.headers.get('content-type')}`);
    console.log(`✓ Content length: ${html.length} bytes`);

    // Check for expected content
    const checks = Array.isArray(expectedContent) ? expectedContent : [expectedContent];
    let foundCount = 0;
    for (const check of checks) {
      if (html.includes(check)) {
        console.log(`✓ Found: "${check.substring(0, 50)}${check.length > 50 ? '...' : ''}"`);
        foundCount++;
      } else {
        console.log(`✗ Missing: "${check.substring(0, 50)}${check.length > 50 ? '...' : ''}"`);
      }
    }

    return { success: response.status === 200 && foundCount === checks.length, status: response.status, foundCount, total: checks.length };
  } catch (error) {
    console.log(`✗ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║       SW-OW HTTP-Based UI Structure Test            ║');
console.log('╚═══════════════════════════════════════════════════════╝');

const tests = [
  {
    path: '/',
    checks: ['SW-OW', 'Play Now', 'Open World', 'Combat System']
  },
  {
    path: '/characters',
    checks: ['Select Your Character', 'Create Character', 'SW-OW']
  },
  {
    path: '/game',
    checks: ['canvas', 'hud']  // Game page should have canvas element
  }
];

(async () => {
  const results = [];
  for (const test of tests) {
    const result = await testEndpoint(test.path, test.checks);
    results.push({ path: test.path, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
  }

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  for (const result of results) {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} ${result.path} (${result.foundCount || 0}/${result.total || 0} checks passed)`);
  }

  const passedCount = results.filter(r => r.success).length;
  console.log(`\nTotal: ${passedCount}/${results.length} endpoints passed\n`);
})();
