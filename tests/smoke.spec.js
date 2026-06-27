import { test, expect } from '@playwright/test';
import { createProjectEnvelope, normalizeImportedProject } from '../src/core/project-versioning.js';
import { normalizeEquipmentLabels } from '../src/data/equipment.js';

test('project versioning restores current v3.10.20 envelopes', () => {
  const envelope = createProjectEnvelope({
    attrs: [{ id: 'a1', name: 'attack', weight: 1 }],
    resources: [{ id: 'gold', name: 'gold', price: 1 }],
    curves: [{ id: 'c1', name: 'linear', type: 'linear', params: { a: 10 } }],
    cultivations: [],
  });

  const restored = normalizeImportedProject(envelope);
  expect(restored.to).toBe('3.10.20');
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
  await expect(page.locator('#app-version-label')).toHaveText('v3.10.20');
  await expect(page.locator('#app-release-name')).toHaveText('经济配置行编辑修订版');
  await expect(page.locator('.tab[data-p="panel-curve"]')).toBeVisible();
  await expect(page.locator('.tab[data-p="panel-map"]')).toHaveText('地图');
  await expect(page.locator('.tab[data-p="panel-monster"]')).toHaveText('怪物相关');

  await page.locator('.tab[data-p="panel-curve"]').click();
  await expect(page.locator('#t-curve tbody tr').first()).toBeVisible();
  await expect(page.locator('#t-curve tbody tr').first()).not.toBeEmpty();
  const curveLayout = await page.locator('#panel-curve .curve-library-stack').evaluate(stack => {
    const tableWrap = stack.children[0].getBoundingClientRect();
    const preview = stack.querySelector('.curve-preview-panel').getBoundingClientRect();
    const stackBox = stack.getBoundingClientRect();
    return {
      stackWidth: stackBox.width,
      tableWidth: tableWrap.width,
      previewWidth: preview.width,
      previewTop: preview.top,
      tableBottom: tableWrap.bottom,
      columns: getComputedStyle(stack).gridTemplateColumns,
    };
  });
  expect(curveLayout.columns.split(' ').length).toBe(1);
  expect(curveLayout.tableWidth).toBeGreaterThan(curveLayout.stackWidth * 0.95);
  expect(curveLayout.previewWidth).toBeGreaterThan(curveLayout.stackWidth * 0.95);
  expect(curveLayout.previewTop).toBeGreaterThan(curveLayout.tableBottom);
  const curveInlineLayout = await page.locator('#t-curve tbody tr').first().evaluate(row => {
    const nameWrap = row.children[1].querySelector('.curve-cell-inline');
    const typeWrap = row.children[2].querySelector('.curve-cell-inline');
    const nameMain = nameWrap.children[0].getBoundingClientRect();
    const nameSub = nameWrap.children[1].getBoundingClientRect();
    const typeMain = typeWrap.children[0].getBoundingClientRect();
    const typeSub = typeWrap.children[1].getBoundingClientRect();
    return {
      nameInline: Math.abs((nameMain.top + nameMain.height / 2) - (nameSub.top + nameSub.height / 2)) < 3 && nameSub.left > nameMain.right,
      typeInline: Math.abs((typeMain.top + typeMain.height / 2) - (typeSub.top + typeSub.height / 2)) < 3 && typeSub.left > typeMain.right,
    };
  });
  expect(curveInlineLayout.nameInline).toBe(true);
  expect(curveInlineLayout.typeInline).toBe(true);
  const curveSvgTextStyle = await page.locator('#cv-svg').evaluate(svg => {
    const texts = Array.from(svg.querySelectorAll('text'));
    return {
      count: texts.length,
      fills: [...new Set(texts.map(t => t.getAttribute('fill')))],
      fontSizes: [...new Set(texts.map(t => t.getAttribute('font-size')))],
      weights: [...new Set(texts.map(t => t.getAttribute('font-weight')))],
    };
  });
  expect(curveSvgTextStyle.count).toBeGreaterThan(0);
  expect(curveSvgTextStyle.fills).toEqual(['#f3f6ff']);
  expect(curveSvgTextStyle.fontSizes).toEqual(['12']);
  expect(curveSvgTextStyle.weights).toEqual(['700']);
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#cv-compare');
    return canvas && canvas._chart && canvas.width > 300;
  });
  const curveCanvasSharpness = await page.locator('#cv-compare').evaluate(canvas => {
    const box = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const chart = canvas._chart;
    const options = chart?.options || chart?.config?.options || {};
    return {
      cssWidth: Math.round(box.width),
      cssHeight: Math.round(box.height),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      dpr,
      tickSize: options?.scales?.x?.ticks?.font?.size,
      maintainAspectRatio: options?.maintainAspectRatio,
    };
  });
  expect(curveCanvasSharpness.backingWidth).toBeGreaterThanOrEqual(Math.floor(curveCanvasSharpness.cssWidth * curveCanvasSharpness.dpr * 0.95));
  expect(curveCanvasSharpness.backingHeight).toBeGreaterThanOrEqual(Math.floor(curveCanvasSharpness.cssHeight * curveCanvasSharpness.dpr * 0.95));
  expect(curveCanvasSharpness.tickSize).toBe(13);
  expect(curveCanvasSharpness.maintainAspectRatio).toBe(false);

  await page.locator('.tab[data-p="panel-cult"]').click();
  await expect(page.locator('#realm-grid .realm-card').first()).toBeVisible();
  await expect(page.locator('#cr-level-count')).toHaveCount(0);
  await expect(page.locator('#realm-metrics')).not.toBeEmpty();
  const realmMetricLayout = await page.locator('#realm-metrics').evaluate(metrics => {
    const cards = Array.from(metrics.querySelectorAll('.metric-c')).map(card => {
      const box = card.getBoundingClientRect();
      const label = card.querySelector('.ml').getBoundingClientRect();
      const value = card.querySelector('.mv').getBoundingClientRect();
      return {
        text: card.textContent.trim(),
        top: Math.round(box.top),
        labelTop: Math.round(label.top),
        valueTop: Math.round(value.top),
        labelRight: Math.round(label.right),
        valueLeft: Math.round(value.left),
        height: Math.round(box.height),
      };
    });
    return {
      count: cards.length,
      sameRow: cards.every(card => card.top === cards[0].top),
      inlineContent: cards.every(card => Math.abs(card.labelTop - card.valueTop) < 8 && card.labelRight <= card.valueLeft),
      cards,
    };
  });
  expect(realmMetricLayout.count).toBe(4);
  expect(realmMetricLayout.sameRow).toBe(true);
  expect(realmMetricLayout.inlineContent).toBe(true);
  expect(realmMetricLayout.cards[0].text).toMatch(/基础战力：\d/);
  await expect(page.locator('#cult-tree')).not.toBeEmpty();
  await expect(page.locator('#panel-cult')).not.toContainText('精炼增幅计算器');
  await expect(page.locator('#refine-panel')).toHaveCount(0);
  await expect(page.locator('#cult-tree')).toContainText('精炼系统');
  await expect(page.locator('#cult-tree')).toContainText('三层养成线');
  await expect(page.locator('#cult-tree')).toContainText('每级收益');
  const cultSectionState = await page.locator('#panel-cult').evaluate(panel => {
    const sections = Array.from(panel.querySelectorAll('.section'));
    return {
      count: sections.length,
      firstThreeOpen: sections.slice(0, 3).every(section => !section.classList.contains('is-collapsed')),
      fourthCollapsed: sections[3]?.classList.contains('is-collapsed') || false,
      toggleCount: sections.filter(section => section.querySelector(':scope > .section-header > .section-collapse-toggle')).length,
    };
  });
  expect(cultSectionState.count).toBeGreaterThanOrEqual(3);
  expect(cultSectionState.firstThreeOpen).toBe(true);
  if (cultSectionState.count > 3) expect(cultSectionState.fourthCollapsed).toBe(true);
  expect(cultSectionState.toggleCount).toBe(cultSectionState.count);

  await page.locator('.tab[data-p="panel-eco"]').click();
  const ecoSectionState = await page.locator('#panel-eco').evaluate(panel => {
    const sections = Array.from(panel.querySelectorAll('.section'));
    return {
      count: sections.length,
      firstThreeOpen: sections.slice(0, 3).every(section => !section.classList.contains('is-collapsed')),
      fourthCollapsed: sections[3]?.classList.contains('is-collapsed') || false,
      toggleCount: sections.filter(section => section.querySelector(':scope > .section-header > .section-collapse-toggle')).length,
    };
  });
  expect(ecoSectionState.count).toBe(4);
  expect(ecoSectionState.firstThreeOpen).toBe(true);
  expect(ecoSectionState.fourthCollapsed).toBe(true);
  expect(ecoSectionState.toggleCount).toBe(ecoSectionState.count);
  await expect(page.locator('#eco-currency-section .section-body')).toBeVisible();
  await page.locator('#eco-currency-section .section-collapse-toggle').click();
  await expect(page.locator('#eco-currency-section')).toHaveClass(/is-collapsed/);
  await page.locator('#eco-currency-section .section-collapse-toggle').click();
  await expect(page.locator('#eco-currency-section')).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('#currency-table')).toContainText('编辑');
  await expect(page.locator('#vip-table')).toContainText('编辑');
  await page.locator('#currency-table button[onclick="editCurrency(\\\'real_money\\\')"]').click();
  await page.locator('#eco-cur-name-real_money').fill('测试货币');
  await page.locator('#eco-cur-tier-real_money').fill('8');
  await page.locator('#eco-cur-purpose-real_money').fill('测试用途');
  await page.locator('#eco-cur-source-real_money').fill('测试来源');
  await page.locator('#eco-cur-rate-real_money').fill('测试兑换');
  await page.locator('#currency-table button[onclick="saveCurrency(\\\'real_money\\\')"]').click();
  await expect(page.locator('#currency-table')).toContainText('测试货币');
  await expect(page.locator('#currency-table')).toContainText('第8层');
  await expect(page.locator('#currency-table')).toContainText('测试兑换');
  await page.locator('#vip-table button[onclick="editVip(1)"]').click();
  await page.locator('#eco-vip-cumulative-1').fill('188');
  await page.locator('#eco-vip-perk-1').fill('测试特权');
  await page.locator('#vip-table button[onclick="saveVip(1)"]').click();
  await expect(page.locator('#vip-table')).toContainText('¥188');
  await expect(page.locator('#vip-table')).toContainText('测试特权');

  await page.locator('.tab[data-p="panel-combat2"]').click();
  const combatTierColors = await page.evaluate(() => (window.S.combatTiers || []).map(t => t.color));
  expect(combatTierColors.every(color => /^#[0-9a-fA-F]{6}$/.test(color))).toBe(true);

  const combatConfigLayout = await page.locator('.combat-config-grid').evaluate(grid => {
    const gridBox = grid.getBoundingClientRect();
    const panes = Array.from(grid.querySelectorAll('.combat-config-pane')).map(pane => pane.getBoundingClientRect());
    return {
      gridWidth: gridBox.width,
      firstWidth: panes[0]?.width || 0,
      secondWidth: panes[1]?.width || 0,
      firstBottom: panes[0]?.bottom || 0,
      secondTop: panes[1]?.top || 0,
    };
  });
  expect(combatConfigLayout.firstWidth / combatConfigLayout.gridWidth).toBeGreaterThan(0.95);
  expect(combatConfigLayout.secondWidth / combatConfigLayout.gridWidth).toBeGreaterThan(0.95);
  expect(combatConfigLayout.secondTop).toBeGreaterThan(combatConfigLayout.firstBottom);

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
  await expect(page.locator('#combat-target-parser')).not.toContainText('进攻方属性');
  await expect(page.locator('#combat-target-parser')).not.toContainText('守方目标属性');
  await expect(page.locator('#combat-target-parser')).toContainText('战力解析结果');
  await expect(page.locator('.combat-result-grid')).toBeVisible();
  await expect(page.locator('#combat-tier-section .section-collapse-toggle')).toHaveCount(1);
  await expect(page.locator('#combat-tier-section .section-body')).toBeVisible();
  const combatTierInputAlignments = await page.locator('#combat-tier-section').evaluate(section => {
    return Array.from(section.querySelectorAll('input')).map(input => getComputedStyle(input).textAlign);
  });
  expect(combatTierInputAlignments.length).toBeGreaterThan(0);
  expect(combatTierInputAlignments.every(align => align === 'center')).toBe(true);
  await page.locator('#combat-tier-section .section-collapse-toggle').click();
  await expect(page.locator('#combat-tier-section')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#combat-tier-section .section-body')).not.toBeVisible();
  await page.locator('#combat-tier-section .section-collapse-toggle').click();
  await expect(page.locator('#combat-tier-section')).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('#cb-battle-stage .fighter-header button', { hasText: '编辑' })).toHaveCount(2);

  const defaultMaxDamage = await page.locator('#cb-dmg-max').textContent();
  await page.locator('#cb-battle-stage .fighter-header button', { hasText: '编辑' }).nth(1).click();
  await expect(page.locator('#combat-role-title')).toBeVisible();
  await expect(page.locator('#combat-role-title')).toHaveText('守方目标属性编辑');
  await expect(page.locator('#combat-role-edit-a2')).toBeVisible();
  await page.locator('#combat-role-edit-a2').fill('9999');
  await page.locator('#m-combat-role .modal-footer .btn-primary').click();
  const reducedMaxDamage = await page.locator('#cb-dmg-max').textContent();
  expect(Number((reducedMaxDamage || '0').replace(/,/g, ''))).toBeLessThan(Number((defaultMaxDamage || '0').replace(/,/g, '')));
  await expect(page.locator('#cb-defender-stats')).toContainText('9,999');
  await page.locator('#cb-battle-stage .fighter-header button', { hasText: '编辑' }).nth(1).click();
  await page.locator('#combat-role-recommend').click();
  await page.locator('#m-combat-role .modal-footer .btn-primary').click();
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
  const combatLogShape = await page.locator('#tbl-cb-log').evaluate(table => {
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const lastCells = Array.from(rows[rows.length - 1].children).map(td => td.textContent.trim());
    return { headers, rowCount: rows.length, lastCells };
  });
  expect(combatLogShape.headers).toEqual(['当前轮次', '攻方伤害', '守方伤害', '攻方剩余生命', '守方剩余生命', '战场即时态势评估']);
  expect(combatLogShape.rowCount).toBeGreaterThan(0);
  expect(combatLogShape.lastCells).toHaveLength(6);
  expect(combatLogShape.lastCells[5]).toMatch(/攻方胜利|守方胜利/);
  expect(combatLogShape.lastCells[5]).not.toBe('战斗结束');

  await expect(page.locator('#cb-attacker-card .fighter-sprite')).toBeVisible();
  await expect(page.locator('#cb-defender-card .fighter-sprite')).toBeVisible();
  await expect(page.locator('#cb-attacker-card .fighter-weapon')).toBeVisible();
  await expect(page.locator('#cb-defender-card .fighter-weapon')).toBeVisible();
  await expect(page.locator('#cb-attacker-stats')).not.toContainText(/ATK|DEF|HP|SPD|CRIT|CDMG/);
  const combatStatLayout = await page.locator('#cb-attacker-stats').evaluate(container => {
    const stat = container.querySelector('.role-stat');
    const label = stat.querySelector('b').getBoundingClientRect();
    const value = stat.querySelector('span').getBoundingClientRect();
    const box = stat.getBoundingClientRect();
    return {
      labelLeftOfValue: label.right <= value.left,
      sameCenterLine: Math.abs((label.top + label.height / 2) - (value.top + value.height / 2)) < 3,
      boxHeight: Math.round(box.height),
    };
  });
  expect(combatStatLayout.labelLeftOfValue).toBeTruthy();
  expect(combatStatLayout.sameCenterLine).toBeTruthy();
  expect(combatStatLayout.boxHeight).toBeLessThanOrEqual(32);

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
  const classPanelLayout = await page.locator('#class-selector').evaluate(panel => {
    const levelRow = panel.querySelector('.class-level-row');
    const label = levelRow.querySelector('label').getBoundingClientRect();
    const input = levelRow.querySelector('input').getBoundingClientRect();
    const stats = panel.querySelector('.class-card .class-stats');
    const statItems = Array.from(stats.querySelectorAll('.class-stat-item')).map(item => item.getBoundingClientRect());
    const firstItem = stats.querySelector('.class-stat-item');
    const firstLabel = firstItem.querySelector('.label').getBoundingClientRect();
    const firstValue = firstItem.querySelector('.value').getBoundingClientRect();
    const firstRowTops = statItems.slice(0, 2).map(item => Math.round(item.top));
    const secondRowTop = Math.round(statItems[2]?.top || 0);
    return {
      sameCenterLine: Math.abs((label.top + label.height / 2) - (input.top + input.height / 2)) < 3,
      inputHeight: Math.round(input.height),
      gridColumns: getComputedStyle(stats).gridTemplateColumns.split(' ').length,
      firstTwoShareRow: firstRowTops.length === 2 && firstRowTops[0] === firstRowTops[1],
      thirdStartsNextRow: secondRowTop > firstRowTops[0],
      statPairGap: Math.round(firstValue.left - firstLabel.right),
      labelLeftOfValue: firstLabel.right <= firstValue.left,
    };
  });
  expect(classPanelLayout.sameCenterLine).toBe(true);
  expect(classPanelLayout.inputHeight).toBe(32);
  expect(classPanelLayout.gridColumns).toBe(2);
  expect(classPanelLayout.firstTwoShareRow).toBe(true);
  expect(classPanelLayout.thirdStartsNextRow).toBe(true);
  expect(classPanelLayout.labelLeftOfValue).toBe(true);
  expect(classPanelLayout.statPairGap).toBeLessThanOrEqual(6);
  await expect(page.locator('#kill-matrix')).toContainText('模拟场次');
  await expect(page.locator('#kill-matrix')).toContainText('重新模拟');
  await expect(page.locator('#kill-matrix')).toContainText('回合');
  const killMatrixToolbarLayout = await page.locator('#kill-matrix').evaluate(matrix => {
    const toolbar = matrix.querySelector('.kill-matrix-toolbar');
    const label = toolbar.querySelector('label').getBoundingClientRect();
    const input = toolbar.querySelector('input').getBoundingClientRect();
    const hint = toolbar.querySelector('.hint').getBoundingClientRect();
    const button = toolbar.querySelector('button').getBoundingClientRect();
    const toolbarBox = toolbar.getBoundingClientRect();
    return {
      leftPadding: Math.round(label.left - toolbarBox.left),
      topPadding: Math.round(label.top - toolbarBox.top),
      inputHeight: Math.round(input.height),
      sameCenterLine: [input, hint, button].every(rect => Math.abs((label.top + label.height / 2) - (rect.top + rect.height / 2)) < 3),
      toolbarHeight: Math.round(toolbarBox.height),
    };
  });
  expect(killMatrixToolbarLayout.leftPadding).toBeGreaterThanOrEqual(14);
  expect(killMatrixToolbarLayout.topPadding).toBeGreaterThanOrEqual(10);
  expect(killMatrixToolbarLayout.inputHeight).toBe(32);
  expect(killMatrixToolbarLayout.sameCenterLine).toBe(true);
  expect(killMatrixToolbarLayout.toolbarHeight).toBeGreaterThanOrEqual(54);
  await expect(page.locator('#kill-matrix')).not.toContainText(/妯℃嫙|鍦烘|鑼冨洿|閲嶆柊|鍥炲悎|缂栬緫|鍒犻櫎/);
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
  const roiSystemGridLayout = await page.locator('#roi-sys-grid').evaluate(grid => {
    const cards = Array.from(grid.querySelectorAll('.roi-sys-card')).map(card => card.getBoundingClientRect());
    const tops = cards.map(card => Math.round(card.top));
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      cardCount: cards.length,
      firstRowSameTop: tops.length >= 3 && tops[0] === tops[1] && tops[1] === tops[2],
      fourthStartsNextRow: tops.length >= 4 && tops[3] > tops[0],
    };
  });
  expect(roiSystemGridLayout.columns).toBe(3);
  expect(roiSystemGridLayout.cardCount).toBeGreaterThanOrEqual(4);
  expect(roiSystemGridLayout.firstRowSameTop).toBe(true);
  expect(roiSystemGridLayout.fourthStartsNextRow).toBe(true);
  const roiToolbarLayout = await page.locator('#panel-roi2 > .roi-bar').evaluate(toolbar => {
    const budget = toolbar.querySelector('#roi-budget');
    const day = toolbar.querySelector('#roi-day');
    const dayLimit = toolbar.querySelector('#roi-day-limit');
    const actions = toolbar.querySelector('.roi-actions');
    const actionButtons = Array.from(actions.querySelectorAll('.btn')).map(button => button.getBoundingClientRect());
    const budgetStyle = getComputedStyle(budget);
    const dayLimitStyle = getComputedStyle(dayLimit);
    const budgetBox = budget.getBoundingClientRect();
    const dayLimitBox = dayLimit.getBoundingClientRect();
    const dayGroup = day.closest('.roi-bar-item');
    return {
      budgetTextAlign: budgetStyle.textAlign,
      budgetWidth: Math.round(budgetBox.width),
      dayLimitTextAlign: dayLimitStyle.textAlign,
      dayLimitWidth: Math.round(dayLimitBox.width),
      dayText: day.textContent.trim(),
      dayLabelCount: dayGroup.querySelectorAll('label').length,
      actionGap1: Math.round(actionButtons[1].left - actionButtons[0].right),
      actionGap2: Math.round(actionButtons[2].left - actionButtons[1].right),
    };
  });
  expect(roiToolbarLayout.budgetTextAlign).toBe('center');
  expect(roiToolbarLayout.budgetWidth).toBeGreaterThanOrEqual(100);
  expect(roiToolbarLayout.dayText).toMatch(/^第\d+\/\d+天$/);
  expect(roiToolbarLayout.dayLabelCount).toBe(0);
  expect(roiToolbarLayout.dayLimitTextAlign).toBe('center');
  expect(roiToolbarLayout.dayLimitWidth).toBeGreaterThanOrEqual(55);
  expect(roiToolbarLayout.actionGap1).toBeLessThanOrEqual(10);
  expect(roiToolbarLayout.actionGap2).toBeLessThanOrEqual(10);
  const investButtonStyles = await page.locator('#roi-sys-grid').evaluate(grid => {
    return Array.from(grid.querySelectorAll('.roi-sys-btn')).map(button => {
      const style = getComputedStyle(button);
      return {
        background: style.backgroundColor,
        color: style.color,
        opacity: style.opacity,
        text: button.textContent.trim(),
      };
    });
  });
  expect(investButtonStyles.length).toBeGreaterThan(0);
  expect(investButtonStyles.every(style => style.text.includes('投资'))).toBe(true);
  expect(investButtonStyles.every(style => style.background === 'rgb(245, 247, 251)')).toBe(true);
  expect(investButtonStyles.every(style => style.color === 'rgb(17, 24, 39)')).toBe(true);
  expect(investButtonStyles.every(style => style.opacity === '1')).toBe(true);
  await expect(page.locator('#project-scenario-panel')).not.toBeEmpty();
  const roiSectionState = await page.locator('#panel-roi2').evaluate(panel => {
    const sections = Array.from(panel.querySelectorAll('.section'));
    const resultSections = Array.from(panel.querySelectorAll('.roi-result-stack > .section')).map(section => section.getBoundingClientRect());
    const stackBox = panel.querySelector('.roi-result-stack')?.getBoundingClientRect();
    return {
      count: sections.length,
      allOpen: sections.every(section => !section.classList.contains('is-collapsed')),
      toggleCount: sections.filter(section => section.querySelector(':scope > .section-header > .section-collapse-toggle')).length,
      stackWidth: stackBox?.width || 0,
      resultWidth: resultSections[0]?.width || 0,
      strategyWidth: resultSections[1]?.width || 0,
      strategyTop: resultSections[1]?.top || 0,
      resultBottom: resultSections[0]?.bottom || 0,
    };
  });
  expect(roiSectionState.count).toBe(3);
  expect(roiSectionState.allOpen).toBe(true);
  expect(roiSectionState.toggleCount).toBe(roiSectionState.count);
  expect(roiSectionState.resultWidth).toBeGreaterThan(roiSectionState.stackWidth * 0.95);
  expect(roiSectionState.strategyWidth).toBeGreaterThan(roiSectionState.stackWidth * 0.95);
  expect(roiSectionState.strategyTop).toBeGreaterThan(roiSectionState.resultBottom);
  await page.locator('#roi-results-section .section-collapse-toggle').click();
  await expect(page.locator('#roi-results-section')).toHaveClass(/is-collapsed/);
  await page.locator('#roi-results-section .section-collapse-toggle').click();
  await expect(page.locator('#roi-results-section')).not.toHaveClass(/is-collapsed/);

  await page.locator('.tab[data-p="panel-payment"]').click();
  const paymentSectionState = await page.locator('#panel-payment').evaluate(panel => {
    const sections = Array.from(panel.querySelectorAll('.section'));
    return {
      count: sections.length,
      firstThreeOpen: sections.slice(0, 3).every(section => !section.classList.contains('is-collapsed')),
      fourthCollapsed: sections[3]?.classList.contains('is-collapsed') || false,
      toggleCount: sections.filter(section => section.querySelector(':scope > .section-header > .section-collapse-toggle')).length,
    };
  });
  expect(paymentSectionState.count).toBe(4);
  expect(paymentSectionState.firstThreeOpen).toBe(true);
  expect(paymentSectionState.fourthCollapsed).toBe(true);
  expect(paymentSectionState.toggleCount).toBe(paymentSectionState.count);
  await expect(page.locator('#payment-tier-section .section-body')).toBeVisible();
  await page.locator('#payment-tier-section .section-collapse-toggle').click();
  await expect(page.locator('#payment-tier-section')).toHaveClass(/is-collapsed/);
  await page.locator('#payment-tier-section .section-collapse-toggle').click();
  await expect(page.locator('#payment-tier-section')).not.toHaveClass(/is-collapsed/);
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
  const paymentDetailLayout = await page.locator('.payment-detail-stack').evaluate(stack => {
    const cards = Array.from(stack.querySelectorAll(':scope > .section')).map(card => card.getBoundingClientRect());
    const stackBox = stack.getBoundingClientRect();
    return {
      stackWidth: stackBox.width,
      firstWidth: cards[0]?.width || 0,
      secondWidth: cards[1]?.width || 0,
      firstBottom: cards[0]?.bottom || 0,
      secondTop: cards[1]?.top || 0,
    };
  });
  expect(paymentDetailLayout.firstWidth).toBeGreaterThan(paymentDetailLayout.stackWidth * 0.95);
  expect(paymentDetailLayout.secondWidth).toBeGreaterThan(paymentDetailLayout.stackWidth * 0.95);
  expect(paymentDetailLayout.secondTop).toBeGreaterThan(paymentDetailLayout.firstBottom);

  await page.locator('.tab[data-p="panel-map"]').click();
  await expect(page.locator('#panel-map')).toContainText('地图模块占位');
  await expect(page.locator('#panel-map')).toContainText('地图结构');

  await page.locator('.tab[data-p="panel-monster"]').click();
  await expect(page.locator('#panel-monster')).toContainText('怪物模块占位');
  await expect(page.locator('#panel-monster')).toContainText('怪物模板');

  const forbiddenVisibleText = /ATK|DEF|HP|SPD|CRIT|CDMG|ROI|DPS|VIP|Project|Lv\./;
  for (const panel of ['panel-attr', 'panel-matrix', 'panel-class', 'panel-cult', 'panel-res', 'panel-eco', 'panel-pack', 'panel-combat2', 'panel-payment', 'panel-map', 'panel-monster', 'panel-roi2', 'panel-curve']) {
    await page.locator(`.tab[data-p="${panel}"]`).click();
    await expect(page.locator(`#${panel}`)).not.toContainText(forbiddenVisibleText);
  }

  const envelope = await page.evaluate(() => window.ProjectState.snapshot({ from: 'smoke-test' }));
  expect(envelope.schema).toBe('gbt-project');
  expect(envelope.data.project.scenarios.length).toBeGreaterThan(0);
  expect(pageErrors).toEqual([]);
});
