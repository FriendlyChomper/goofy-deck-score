const controlGroups = [
  ["Run investment", [
    ["cards_added", "Cards added"],
    ["enchanted_cards", "Enchanted cards"],
    ["upgrade_actions", "Upgrade actions"],
    ["removals", "Removal"],
    ["transforms", "Transform"]
  ]],
  ["Card value", [
    ["card:Basic", "Basic"],
    ["card:Common", "Common"],
    ["card:Uncommon", "Uncommon"],
    ["card:Rare", "Rare"],
    ["card:Ancient", "Ancient"],
    ["card:Event", "Event"],
    ["card:Curse", "Curse"],
    ["card:Quest", "Quest"]
  ]],
  ["Relic value", [
    ["relic:Common", "Common"],
    ["relic:Uncommon", "Uncommon"],
    ["relic:Shop", "Shop"],
    ["relic:Event", "Event"],
    ["relic:Rare", "Rare"],
    ["relic:Ancient", "Ancient"],
    ["relic:Starter", "Upgraded starter"]
  ]],
];
const characterOrder = ["CHARACTER.IRONCLAD", "CHARACTER.SILENT", "CHARACTER.REGENT", "CHARACTER.NECROBINDER", "CHARACTER.DEFECT"];
let data;
let values = {};
let goldPerPoint = 50;

const $ = selector => document.querySelector(selector);
const characterName = value => value.replace("CHARACTER.", "").replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
const characterIcon = value => value.replace("CHARACTER.", "").toLowerCase();
const characterPosition = value => {
  const position = characterOrder.indexOf(value);
  return position === -1 ? characterOrder.length : position;
};

function score(run) {
  let total = run.cards_added * values.cards_added + run.enchanted_cards * values.enchanted_cards + run.upgrade_actions * values.upgrade_actions + run.removals * values.removals + run.transforms * values.transforms + run.potions_used * values.potions_used;
  for (const [type, count] of Object.entries(run.cards)) total += count * (values[`card:${type}`] ?? 0);
  for (const [type, count] of Object.entries(run.relics)) total += count * (values[`relic:${type}`] ?? 0);
  return total + Math.floor(run.gold_spent / goldPerPoint);
}

function calculation(run, total) {
  const runInvestmentTerms = [
    ["Cards added", run.cards_added, values.cards_added],
    ["Enchanted cards", run.enchanted_cards, values.enchanted_cards],
    ["Upgrade actions", run.upgrade_actions, values.upgrade_actions],
    ["Removals", run.removals, values.removals],
    ["Transforms", run.transforms, values.transforms],
    ["Potions used", run.potions_used, values.potions_used],
    ["Gold", Math.floor(run.gold_spent / goldPerPoint), 1, `${run.gold_spent} / ${goldPerPoint}`],
  ];
  const cardTerms = Object.entries(run.cards).map(([type, count]) => [type, count, values[`card:${type}`] ?? 0]);
  const relicTerms = Object.entries(run.relics).map(([type, count]) => [type, count, values[`relic:${type}`] ?? 0]);
  const runInvestmentSubtotal = subtotal(runInvestmentTerms);
  const cardSubtotal = subtotal(cardTerms);
  const relicSubtotal = subtotal(relicTerms);
  return `<div class="calculation-heading"><strong>Example calculation</strong><span>${characterName(run.character)}</span></div><div class="calculation-grid">${calculationColumn("Run investment", runInvestmentTerms, runInvestmentSubtotal)}${calculationColumn("Cards", cardTerms, cardSubtotal)}${calculationColumn("Relics", relicTerms, relicSubtotal)}</div><div class="calculation-total"><span>Total score</span><code>${runInvestmentSubtotal} + ${cardSubtotal} + ${relicSubtotal} =</code><strong>${total}</strong></div>`;
}

function subtotal(terms) {
  return terms.reduce((sum, [, count, value]) => sum + count * value, 0);
}

function calculationColumn(title, terms, total) {
  const rows = terms.map(([label, count, value, detail]) => scoreRow(label, count, value, detail)).join("");
  return `<section><h3>${title}</h3>${rows}<div class="calculation-subtotal"><span>Subtotal</span><strong>${total}</strong></div></section>`;
}

