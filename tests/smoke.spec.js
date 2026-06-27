import { test, expect } from '@playwright/test';
import { createProjectEnvelope, normalizeImportedProject } from '../src/core/project-versioning.js';
import { normalizeEquipmentLabels } from '../src/data/equipment.js';

test('project versioning restores current v3.7.1 envelopes', () => {
  const envelope = createProjectEnvelope({
    attrs: [{ id: 'a1', name: 'attack', weight: 1 }],
    resources: [{ id: 'gold', name: 'gold', price: 1 }],
    curves: [{ id: 'c1', name: 'linear', type: 'linear', params: { a: 10 } }],
    cultivations: [],
  });

  const restored = normalizeImportedProject(envelope);
  expect(restored.to).toBe('3.7.1');
  expect(restored.data.project.schema).toBe('gbt-project');
  expect(restored.data.project.scenarios.length).toBeGreaterThan(0);
});

test('equipment labels recover from mojibake snapshots', () => {
  const equipment = {
    slots: [
      { id: 'slt_wep', name: '姝﹀櫒' },
      { id: 'slt_helm', name: '澶寸洈' }
    ],
    qualities: [
      { id: 'white', name: '鐧借壊' },
      { id: 'purple', name: '绱壊' }
    ]
  };
  normalizeEquipmentLabels(equipment);
  expect(equipment.slots.map(slot => slot.name)).toEqual(['武器', '头盔']);
  expect(equipment.qualities.map(quality => quality.name)).toEqual(['白色', '紫色']);
});

