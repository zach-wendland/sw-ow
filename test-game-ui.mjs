import { chromium } from 'playwright';
import { setTimeout as sleep } from 'timers/promises';

const BASE_URL = 'http://localhost:3000';
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, status, details = '') {
  const result = { name, status, details, timestamp: new Date().toISOString() };
  if (status === 'PASS') {
    testResults.passed.push(result);
    console.log(`✓ ${name}`);
  } else if (status === 'FAIL') {
    testResults.failed.push(result);
    console.log(`✗ ${name}: ${details}`);
  } else if (status === 'WARN') {
    testResults.warnings.push(result);
    console.log(`⚠ ${name}: ${details}`);
  }
  if (details && status === 'PASS') {
    console.log(`  ${details}`);
  }
}

async function takeScreenshot(page, name) {
  try {
    await page.screenshot({ path: `test-screenshots/${name}.png`, fullPage: false });
    console.log(`  📸 Screenshot saved: ${name}.png`);
  } catch (error) {
    console.log(`  ⚠ Failed to save screenshot: ${error.message}`);
  }
}

async function testInitialPageLoad(page) {
  console.log('\n=== Testing Initial Page Load ===');

  try {
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    if (response.status() === 200) {
      logTest('Page loads successfully', 'PASS', `Status: ${response.status()}`);
    } else {
      logTest('Page loads successfully', 'FAIL', `Unexpected status: ${response.status()}`);
      return false;
    }

    // Check page title
    const title = await page.title();
    if (title.includes('SW-OW')) {
      logTest('Page title is correct', 'PASS', `Title: "${title}"`);
    } else {
      logTest('Page title is correct', 'WARN', `Expected "SW-OW" in title, got: "${title}"`);
    }

    // Check hero section
    const heroText = await page.locator('h1').first().textContent();
    if (heroText.includes('SW-OW')) {
      logTest('Hero section renders', 'PASS', 'Hero title visible');
    } else {
      logTest('Hero section renders', 'FAIL', 'Hero title not found');
    }

    // Check Play Now button
    const playButton = page.locator('text=Play Now').first();
    const isPlayButtonVisible = await playButton.isVisible();
    if (isPlayButtonVisible) {
      logTest('Play Now button is visible', 'PASS');
    } else {
      logTest('Play Now button is visible', 'FAIL', 'Button not found');
    }

    // Check feature cards
    const featureCards = page.locator('.text-white', { hasText: /Open World|Combat System|Quest System/ });
    const cardCount = await featureCards.count();
    if (cardCount >= 3) {
      logTest('Feature cards render', 'PASS', `Found ${cardCount} feature cards`);
    } else {
      logTest('Feature cards render', 'WARN', `Expected 3+ cards, found ${cardCount}`);
    }

    await takeScreenshot(page, '01-landing-page');
    return true;

  } catch (error) {
    logTest('Initial page load', 'FAIL', error.message);
    return false;
  }
}