function scoreRow(label, count, value, detail = "") {
  const quantity = detail || count;
  const contribution = count * value;
  const sign = contribution > 0 ? "+" : "";
  return `<div class="calculation-row"><span>${label} <small>(${quantity})</small></span><strong>${sign}${contribution}</strong></div>`;
}

function addScoreControl(group, key, label) {
  const node = $("#control-template").content.firstElementChild.cloneNode(true);
  node.querySelector("span").textContent = label;
  const input = node.querySelector("input");
  input.value = values[key] ?? 0;
  input.addEventListener("input", () => {
    values[key] = Number(input.value) || 0;
    renderRows();
  });
  group.append(node);
}

function addGoldControl(group) {
  const control = document.createElement("label");
  control.className = "control";
  control.innerHTML = '<span>Gold per point</span><input type="number" min="1" step="1">';
  const input = control.querySelector("input");
  input.value = goldPerPoint;
  input.addEventListener("input", () => {
    goldPerPoint = Math.max(1, Number(input.value) || 1);
    renderRows();
  });
  group.append(control);
}

function renderControls() {
  const target = $("#value-controls");
  target.replaceChildren();
  for (const [title, controls] of controlGroups) {
    const group = document.createElement("section");
    group.className = "group";
    group.innerHTML = `<h3>${title}</h3>`;
    for (const [key, label] of controls) addScoreControl(group, key, label);
    if (title === "Run investment") {
      addScoreControl(group, "potions_used", "Potion used");
      addGoldControl(group);
    }
    target.append(group);
  }
}

function renderRunList(items, options = {}) {
  const {className = "", contribution = null, displayValue = null} = options;
  return items.map(item => {
    const itemClass = className ? ` class="${className(item)}"` : "";
    const itemValue = contribution ? contribution(item) : displayValue ? displayValue(item) : null;
    const sign = contribution && itemValue > 0 ? "+" : contribution && itemValue < 0 ? "-" : "";
    const amount = itemValue === null ? "" : `<strong><span class="contribution-sign">${sign}</span>${Math.abs(itemValue)}</strong>`;
    return `<li${itemClass}><span>${item.label ?? item}</span>${amount}</li>`;
  }).join("");
}

function renderRunHistory(items) {
  return items.map(([label, count, value, detail = ""]) => {
    const contribution = count * value;
    const sign = contribution > 0 ? "+" : contribution < 0 ? "-" : "";
    const quantity = detail || count;
    return `<li><span>${label} <small>(${quantity})</small></span><strong><span class="contribution-sign">${sign}</span>${Math.abs(contribution)}</strong></li>`;
  }).join("");
}

function renderRunCard(run, total, rank) {
  const runHistory = [
    ["Cards added", run.cards_added, values.cards_added],
    ["Enchanted cards", run.enchanted_cards, values.enchanted_cards],
    ["Upgrade actions", run.upgrade_actions, values.upgrade_actions],
    ["Removals", run.removals, values.removals],
    ["Transforms", run.transforms, values.transforms],
    ["Potions used", run.potions_used, values.potions_used],
    ["Gold", Math.floor(run.gold_spent / goldPerPoint), 1, `${run.gold_spent} / ${goldPerPoint}`],
  ];
  const runSubtotal = subtotal(runHistory);
  const deckSubtotal = run.deck.reduce((sum, item) => sum + item.count * (values[`card:${item.rarity}`] ?? 0), 0);
  const relicSubtotal = run.relic_list.reduce((sum, item) => sum + item.count * (values[`relic:${item.rarity}`] ?? 0), 0);
  const deck = renderRunList(run.deck, {
    className: item => `${item.label.includes("+") ? " card-upgraded" : ""}${item.label.includes("[") ? " card-enchanted" : ""}`.trim(),
    contribution: item => item.count * (values[`card:${item.rarity}`] ?? 0),
  });
  const relics = renderRunList(run.relic_list, {
    contribution: item => item.count * (values[`relic:${item.rarity}`] ?? 0),
  });
  const bosses = renderRunList(run.bosses);
  const finalHp = run.final_max_hp === undefined ? `${run.final_hp}` : `${run.final_hp}/${run.final_max_hp}`;
  const bossStats = renderRunList([`Final HP: ${finalHp}`, `Final 2 boss damage: ${run.final_two_boss_damage}`]);
  const routeTotal = run.route.reduce((sum, item) => sum + item.count, 0);
  const route = renderRunList(run.route, {displayValue: item => item.count});
  return `<article class="run-card">
    <header>
      <span class="run-rank"><small>Rank</small>${rank}</span>
      <span class="score-separator">-</span>
      <strong class="run-score"><small>Score</small>${total}</strong>
      <div class="run-card-title">
        <span class="character-name"><img src="assets/characters/${characterIcon(run.character)}.png" alt="">${characterName(run.character)}</span>
        <small class="run-seed">Seed: ${run.seed}</small>
      </div>
    </header>
    <div class="run-details">
      <section><h3>Deck - ${deckSubtotal}</h3><ul>${deck}</ul></section>
      <section><h3>Relics - ${relicSubtotal}</h3><ul>${relics}</ul></section>
      <section><h3>Run investment - ${runSubtotal}</h3><ul>${renderRunHistory(runHistory)}</ul></section>
      <section><h3>Bosses</h3><ul>${bosses}${bossStats}</ul><h3 class="route-heading">Route - ${routeTotal}</h3><ul>${route}</ul></section>
    </div>
    <footer class="run-card-footer"><div><a href="${run.codex_url}" target="_blank" rel="noreferrer">Open in spire-codex</a></div></footer>
  </article>`;
}