test('main UI boots and renders v3 modules', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#app-version-label')).toHaveText('v3.7.1');
  await expect(page.locator('#app-release-name')).toHaveText('界面维护版');
  await expect(page.locator('.tab[data-p="panel-curve"]')).toBeVisible();

  await page.locator('.tab[data-p="panel-curve"]').click();
  await expect(page.locator('#t-curve tbody tr').first()).toBeVisible();
  await expect(page.locator('#t-curve tbody tr').first()).not.toBeEmpty();

  await page.locator('.tab[data-p="panel-cult"]').click();
  await expect(page.locator('#realm-grid .realm-card').first()).toBeVisible();
  await expect(page.locator('#realm-metrics')).not.toBeEmpty();
  await expect(page.locator('#cult-tree')).not.toBeEmpty();
  const cultSectionState = await page.locator('#panel-cult').evaluate(panel => {
    const sections = Array.from(panel.querySelectorAll('.section'));
    return {
      count: sections.length,
      firstThreeOpen: sections.slice(0, 3).every(section => !section.classList.contains('is-collapsed')),
      fourthCollapsed: sections[3]?.classList.contains('is-collapsed') || false,
      toggleCount: sections.filter(section => section.querySelector(':scope > .section-header > .section-collapse-toggle')).length,
    };
  });
  expect(cultSectionState.count).toBeGreaterThan(3);
  expect(cultSectionState.firstThreeOpen).toBe(true);
  expect(cultSectionState.fourthCollapsed).toBe(true);
  expect(cultSectionState.toggleCount).toBe(cultSectionState.count);
  await page.locator('#panel-cult .section').nth(3).locator(':scope > .section-header').click();
  await expect(page.locator('#panel-cult .section').nth(3)).not.toHaveClass(/is-collapsed/);

  await page.locator('.tab[data-p="panel-combat2"]').click();
  const combatTierColors = await page.evaluate(() => (window.S.combatTiers || []).map(t => t.color));
  expect(combatTierColors.every(color => /^#[0-9a-fA-F]{6}$/.test(color))).toBe(true);

  const combatConfigLayout = await page.locator('.combat-config-grid').evaluate(grid => {
    const gridBox = grid.getBoundingClientRect();
    const panes = Array.from(grid.querySelectorAll('.combat-config-pane')).map(pane => pane.getBoundingClientRect());
    return {
      gridWidth: gridBox.width,
      leftWidth: panes[0]?.width || 0,
      rightWidth: panes[1]?.width || 0,
    };
  });
  expect(combatConfigLayout.leftWidth / combatConfigLayout.gridWidth).toBeGreaterThan(0.47);
  expect(combatConfigLayout.rightWidth / combatConfigLayout.gridWidth).toBeGreaterThan(0.47);

  const combatFormLayout = await page.locator('#cb-formula-type').evaluate(select => {
    const group = select.closest('.form-group');
    const label = group.querySelector('label').getBoundingClientRect();
    const control = select.getBoundingClientRect();
    return {
      labelText: group.querySelector('label').textContent.trim(),
      sameRow: Math.abs((label.top + label.height / 2) - (control.top + control.height / 2)) < 3,
      labelIsLeft: label.right <= control.left,
    };
  });
  expect(combatFormLayout.labelText).toBe('公式类型');
  expect(combatFormLayout.sameRow).toBe(true);
  expect(combatFormLayout.labelIsLeft).toBe(true);

  const combatParamLayout = await page.locator('#cb-pc').evaluate(input => {
    const group = input.closest('.field');
    const label = group.querySelector('label').getBoundingClientRect();
    const control = input.getBoundingClientRect();
    return {
      sameRow: Math.abs((label.top + label.height / 2) - (control.top + control.height / 2)) < 3,
      labelIsLeft: label.right <= control.left,
    };
  });
  expect(combatParamLayout.sameRow).toBe(true);
  expect(combatParamLayout.labelIsLeft).toBe(true);

  const combatAttrLabels = await page.locator('#combat-attr-inputs label').allTextContents();
  const defenderCombatAttrLabels = await page.locator('#combat-defender-attr-inputs label').allTextContents();
  expect(combatAttrLabels.length).toBeGreaterThanOrEqual(3);
  expect(defenderCombatAttrLabels).toEqual(combatAttrLabels);

  const defaultMaxDamage = await page.locator('#cb-dmg-max').textContent();
  await page.locator('#cb-def-attr-a2').fill('9999');
  const reducedMaxDamage = await page.locator('#cb-dmg-max').textContent();
  expect(Number((reducedMaxDamage || '0').replace(/,/g, ''))).toBeLessThan(Number((defaultMaxDamage || '0').replace(/,/g, '')));
  await expect(page.locator('#cb-defender-stats')).toContainText('9,999');
  await page.locator('button', { hasText: '按推荐生成' }).click();
  await expect(page.locator('#cb-defender-stats')).not.toContainText('9,999');

  await expect(page.locator('#cb-battle-stage')).toBeVisible();
  const combatSandboxLayout = await page.locator('.combat-sandbox-card').evaluate(el => {
    const parent = el.getBoundingClientRect();
    const sections = Array.from(el.querySelectorAll('.combat-sandbox-section')).map(section => section.getBoundingClientRect());
    return {
      parentWidth: parent.width,
      firstWidth: sections[0]?.width || 0,
      secondWidth: sections[1]?.width || 0,
      firstBottom: sections[0]?.bottom || 0,
      secondTop: sections[1]?.top || 0,
    };
  });
  expect(combatSandboxLayout.firstWidth).toBeGreaterThan(combatSandboxLayout.parentWidth * 0.95);
  expect(combatSandboxLayout.secondWidth).toBeGreaterThan(combatSandboxLayout.parentWidth * 0.95);
  expect(combatSandboxLayout.secondTop).toBeGreaterThan(combatSandboxLayout.firstBottom);

  const combatStageLayout = await page.locator('#cb-battle-stage').evaluate(stage => {
    const stageBox = stage.getBoundingClientRect();
    const rowBox = stage.querySelector('.battle-row').getBoundingClientRect();
    const attacker = stage.querySelector('#cb-attacker-card').getBoundingClientRect();
    const defender = stage.querySelector('#cb-defender-card').getBoundingClientRect();
    const chart = document.querySelector('#cbChart').getBoundingClientRect();
    const logSection = document.querySelectorAll('.combat-sandbox-section')[1].getBoundingClientRect();
    const logTable = document.querySelector('#tbl-cb-log').getBoundingClientRect();
    const chartCanvas = document.querySelector('#cbChart');
    const pixelRatio = window.devicePixelRatio || 1;
    return {
      stageWidth: stageBox.width,
      rowWidth: rowBox.width,
      attackerCenter: attacker.left + attacker.width / 2 - stageBox.left,
      defenderCenter: defender.left + defender.width / 2 - stageBox.left,
      chartWidth: chart.width,
      chartHeight: chart.height,
      chartBackingWidth: chartCanvas.width,
      chartBackingHeight: chartCanvas.height,
      pixelRatio,
      chartBottom: chart.bottom,
      logTop: logSection.top,
      logTableTop: logTable.top,
    };
  });
  expect(combatStageLayout.rowWidth).toBeGreaterThan(combatStageLayout.stageWidth * 0.95);
  expect(combatStageLayout.attackerCenter).toBeLessThan(combatStageLayout.stageWidth * 0.35);
  expect(combatStageLayout.defenderCenter).toBeGreaterThan(combatStageLayout.stageWidth * 0.65);
  expect(combatStageLayout.chartWidth).toBeGreaterThan(combatStageLayout.stageWidth * 0.9);
  expect(combatStageLayout.chartBackingWidth).toBeGreaterThanOrEqual(Math.floor(combatStageLayout.chartWidth * combatStageLayout.pixelRatio * 0.95));
  expect(combatStageLayout.chartBackingHeight).toBeGreaterThanOrEqual(Math.floor(combatStageLayout.chartHeight * combatStageLayout.pixelRatio * 0.95));
  expect(combatStageLayout.chartBottom).toBeLessThan(combatStageLayout.logTop);
  expect(combatStageLayout.chartBottom).toBeLessThan(combatStageLayout.logTableTop);

  const combatChartPixels = await page.locator('#cbChart').evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let redPixels = 0;
    let greenPixels = 0;
    let visiblePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 0 && r + g + b > 60) visiblePixels += 1;
      if (a > 0 && r > 140 && g < 120 && b < 140) redPixels += 1;
      if (a > 0 && g > 120 && r < 120) greenPixels += 1;
    }
    return { redPixels, greenPixels, visiblePixels };
  });
  expect(combatChartPixels.visiblePixels).toBeGreaterThan(1000);
  expect(combatChartPixels.redPixels).toBeGreaterThan(50);
  expect(combatChartPixels.greenPixels).toBeGreaterThan(50);

  await expect(page.locator('#cb-attacker-card .fighter-sprite')).toBeVisible();
  await expect(page.locator('#cb-defender-card .fighter-sprite')).toBeVisible();
  await expect(page.locator('#cb-attacker-card .fighter-weapon')).toBeVisible();
  await expect(page.locator('#cb-defender-card .fighter-weapon')).toBeVisible();
  await expect(page.locator('#cb-attacker-stats')).not.toContainText(/ATK|DEF|HP|SPD|CRIT|CDMG/);

  await page.evaluate(() => {
    window.S.attrs.push({ id: 'a_speed_test', name: '速度', base: 77, weight: 0.3 });
    window.EQUIPMENT_DATA.slots[0].baseAttrs.a_speed_test = 12;
    window.rAttrs();
  });
  await expect(page.locator('#combat-attr-inputs')).toContainText('速度');
  await expect(page.locator('#combat-defender-attr-inputs')).toContainText('速度');
  await expect(page.locator('#cb-attacker-stats')).toContainText('速度');
  await page.locator('.tab[data-p="panel-class"]').click();
  await expect(page.locator('#class-selector')).toContainText('速度');
  await page.locator('.tab[data-p="panel-cult"]').click();
  await expect(page.locator('#slot-editor')).toContainText('速度');
  await expect(page.locator('#slot-editor')).toContainText('武器');
  await expect(page.locator('#slot-editor')).toContainText('头盔');
  await expect(page.locator('#slot-editor')).toContainText('编辑');
  await expect(page.locator('#slot-editor')).toContainText('删除');
  await expect(page.locator('#quality-editor')).toContainText('倍率');
  await expect(page.locator('#quality-editor')).toContainText('槽位');
  const equipmentText = await page.locator('#slot-editor, #quality-editor').evaluateAll(nodes => nodes.map(node => node.textContent).join(' '));
  expect(equipmentText).not.toMatch(/姝﹀櫒|澶寸洈|琛ｆ湇|鎶よ厱|鑵板甫|闉嬪瓙|鎴掓寚|椤归摼|鐧借壊|缁胯壊|钃濊壊|绱壊|姗欒壊|绾㈣壊|缂栬緫|鍒犻櫎|鍊嶇巼|妲戒綅/);
  await page.evaluate(() => {
    window.S.attrs = window.S.attrs.filter(attr => attr.id !== 'a_speed_test');
    window.rAttrs();
  });
  await page.locator('.tab[data-p="panel-combat2"]').click();
  await expect(page.locator('#combat-attr-inputs')).not.toContainText('速度');
  await expect(page.locator('#combat-defender-attr-inputs')).not.toContainText('速度');

  const idleAnimation = await page.locator('#cb-attacker-card .fighter-sprite').evaluate(el => getComputedStyle(el).animationName);
  expect(idleAnimation).toContain('fighterIdle');
  await page.locator('#cb-play-battle').click();
  await expect(page.locator('#cb-battle-stage[data-state="playing"]')).toBeVisible();
  await expect(page.locator('#cb-float-damage')).not.toBeEmpty();
  const combatFrameSides = await page.evaluate(() => (window.cbBattleFrames || []).map(f => f.side));
  expect(combatFrameSides).toContain('attacker');
  expect(combatFrameSides).toContain('defender');

  await page.locator('.tab[data-p="panel-roi2"]').click();
  await expect(page.locator('#roi-sys-grid .roi-sys-card').first()).toBeVisible();
  await expect(page.locator('#project-scenario-panel')).not.toBeEmpty();

  await page.locator('.tab[data-p="panel-payment"]').click();
  const paymentToolbarLayout = await page.locator('#payment-tier').evaluate(select => {
    const group = select.closest('.roi-bar-item');
    const label = group.querySelector('label').getBoundingClientRect();
    const control = select.getBoundingClientRect();
    return {
      sameRow: Math.abs((label.top + label.height / 2) - (control.top + control.height / 2)) < 4,
      labelIsLeft: label.right <= control.left,
    };
  });
  expect(paymentToolbarLayout.sameRow).toBe(true);
  expect(paymentToolbarLayout.labelIsLeft).toBe(true);
  await expect(page.locator('#payment-tier-table tbody tr').first()).toBeVisible();
  await expect(page.locator('#payment-risk-list')).not.toBeEmpty();

  const forbiddenVisibleText = /ATK|DEF|HP|SPD|CRIT|CDMG|ROI|DPS|VIP|Project|Lv\./;
  for (const panel of ['panel-attr', 'panel-matrix', 'panel-class', 'panel-cult', 'panel-res', 'panel-eco', 'panel-pack', 'panel-combat2', 'panel-payment', 'panel-roi2', 'panel-curve']) {
    await page.locator(`.tab[data-p="${panel}"]`).click();
    await expect(page.locator(`#${panel}`)).not.toContainText(forbiddenVisibleText);
  }

  const envelope = await page.evaluate(() => window.ProjectState.snapshot({ from: 'smoke-test' }));
  expect(envelope.schema).toBe('gbt-project');
  expect(envelope.data.project.scenarios.length).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