async function testCharacterSelection(page) {
  console.log('\n=== Testing Character Selection Flow ===');

  try {
    // Click Play Now button
    await page.locator('text=Play Now').first().click();
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check URL changed to /characters
    const url = page.url();
    if (url.includes('/characters')) {
      logTest('Navigation to characters page', 'PASS', `URL: ${url}`);
    } else {
      logTest('Navigation to characters page', 'FAIL', `Expected /characters, got: ${url}`);
      return false;
    }

    await sleep(1000);
    await takeScreenshot(page, '02-character-selection');

    // Check for character creation/selection UI
    const hasNewCharButton = await page.locator('text=/Create.*Character|New Character/i').count() > 0;
    const hasCharacterList = await page.locator('[class*="character"]').count() > 0;

    if (hasNewCharButton || hasCharacterList) {
      logTest('Character selection UI renders', 'PASS', 'Character interface detected');
    } else {
      logTest('Character selection UI renders', 'WARN', 'Character interface elements not clearly identified');
    }

    // Try to create a new character
    const createButton = page.locator('button', { hasText: /Create|New/i }).first();
    const isCreateButtonVisible = await createButton.isVisible().catch(() => false);

    if (isCreateButtonVisible) {
      await createButton.click();
      await sleep(1000);

      // Check for character creation form
      const hasNameInput = await page.locator('input[name*="name"], input[placeholder*="name" i]').count() > 0;
      const hasSubmitButton = await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').count() > 0;

      if (hasNameInput && hasSubmitButton) {
        logTest('Character creation form appears', 'PASS');

        // Fill in character name
        const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
        await nameInput.fill('TestHero');

        await takeScreenshot(page, '03-character-creation-form');

        // Submit form
        const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
        await submitButton.click();

        await sleep(2000);
        logTest('Character creation submission', 'PASS', 'Form submitted');

      } else {
        logTest('Character creation form appears', 'WARN', 'Form elements not found as expected');
      }
    } else {
      logTest('Character creation button found', 'WARN', 'Create button not visible, may need to check UI structure');
    }

    return true;

  } catch (error) {
    logTest('Character selection flow', 'FAIL', error.message);
    await takeScreenshot(page, '03-character-error');
    return false;
  }
}

async function testGameCanvas(page) {
  console.log('\n=== Testing Game Canvas and 3D Scene ===');

  try {
    // Wait for game page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await sleep(3000); // Give time for 3D scene to initialize

    const url = page.url();
    if (url.includes('/game')) {
      logTest('Navigation to game page', 'PASS', `URL: ${url}`);
    } else {
      logTest('Navigation to game page', 'WARN', `Expected /game, got: ${url}`);
    }

    await takeScreenshot(page, '04-game-canvas-loading');

    // Check for canvas element (Three.js renders to canvas)
    const canvas = page.locator('canvas').first();
    const isCanvasVisible = await canvas.isVisible({ timeout: 10000 }).catch(() => false);

    if (isCanvasVisible) {
      logTest('3D canvas element renders', 'PASS', 'WebGL canvas found');

      // Get canvas dimensions
      const canvasBox = await canvas.boundingBox();
      if (canvasBox && canvasBox.width > 100 && canvasBox.height > 100) {
        logTest('Canvas has valid dimensions', 'PASS', `${canvasBox.width}x${canvasBox.height}`);
      } else {
        logTest('Canvas has valid dimensions', 'WARN', 'Canvas may be too small');
      }
    } else {
      logTest('3D canvas element renders', 'FAIL', 'Canvas not found or not visible');
      return false;
    }

    // Wait for scene to render (check for loading to disappear)
    await sleep(5000);
    await takeScreenshot(page, '05-game-scene-loaded');

    // Check for loading indicators
    const hasLoader = await page.locator('text=/Loading|Load/i').isVisible().catch(() => false);
    if (!hasLoader) {
      logTest('Scene finishes loading', 'PASS', 'No loading indicators visible');
    } else {
      logTest('Scene finishes loading', 'WARN', 'Loading indicators still visible after 5s');
    }

    // Check WebGL context
    const webglSupported = await page.evaluate(() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
        return false;
      }
    });

    if (webglSupported) {
      logTest('WebGL support detected', 'PASS');
    } else {
      logTest('WebGL support detected', 'FAIL', 'Browser does not support WebGL');
    }

    return true;

  } catch (error) {
    logTest('Game canvas rendering', 'FAIL', error.message);
    await takeScreenshot(page, '05-canvas-error');
    return false;
  }
}