function renderRows() {
  const character = $("#character").value,
    limit = Number($("#limit").value);
  const ranked = data.runs.filter(run => character === "all" || run.character === character).map(run => ({
    run,
    total: score(run)
  })).sort((a, b) => a.total - b.total || a.run.id.localeCompare(b.run.id)).slice(0, limit);
  $("#example").innerHTML = ranked.length ? calculation(ranked[0].run, ranked[0].total) : "No runs match this filter.";
  $("#rows").innerHTML = ranked.map(({run, total}, index) => renderRunCard(run, total, index + 1)).join("");
}

function applyDefaults() {
  const cards = data.defaults.cards.scores,
    relics = data.defaults.relics.scores;
  values = {
    cards_added: data.defaults.card_additions.points_per_card_added,
    enchanted_cards: data.defaults.enchantments?.points_per_enchanted_card ?? 0,
    upgrade_actions: data.defaults.upgrades.points_per_upgrade_action,
    removals: data.defaults.deck_changes.points_per_card_removal,
    transforms: data.defaults.deck_changes.points_per_card_transform,
    potions_used: data.defaults.potions.points_per_potion_used
  };
  for (const [type, value] of Object.entries(cards)) values[`card:${type}`] = value;
  for (const [type, value] of Object.entries(relics)) values[`relic:${type}`] = value;
  values["relic:Starter"] = data.defaults.relics.starter_relic_policy.upgraded_starting_relic_score;
  goldPerPoint = data.defaults.gold.gold_per_point;
  renderControls();
  renderRows();
}

function resetToZero() {
  values = Object.fromEntries(controlGroups.flatMap(([, controls]) => controls.map(([key]) => [key, 0])));
  values.potions_used = 0;
  goldPerPoint = 999999999;
  renderControls();
  renderRows();
}
function initialise(payload) {
  data = payload;
  $("#dataset-status").textContent = `${data.run_count.toLocaleString()} eligible wins - ${data.filters.build_id} - standard solo A10`;
  [...new Set(data.runs.map(run => run.character))]
    .sort((left, right) => characterPosition(left) - characterPosition(right) || left.localeCompare(right))
    .forEach(character => $("#character").insertAdjacentHTML("beforeend", `<option value="${character}">${characterName(character)}</option>`));
  $("#reset").addEventListener("click", applyDefaults);
  $("#reset-zero").addEventListener("click", resetToZero);
  $("#character").addEventListener("change", renderRows);
  $("#limit").addEventListener("change", renderRows);
  applyDefaults();
}

fetch("data/runs.json?v=45").then(response => response.json()).then(initialise).catch(error => {
  $("#dataset-status").textContent = `Could not load site data: ${error.message}`;
});