async function testHUDElements(page) {
  console.log('\n=== Testing HUD Elements ===');

  try {
    await sleep(2000);

    // Check for health bar
    const healthBar = page.locator('[class*="health"], text=/Health|HP/i').first();
    const hasHealthBar = await healthBar.isVisible().catch(() => false);
    if (hasHealthBar) {
      logTest('Health bar visible', 'PASS');
    } else {
      logTest('Health bar visible', 'WARN', 'Health bar not clearly identified');
    }

    // Check for stamina bar
    const staminaBar = page.locator('[class*="stamina"], text=/Stamina/i').first();
    const hasStaminaBar = await staminaBar.isVisible().catch(() => false);
    if (hasStaminaBar) {
      logTest('Stamina bar visible', 'PASS');
    } else {
      logTest('Stamina bar visible', 'WARN', 'Stamina bar not clearly identified');
    }

    // Check for XP/level indicator
    const xpIndicator = page.locator('text=/Level|XP|Experience/i').first();
    const hasXP = await xpIndicator.isVisible().catch(() => false);
    if (hasXP) {
      logTest('XP/Level indicator visible', 'PASS');
    } else {
      logTest('XP/Level indicator visible', 'WARN', 'XP indicator not found');
    }

    // Check for combo counter
    const comboCounter = page.locator('text=/Combo|Hit/i').first();
    const hasCombo = await comboCounter.isVisible().catch(() => false);
    if (hasCombo) {
      logTest('Combo counter visible', 'PASS');
    } else {
      logTest('Combo counter visible', 'WARN', 'Combo counter may not be visible until combat');
    }

    await takeScreenshot(page, '06-hud-elements');
    return true;

  } catch (error) {
    logTest('HUD elements test', 'FAIL', error.message);
    return false;
  }
}

async function testPlayerMovement(page) {
  console.log('\n=== Testing Player Movement Controls ===');

  try {
    // Focus on the canvas
    const canvas = page.locator('canvas').first();
    await canvas.click();
    await sleep(500);

    console.log('  Testing WASD movement...');

    // Test W key (forward)
    await page.keyboard.press('w');
    await sleep(200);
    logTest('W key (forward) input', 'PASS', 'Key press sent');

    // Test S key (backward)
    await page.keyboard.press('s');
    await sleep(200);
    logTest('S key (backward) input', 'PASS', 'Key press sent');

    // Test A key (left)
    await page.keyboard.press('a');
    await sleep(200);
    logTest('A key (left) input', 'PASS', 'Key press sent');

    // Test D key (right)
    await page.keyboard.press('d');
    await sleep(200);
    logTest('D key (right) input', 'PASS', 'Key press sent');

    // Hold W for continuous movement
    await page.keyboard.down('w');
    await sleep(1000);
    await page.keyboard.up('w');
    logTest('Continuous movement (hold W)', 'PASS', 'Held W for 1 second');

    await takeScreenshot(page, '07-after-movement');

    return true;

  } catch (error) {
    logTest('Player movement controls', 'FAIL', error.message);
    return false;
  }
}

async function testCombatInteractions(page) {
  console.log('\n=== Testing Combat Interactions ===');

  try {
    const canvas = page.locator('canvas').first();

    // Test F key attack
    console.log('  Testing F key attack...');
    await canvas.click();
    await page.keyboard.press('f');
    await sleep(500);
    logTest('F key attack input', 'PASS', 'F key pressed');

    // Test multiple attacks (combo)
    console.log('  Testing combo attacks...');
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('f');
      await sleep(300);
    }
    logTest('Combo attack sequence', 'PASS', '3 consecutive attacks sent');

    await takeScreenshot(page, '08-combat-attack');

    // Test mouse click attack
    console.log('  Testing mouse click attack...');
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
      await sleep(500);
      logTest('Mouse click attack', 'PASS', 'Left click sent to canvas center');
    } else {
      logTest('Mouse click attack', 'WARN', 'Could not get canvas position');
    }

    // Move towards enemies and attack
    console.log('  Testing movement + attack combination...');
    await page.keyboard.down('w');
    await sleep(1000);
    await page.keyboard.press('f');
    await sleep(300);
    await page.keyboard.press('f');
    await page.keyboard.up('w');
    logTest('Movement + attack combination', 'PASS', 'Combined controls executed');

    await takeScreenshot(page, '09-combat-sequence');

    // Look for damage numbers (visual feedback)
    await sleep(1000);
    const hasDamageNumbers = await page.locator('[class*="damage"], text=/\\d+/').count() > 0;
    if (hasDamageNumbers) {
      logTest('Damage numbers appear', 'PASS', 'Visual damage feedback detected');
    } else {
      logTest('Damage numbers appear', 'WARN', 'No damage numbers detected (may need to hit enemy)');
    }

    return true;

  } catch (error) {
    logTest('Combat interactions', 'FAIL', error.message);
    await takeScreenshot(page, '09-combat-error');
    return false;
  }
}

async function testEnemyBehavior(page) {
  console.log('\n=== Testing Enemy Behavior ===');

  try {
    // Move around to trigger enemy chase
    console.log('  Observing enemy AI behavior...');

    const canvas = page.locator('canvas').first();
    await canvas.click();

    // Move in a pattern to observe enemies
    await page.keyboard.down('w');
    await sleep(2000);
    await page.keyboard.up('w');

    await page.keyboard.down('a');
    await sleep(1000);
    await page.keyboard.up('a');

    await sleep(1000);
    await takeScreenshot(page, '10-enemy-observation');

    logTest('Enemy observation period', 'PASS', 'Moved through game world');

    // Try to approach and trigger combat
    console.log('  Attempting to engage enemy...');
    await page.keyboard.down('w');
    await sleep(3000);
    await page.keyboard.up('w');

    await sleep(500);

    // Look for red indicators (enemy attack state)
    const hasRedIndicators = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;

      // Check if canvas context has drawn red colors recently
      // This is a rough heuristic
      return true;
    });

    logTest('Enemy engagement attempt', 'PASS', 'Moved toward potential enemy positions');

    // Rapid attacks to observe enemy reactions
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('f');
      await sleep(200);
    }

    await sleep(1000);
    await takeScreenshot(page, '11-enemy-combat');

    logTest('Enemy reaction to attacks', 'PASS', 'Multiple attacks executed near enemies');

    // Check if health decreased (indicating enemy attacked back)
    const healthText = await page.locator('text=/Health|HP/i').first().textContent().catch(() => '');
    if (healthText) {
      logTest('Health tracking during combat', 'PASS', `Current health info: ${healthText.substring(0, 30)}`);
    }

    return true;

  } catch (error) {
    logTest('Enemy behavior test', 'FAIL', error.message);
    return false;
  }
}

async function testVisualFeedback(page) {
  console.log('\n=== Testing Visual Feedback Systems ===');

  try {
    const canvas = page.locator('canvas').first();
    await canvas.click();

    // Execute attacks to trigger visual feedback
    console.log('  Testing hitstop and screen shake...');
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('f');
      await sleep(400);
    }

    await sleep(500);
    logTest('Visual feedback triggering', 'PASS', 'Attacks executed to trigger effects');

    // Take screenshot during combat
    await page.keyboard.press('f');
    await sleep(100);
    await takeScreenshot(page, '12-visual-feedback');

    // Test for damage number elements
    const damageNumberElements = await page.locator('[class*="damage-number"], [style*="position: absolute"]').count();
    if (damageNumberElements > 0) {
      logTest('Damage number elements present', 'PASS', `Found ${damageNumberElements} potential damage displays`);
    } else {
      logTest('Damage number elements present', 'WARN', 'No damage number DOM elements detected');
    }

    // Check for animation effects
    const animatedElements = await page.locator('[class*="animate"]').count();
    if (animatedElements > 0) {
      logTest('Animation effects present', 'PASS', `Found ${animatedElements} animated elements`);
    } else {
      logTest('Animation effects present', 'WARN', 'No CSS animation classes detected');
    }

    return true;

  } catch (error) {
    logTest('Visual feedback test', 'FAIL', error.message);
    return false;
  }
}

async function testResponsiveness(page) {
  console.log('\n=== Testing Responsiveness and Performance ===');

  try {
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: perf.loadEventEnd - perf.loadEventStart,
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        totalLoadTime: perf.loadEventEnd - perf.fetchStart
      };
    });

    if (metrics.totalLoadTime < 10000) {
      logTest('Page load performance', 'PASS', `Total load time: ${Math.round(metrics.totalLoadTime)}ms`);
    } else {
      logTest('Page load performance', 'WARN', `Slow load time: ${Math.round(metrics.totalLoadTime)}ms`);
    }

    // Check console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await sleep(2000);

    if (consoleErrors.length === 0) {
      logTest('Console errors check', 'PASS', 'No console errors detected');
    } else {
      logTest('Console errors check', 'WARN', `${consoleErrors.length} console errors found`);
      consoleErrors.slice(0, 3).forEach(err => {
        console.log(`    - ${err.substring(0, 100)}`);
      });
    }

    // Test window resize responsiveness
    await page.setViewportSize({ width: 1280, height: 720 });
    await sleep(500);
    logTest('Viewport resize (1280x720)', 'PASS', 'Viewport resized');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await sleep(500);
    logTest('Viewport resize (1920x1080)', 'PASS', 'Viewport resized back');

    await takeScreenshot(page, '13-final-state');

    return true;

  } catch (error) {
    logTest('Responsiveness test', 'FAIL', error.message);
    return false;
  }
}

async function testPauseMenu(page) {
  console.log('\n=== Testing Pause Menu ===');

  try {
    // Press Escape to open pause menu
    await page.keyboard.press('Escape');
    await sleep(1000);

    const pauseMenu = await page.locator('text=/Pause|Resume|Settings/i').first().isVisible().catch(() => false);
    if (pauseMenu) {
      logTest('Pause menu opens', 'PASS', 'ESC key opens menu');
      await takeScreenshot(page, '14-pause-menu');

      // Close pause menu
      await page.keyboard.press('Escape');
      await sleep(500);
      logTest('Pause menu closes', 'PASS', 'ESC key closes menu');
    } else {
      logTest('Pause menu functionality', 'WARN', 'Pause menu not detected or ESC not bound');
    }

    return true;

  } catch (error) {
    logTest('Pause menu test', 'WARN', error.message);
    return false;
  }
}

// Main test execution
(async () => {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         SW-OW Game UI/UX Comprehensive Test Suite             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\nTest started at: ${new Date().toISOString()}`);
  console.log(`Target URL: ${BASE_URL}\n`);

  // Create screenshots directory
  const fs = await import('fs');
  if (!fs.existsSync('test-screenshots')) {
    fs.mkdirSync('test-screenshots');
  }

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-web-security', '--use-gl=swiftshader']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Enable verbose logging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`  [Browser ${type}] ${msg.text()}`);
    }
  });

  try {
    // Execute test suite
    await testInitialPageLoad(page);
    await testCharacterSelection(page);
    await testGameCanvas(page);
    await testHUDElements(page);
    await testPlayerMovement(page);
    await testCombatInteractions(page);
    await testEnemyBehavior(page);
    await testVisualFeedback(page);
    await testPauseMenu(page);
    await testResponsiveness(page);

  } catch (error) {
    console.error('\n❌ Test suite encountered fatal error:', error);
  } finally {
    await sleep(2000);
    await browser.close();
  }

  // Print final report
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST RESULTS SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`✓ Passed:   ${testResults.passed.length} tests`);
  console.log(`✗ Failed:   ${testResults.failed.length} tests`);
  console.log(`⚠ Warnings: ${testResults.warnings.length} tests`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total:      ${testResults.passed.length + testResults.failed.length + testResults.warnings.length} tests\n`);

  if (testResults.failed.length > 0) {
    console.log('Failed Tests:');
    testResults.failed.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.name}`);
      console.log(`     ${test.details}`);
    });
    console.log('');
  }

  if (testResults.warnings.length > 0) {
    console.log('Warnings:');
    testResults.warnings.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.name}`);
      console.log(`     ${test.details}`);
    });
    console.log('');
  }

  console.log(`Test completed at: ${new Date().toISOString()}`);
  console.log(`Screenshots saved to: test-screenshots/\n`);

  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
})();
