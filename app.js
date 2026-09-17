const ROLE_MAP = { "추격자": "돌격자", "치유자": "보호자" };
const ROLE_EFFECTS = {
  "암살자": { name: "후열 사냥", description: "기본 공격과 단일 공격 스킬은 가장 뒤 슬롯의 생존 적을 우선합니다." },
  "보호자": { name: "초기 보호막", description: "전투 시작 시 자신에게 최대 HP의 10%만큼 보호막을 얻습니다." },
  "돌격자": { name: "처치 회복", description: "적을 처치하면 자신의 최대 HP의 5%만큼 회복합니다." },
  "결전자": { name: "후반 강화", description: "8턴 시작 시 공격력·방어력·속도가 각각 1 증가합니다. 전투당 1회입니다." },
  "교란자": { name: "교란 회피", description: "기본 공격과 스킬을 피격 행동당 15% 확률로 회피합니다." }
};

const FALLBACK_PASSIVE = {
  id: "document_pending",
  name: "개별 패시브 미정",
  description: "리메이크 문서에 개별 패시브가 아직 기재되지 않아 역할군 효과만 적용됩니다.",
  implemented: false
};
const fallbackSkill = () => ({
  id: "prototype_damage",
  name: "실험용 공통 스킬",
  cost: settings.skillCost,
  description: `단일 대상에게 방어력을 무시하는 고정 피해 ${settings.skillDamage}를 줍니다. 문서 미정 캐릭터에게만 적용됩니다.`,
  implemented: true,
  provisional: true
});

const catalog = window.ROCKETMONSTERS.map(character => ({
  ...character,
  mechanicRole: ROLE_MAP[character.sourceRole] || character.sourceRole
}));
const catalogById = Object.fromEntries(catalog.map(character => [character.id, character]));
const settings = {
  hpMultiplier: 10,
  attackFactor: 2,
  minDamage: 1,
  skillDamage: 2,
  skillCost: 3,
  gritGain: 1,
  dodgeRate: 15,
  maxTurns: 100,
  seed: 240914,
  enforceStatCap: false
};

let uid = 0;
const makeMember = id => {
  const base = catalogById[id];
  return { instanceId: `build-${++uid}`, catalogId: id, hp: base.hp, atk: base.atk, def: base.def, spd: base.spd, priority: 0 };
};
const teams = {
  A: ["CHR_018", "CHR_003", "CHR_029", "CHR_042", "CHR_006"].map(makeMember),
  B: ["CHR_015", "CHR_024", "CHR_025", "CHR_034", "CHR_035"].map(makeMember)
};

let editingTeam = "A";
let battle = null;
let playTimer = null;
let currentEditor = null;
let activeAnalysisTab = "log";
let resultHistory = [];
let toastTimer = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const teamName = side => `${side}팀`;
const enemySide = side => side === "A" ? "B" : "A";
const memberTotal = member => member.hp + member.atk + member.def + member.spd;
const roleEffect = character => ROLE_EFFECTS[character.mechanicRole];
const passiveEffect = character => character.passive || FALLBACK_PASSIVE;
const skillEffect = character => character.skill || fallbackSkill();
const skillCostFor = character => Number(skillEffect(character).cost ?? settings.skillCost);
const skillReady = unit => unit.grit >= skillCostFor(unit) && canUseSkill(unit);

function teamHasPassive(side, passiveId) {
  return Boolean(battle?.units.some(unit => unit.side === side && unit.alive && passiveEffect(unit).id === passiveId));
}

function shieldStatBonus(unit) {
  return unit.alive && unit.shield > 0 && teamHasPassive(unit.side, "calm_sea") ? 2 : 0;
}

function effectiveAttack(unit) {
  return unit.attack + Number(unit.howlBuff || 0) + shieldStatBonus(unit);
}

function effectiveSpeed(unit) {
  let speed = unit.speed + shieldStatBonus(unit);
  if (passiveEffect(unit).id === "web" && battle && aliveUnits(enemySide(unit.side)).some(enemy => enemy.statuses.paralysis)) speed *= 2;
  if (unit.statuses?.paralysis) speed = Math.floor(speed / 2);
  return speed;
}

function dodgeChance(unit) {
  let chance = unit.mechanicRole === "교란자" ? settings.dodgeRate : 0;
  chance += Math.max(0, Number(unit.swarm || 0)) * 10;
  chance += Math.min(50, Math.max(0, Number(unit.wild || 0)) * 5);
  chance += Math.max(0, Number(unit.memory || 0)) * 5;
  return clamp(chance, 0, 100);
}

function effectivePriority(unit) {
  const skillPriority = skillReady(unit) ? Number(skillEffect(unit).priority || 0) : 0;
  return unit.priority + skillPriority;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function stopPlayback() {
  if (playTimer) clearInterval(playTimer);
  playTimer = null;
}

function resetBattle({ notify = false, keepTab = false } = {}) {
  stopPlayback();
  battle = null;
  if (!keepTab) activeAnalysisTab = "log";
  if (notify) showToast("변경된 설정으로 전투를 초기화했습니다.");
  renderAll();
}

function previewUnit(member, side, slot) {
  const character = catalogById[member.catalogId];
  const maxHp = Math.max(1, Math.floor(member.hp * settings.hpMultiplier));
  return {
    uid: member.instanceId,
    side,
    slot,
    ...character,
    ...member,
    maxHp,
    currentHp: maxHp,
    shield: 0,
    grit: 0,
    statuses: {},
    charge: 0,
    fullness: 0,
    swarm: 0,
    selfHarm: 0,
    wild: 0,
    memory: 0,
    lunarPhase: null,
    alive: true,
    attack: member.atk,
    defense: member.def,
    speed: member.spd
  };
}

function teamSlot(member, side, index) {
  if (!member) {
    return `<button class="slot" data-open-slot="${side}:${index}" aria-label="${teamName(side)} ${index + 1}번 빈 슬롯"><span class="slot__num">${index + 1}</span>빈 슬롯</button>`;
  }
  const character = catalogById[member.catalogId];
  return `<button class="slot is-filled" data-edit-slot="${side}:${index}" aria-label="${character.name}, ${teamName(side)} ${index + 1}번, 능력치 편집"><span class="slot__num">${index + 1}</span><img src="${character.image}" alt=""><span class="slot__name">${escapeHtml(character.name)}</span></button>`;
}

function renderTeams() {
  for (const side of ["A", "B"]) {
    $(`#team-${side.toLowerCase()}`).innerHTML = Array.from({ length: 5 }, (_, index) => teamSlot(teams[side][index], side, index)).join("");
    $(`#team-${side.toLowerCase()}-count`).textContent = `${teams[side].length} / 5`;
  }
}

function rosterCard(character) {
  const selected = teams[editingTeam].some(member => member.catalogId === character.id);
  const disabled = selected || teams[editingTeam].length >= 5;
  const state = selected ? "이미 편성됨" : disabled ? "팀이 가득 참" : `${teamName(editingTeam)}에 추가`;
  return `<button class="roster-card" data-character="${character.id}" aria-label="${character.name}, ${character.species}, ${character.sourceRole}, ${state}" ${disabled ? "disabled" : ""}><span class="roster-card__type">${character.type}</span><img src="${character.image}" alt=""><span class="roster-card__text"><strong>${escapeHtml(character.name)}</strong><span>${escapeHtml(character.sourceRole)} · ${escapeHtml(character.species)}</span></span></button>`;
}

function renderRoster() {
  const query = $("#roster-search").value.trim().toLowerCase();
  const role = $("#role-filter").value;
  const visible = catalog.filter(character => {
    const matchesText = !query || `${character.name} ${character.species}`.toLowerCase().includes(query);
    const matchesRole = role === "all" || character.sourceRole === role;
    return matchesText && matchesRole;
  });
  $("#roster").innerHTML = visible.length ? visible.map(rosterCard).join("") : `<div class="empty-state"><strong>검색 결과 없음</strong>이름이나 역할군을 바꿔보세요.</div>`;
}

function currentUnits(side) {
  if (battle) return battle.units.filter(unit => unit.side === side).sort((a, b) => a.slot - b.slot);
  return teams[side].map((member, slot) => previewUnit(member, side, slot));
}

function statusLabels(unit) {
  const labels = [];
  if (unit.statuses?.poison) labels.push(`독 ${2 ** (unit.statuses.poison.stage + 1)}%`);
  if (unit.statuses?.bleed) labels.push("출혈 5%");
  if (unit.statuses?.mark) labels.push("표식");
  if (unit.statuses?.current) labels.push("물살");
  if (unit.statuses?.paralysis) labels.push("마비");
  if (unit.statuses?.binding) labels.push(`속박 ${unit.statuses.binding.count}`);
  if (unit.statuses?.bloodScent) labels.push("피냄새 5%");
  if (unit.statuses?.bullying) labels.push("괴롭힘·받는 피해 +30%");
  if (unit.statuses?.swallowed) labels.push(`삼킴 ${unit.statuses.swallowed.count}`);
  if (unit.statuses?.deadlyPoison) labels.push(`극독 ${unit.statuses.deadlyPoison.count}`);
  if (unit.statuses?.silenceActions > 0) labels.push("침묵");
  if (unit.statuses?.silk) labels.push("비단");
  if (unit.statuses?.stunActions > 0) labels.push("기절");
  if (unit.charge > 0) labels.push(`차지 ${unit.charge}`);
  if (unit.fullness > 0) labels.push(`배부름 ${unit.fullness}`);
  if (unit.swarm > 0) labels.push(`군체 ${unit.swarm}`);
  if (unit.selfHarm > 0) labels.push(`자해 ${unit.selfHarm}`);
  if (unit.wild > 0) labels.push(`야성 ${unit.wild}`);
  if (unit.memory > 0) labels.push(`암기 ${unit.memory}`);
  if (unit.fall > 0) labels.push(`낙하 ${unit.fall}`);
  if (unit.knowledge > 0) labels.push(`지식 ${unit.knowledge}`);
  if (unit.glutted) labels.push("배불러·받는 피해 +50%");
  if (unit.lunarPhase) labels.push({ crescent: "그믐", half: "반월", full: "만월" }[unit.lunarPhase]);
  if (unit.sureHit) labels.push("필중");
  if (unit.howlBuff > 0) labels.push("공격 +2");
  return labels;
}

function fighterCard(unit) {
  const hpPercent = clamp((unit.currentHp / unit.maxHp) * 100, 0, 100);
  const active = battle?.currentActorUid === unit.uid;
  const hit = battle?.lastTargetUid === unit.uid;
  const classes = ["fighter", active ? "is-active" : "", hit ? "is-hit" : "", unit.alive ? "" : "is-dead"].filter(Boolean).join(" ");
  const combatMeta = unit.shield > 0 ? `<span class="fighter__shield">투지 ${unit.grit} · 보호막 ${unit.shield}</span>` : `<span>투지 ${unit.grit}</span>`;
  const statuses = statusLabels(unit);
  const statusHtml = statuses.length ? `<div class="fighter__statuses">${statuses.map(label => `<span>${escapeHtml(label)}</span>`).join("")}</div>` : "";
  return `<article class="${classes}" data-unit="${unit.uid}" aria-label="${unit.name}, 체력 ${unit.currentHp}/${unit.maxHp}, 투지 ${unit.grit}${statuses.length ? `, 상태 ${statuses.join(", ")}` : ""}${unit.alive ? "" : ", 전투불능"}"><img src="${unit.image}" alt=""><strong class="fighter__name">${escapeHtml(unit.name)}</strong><div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${unit.maxHp}" aria-valuenow="${unit.currentHp}" aria-label="${unit.name} 체력"><i style="width:${hpPercent}%"></i></div><div class="fighter__meta"><span>HP ${unit.currentHp}/${unit.maxHp}</span>${combatMeta}</div>${statusHtml}</article>`;
}

function sortUnits(units) {
  return [...units].sort((left, right) =>
    effectivePriority(right) - effectivePriority(left) ||
    effectiveSpeed(right) - effectiveSpeed(left) ||
    left.slot - right.slot ||
    (left.side === "A" ? -1 : 1)
  );
}

function previewOrder() {
  return sortUnits(["A", "B"].flatMap(side => currentUnits(side)).filter(unit => unit.alive));
}

function renderArena() {
  for (const side of ["A", "B"]) {
    $(`#battle-team-${side.toLowerCase()}`).innerHTML = currentUnits(side).map(fighterCard).join("");
  }
  let order;
  if (battle && battle.queue.length) {
    order = battle.queue.map(uidValue => battle.units.find(unit => unit.uid === uidValue)).filter(unit => unit?.alive);
  } else {
    order = previewOrder();
  }
  $("#action-queue").innerHTML = order.length ? order.map(unit => `<span class="queue-chip ${battle?.currentActorUid === unit.uid ? "is-current" : ""}" data-team="${unit.side}"><img src="${unit.image}" alt=""><span>${escapeHtml(unit.name)}</span></span>`).join("") : `<span class="queue-chip">행동 대기</span>`;
  $("#turn-number").textContent = String(battle?.turn || 0).padStart(2, "0");
  const startButton = $("#start-button");
  const status = battle?.status || "ready";
  startButton.classList.toggle("is-running", status === "running");
  startButton.innerHTML = status === "running" ? `<span>Ⅱ</span> 일시정지` : status === "paused" ? `<span>▶</span> 계속 진행` : status === "ended" ? `<span>↺</span> 다시 실행` : `<span>▶</span> 전투 시작`;
  $("#step-button").disabled = status === "running" || status === "ended";
  $("#reset-button").disabled = status === "ready";
}

function logEntryHtml(entry) {
  const specialKinds = ["system", "ko", "status", "passive", "heal", "shield"];
  const className = specialKinds.includes(entry.kind) ? `log-entry--${entry.kind}` : entry.action === "skill" ? "log-entry--skill" : `log-entry--${entry.side?.toLowerCase() || "system"}`;
  return `<div class="log-entry ${className}"><span>${escapeHtml(entry.label)}</span><p>${escapeHtml(entry.message)}</p></div>`;
}

function renderLog() {
  if (!battle) {
    $("#battle-log").innerHTML = `<div class="log-entry log-entry--system"><span>준비</span><p>5대5 기본 편성이 준비되었습니다. 능력치나 계산식을 바꾼 뒤 전투를 시작하세요.</p></div>`;
    return;
  }
  $("#battle-log").innerHTML = battle.logs.slice(-220).map(logEntryHtml).join("");
  $("#battle-log").scrollTop = $("#battle-log").scrollHeight;
}

function renderResults() {
  if (!resultHistory.length) {
    $("#battle-log").innerHTML = `<div class="empty-state"><strong>아직 실행 결과가 없습니다.</strong>전투가 끝나면 승자, 턴 수, 잔여 HP와 설정을 비교할 수 있습니다.</div>`;
    return;
  }
  const latest = resultHistory[0];
  const previous = resultHistory[1];
  const comparison = previous ? `<p>직전 실행 대비 턴 ${latest.turns - previous.turns >= 0 ? "+" : ""}${latest.turns - previous.turns}, A팀 잔여 HP ${latest.remainingHp.A - previous.remainingHp.A >= 0 ? "+" : ""}${latest.remainingHp.A - previous.remainingHp.A}, B팀 잔여 HP ${latest.remainingHp.B - previous.remainingHp.B >= 0 ? "+" : ""}${latest.remainingHp.B - previous.remainingHp.B}</p>` : `<p>다음 실행부터 직전 결과와 변화량을 표시합니다.</p>`;
  $("#battle-log").innerHTML = `<div class="result-hero"><span>최근 실행 · SEED ${latest.seed}</span><strong>${escapeHtml(latest.title)}</strong><div class="result-stats"><div class="result-stat"><span>종료 턴</span><b>${latest.turns}</b></div><div class="result-stat"><span>A팀 잔여 HP</span><b>${latest.remainingHp.A}</b></div><div class="result-stat"><span>B팀 잔여 HP</span><b>${latest.remainingHp.B}</b></div></div>${comparison}</div>${resultHistory.map((result, index) => `<div class="history-card"><div class="history-card__top"><b>#${resultHistory.length - index} ${escapeHtml(result.title)}</b><span>${result.turns}턴</span></div><p>생존 A ${result.survivors.A} · B ${result.survivors.B} / 총 피해 A ${result.damage.A} · B ${result.damage.B}<br>상태 피해 A ${result.statusDamage.A} · B ${result.statusDamage.B} / 회복 A ${result.healing.A} · B ${result.healing.B}<br>스킬 사용 A ${result.skills.A} · B ${result.skills.B} · 회피 ${result.settings.dodgeRate}%</p></div>`).join("")}`;
}

function renderAnalysis() {
  $$('[data-analysis-tab]').forEach(button => {
    const active = button.dataset.analysisTab === activeAnalysisTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (activeAnalysisTab === "results") renderResults(); else renderLog();
}

function renderSettings() {
  $$('[data-setting]').forEach(input => {
    const key = input.dataset.setting;
    if (input.type === "checkbox") input.checked = Boolean(settings[key]);
    else if (document.activeElement !== input) input.value = settings[key];
  });
  $("#atk-factor-label").textContent = settings.attackFactor;
  $("#min-damage-label").textContent = settings.minDamage;
  $("#seed-label").textContent = `SEED ${settings.seed}`;
}

function renderAll() {
  renderTeams();
  renderRoster();
  renderArena();
  renderSettings();
  renderAnalysis();
}

function validateConfiguration() {
  if (!teams.A.length || !teams.B.length) return "각 팀에는 캐릭터가 1명 이상 필요합니다.";
  for (const side of ["A", "B"]) {
    if (teams[side].length > 5) return `${teamName(side)}은 5명을 초과할 수 없습니다.`;
    const ids = teams[side].map(member => member.catalogId);
    if (new Set(ids).size !== ids.length) return `${teamName(side)}에 같은 캐릭터가 중복되었습니다.`;
    for (const member of teams[side]) {
      if ([member.hp, member.atk, member.def, member.spd].some(value => !Number.isInteger(value) || value < 1 || value > 99)) return `${catalogById[member.catalogId].name}의 능력치는 1~99 정수여야 합니다.`;
      if (!Number.isInteger(member.priority) || member.priority < -99 || member.priority > 99) return `${catalogById[member.catalogId].name}의 우선도는 -99~99 정수여야 합니다.`;
      if (settings.enforceStatCap && memberTotal(member) > 25) return `${catalogById[member.catalogId].name}의 기본 스탯 합계가 25를 초과합니다.`;
    }
  }
  return "";
}

function makeRng(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function pushLog(entry) {
  battle.logs.push(entry);
}

function beginBattle() {
  const error = validateConfiguration();
  if (error) {
    showToast(error);
    return false;
  }
  stopPlayback();
  const units = ["A", "B"].flatMap(side => teams[side].map((member, slot) => {
    const character = catalogById[member.catalogId];
    const maxHp = Math.max(1, Math.floor(member.hp * settings.hpMultiplier));
    return {
      uid: `${side}-${slot}-${member.instanceId}`,
      side,
      slot,
      catalogId: member.catalogId,
      name: character.name,
      image: character.image,
      species: character.species,
      type: character.type,
      sourceRole: character.sourceRole,
      mechanicRole: character.mechanicRole,
      passive: character.passive,
      skill: character.skill,
      maxHp,
      currentHp: maxHp,
      shield: 0,
      grit: 0,
      statuses: {},
      charge: 0,
      fullness: 0,
      swarm: 0,
      selfHarm: 0,
      wild: 0,
      memory: 0,
      fall: 0,
      knowledge: 0,
      glutted: false,
      enduredKnockout: false,
      lunarPhase: null,
      lunarCount: 0,
      sureHit: false,
      firstDamageBlocked: false,
      actionsTaken: 0,
      howlBuff: 0,
      alive: true,
      priority: member.priority,
      attack: member.atk,
      defense: member.def,
      speed: member.spd,
      duelBuffed: false,
      damageDealt: 0,
      directDamage: 0,
      statusDamage: 0,
      healingDone: 0,
      shieldingDone: 0,
      basicUses: 0,
      skillUses: 0,
      kills: 0
    };
  }));
  battle = {
    status: "paused",
    turn: 0,
    queue: [],
    units,
    logs: [],
    rng: makeRng(settings.seed),
    actionInTurn: 0,
    currentActorUid: null,
    lastTargetUid: null,
    teamEffects: { A: { howlPending: false }, B: { howlPending: false } },
    startedAt: Date.now(),
    result: null
  };
  pushLog({ kind: "system", label: "START", message: `전투 시작 · ${settings.seed} 시드 · ${teams.A.length} 대 ${teams.B.length}` });
  for (const unit of units.filter(item => item.mechanicRole === "보호자")) {
    const gained = addShield(unit, Math.floor(unit.maxHp * 0.1));
    pushLog({ kind: "system", label: "STAGE", message: `${unit.name}이(가) 역할군 효과로 보호막 ${gained}을 얻었습니다.` });
  }
  for (const unit of units.filter(item => item.alive)) {
    const passiveId = passiveEffect(unit).id;
    if (passiveId === "swarm_body") {
      unit.swarm = 3;
      pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 흩어지는 신체 · 군체 3` });
    }
    if (passiveId === "limited_time") {
      adjustAllStats(unit, 8);
      pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 한정된 시간 · 모든 스탯 +8 (HP ${unit.currentHp}/${unit.maxHp})` });
    }
    if (passiveId === "deadeye") {
      unit.sureHit = true;
      pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 대해적 · 필중 획득` });
    }
    if (passiveId === "full_moon") {
      unit.lunarPhase = "crescent";
      unit.lunarCount = 0;
      pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 만월 · 그믐 획득` });
    }
    if (passiveId === "embracing_wave") {
      const target = units.filter(item => item.side === unit.side && item.alive).sort((left, right) => left.slot - right.slot)[0];
      if (target) {
        target.statuses.silk = { sourceUid: unit.uid };
        pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 보듬는 물결 · ${target.name}에게 비단 부여` });
      }
    }
    if (passiveId === "jewel_feather") {
      const gained = addShield(unit, Math.floor(unit.maxHp * 0.3));
      unit.shieldingDone += gained;
      pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 보석 깃털 · 보호막 +${gained}` });
    }
    if (passiveId === "bullying") {
      const candidates = aliveUnits(enemySide(unit.side));
      const target = candidates[Math.floor(battle.rng() * candidates.length)];
      if (target && applyHarmfulStatus(target, "bullying", { sourceUid: unit.uid })) {
        pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 쟤가 나 괴롭혀 · ${target.name}에게 괴롭힘 부여` });
      }
    }
  }
  for (const unit of units.filter(item => item.alive && passiveEffect(item).id === "love_devour")) {
    const target = units.find(item => item.side !== unit.side && item.alive && item.slot === unit.slot);
    if (!target) continue;
    moveToFront(unit);
    moveToFront(target);
    if (applyHarmfulStatus(target, "swallowed", { sourceUid: unit.uid, count: 1 })) {
      unit.glutted = true;
      pushLog({ kind: "passive", label: "STAGE", message: `${unit.name}의 나도 널 사랑해 · ${target.name} 삼킴 1 · 양 팀 1번 위치 이동` });
    }
  }
  for (const unit of units.filter(item => item.alive && passiveEffect(item).id === "seeping_current")) {
    const target = aliveUnits(enemySide(unit.side)).sort((left, right) => right.slot - left.slot)[0];
    if (!target) continue;
    const applied = applyHarmfulStatus(target, "current", { sourceUid: unit.uid });
    pushLog({ kind: "system", label: "STAGE", message: applied ? `${unit.name}의 물살이 ${target.name}에게 적용되었습니다.` : `${target.name}이(가) ${unit.name}의 물살을 무효화했습니다.` });
  }
  activeAnalysisTab = "log";
  renderAll();
  return true;
}

function startTurn() {
  battle.turn += 1;
  battle.actionInTurn = 0;

  for (const unit of battle.units) unit.howlBuff = 0;
  for (const side of ["A", "B"]) {
    if (!battle.teamEffects[side].howlPending) continue;
    for (const unit of aliveUnits(side)) unit.howlBuff = 2;
    battle.teamEffects[side].howlPending = false;
    pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${teamName(side)}의 하울링이 발동해 이번 턴 공격력이 2 증가합니다.` });
  }

  if (battle.turn === 8) {
    for (const unit of battle.units.filter(item => item.alive && item.mechanicRole === "결전자" && !item.duelBuffed)) {
      unit.attack += 1;
      unit.defense += 1;
      unit.speed += 1;
      unit.duelBuffed = true;
      pushLog({ kind: "system", label: "T08", message: `${unit.name}의 후반 강화가 발동해 공격·방어·속도가 1 증가했습니다.` });
    }
  }

  for (const unit of battle.units.filter(item => item.alive)) {
    const passiveId = passiveEffect(unit).id;
    if (unit.statuses.silk) {
      const source = battle.units.find(item => item.uid === unit.statuses.silk.sourceUid) || null;
      const result = healUnit(source, unit, Math.floor(unit.maxHp * 0.05));
      if (result.healed || result.shield) pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 비단 · ${result.healed ? `HP +${result.healed}` : `보호막 +${result.shield}`}` });
    }
    if (passiveId === "shell_break" && battle.turn % 3 === 0) {
      unit.defense -= 1;
      unit.attack += 2;
      pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 갑각 깨기 · 방어력 -1, 공격력 +2` });
    }
    if (passiveId === "kings_leap") {
      unit.speed += 1;
      pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 왕의 도약 · 속도 +1` });
    }
    if (passiveId === "wild_spirit") {
      unit.wild += 1;
      unit.speed += 1;
      pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 불굴의 투지 · 야성 ${unit.wild} · 속도 +1 · 회피 +${Math.min(50, unit.wild * 5)}%` });
    }
    if (passiveId === "vengeful_blade") {
      gainMemory(unit, 1);
      pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 복수의 칼날 · 암기 ${unit.memory}` });
    }
    if (passiveId === "full_moon") {
      if (unit.lunarPhase === "crescent") {
        adjustHp(unit, 10);
        unit.lunarCount += 1;
        if (unit.lunarCount >= 2) {
          unit.lunarPhase = "half";
          unit.lunarCount = 0;
        }
        pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 그믐 · 체력 스탯 +1 · 현재 ${unit.lunarPhase === "half" ? "반월" : "그믐"}` });
      } else if (unit.lunarPhase === "half") {
        unit.defense += 1;
        unit.lunarCount += 1;
        if (unit.lunarCount >= 2) {
          unit.lunarPhase = "full";
          unit.lunarCount = 0;
          unit.attack += 3;
        }
        pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 반월 · 방어력 +1${unit.lunarPhase === "full" ? " · 만월 진입 공격력 +3" : ""}` });
      }
    }
    if (unit.statuses.current && battle.turn % 3 === 0) {
      const before = unit.grit;
      unit.grit = Math.max(0, unit.grit - 1);
      pushLog({ kind: "status", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 물살 · 투지 ${before}→${unit.grit}` });
    }
    if (passiveId === "fall_ready") {
      unit.fall += 1;
      const stat = ["hp", "attack", "defense", "speed"][Math.floor(battle.rng() * 4)];
      if (stat === "hp") adjustHp(unit, settings.hpMultiplier);
      else unit[stat] += 1;
      const name = { hp: "체력", attack: "공격력", defense: "방어력", speed: "속도" }[stat];
      pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 낙하준비 · 낙하 ${unit.fall} · ${name} +1` });
    }
    if (passiveId === "aloof_knowledge") {
      unit.knowledge += 1;
      pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 고고함 · 지식 ${unit.knowledge}` });
    }
    if (passiveId === "healing_power") {
      const target = lowestHpAlly(unit.side);
      const result = healUnit(unit, target, Math.floor(target.maxHp * 0.1));
      if (result.healed || result.shield) pushLog({ kind: "passive", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${unit.name}의 치유의 힘 · ${target.name} ${result.healed ? `HP +${result.healed}` : `보호막 +${result.shield}`}` });
    }
  }

  battle.queue = sortUnits(battle.units.filter(unit => unit.alive)).map(unit => unit.uid);
  pushLog({ kind: "system", label: `T${String(battle.turn).padStart(2, "0")}`, message: `${battle.turn}턴 시작 · 행동 순서를 다시 계산했습니다.` });
}

function aliveUnits(side) {
  return battle.units.filter(unit => unit.side === side && unit.alive);
}

function finishBattle(result, reason) {
  if (!battle || battle.status === "ended") return;
  stopPlayback();
  battle.status = "ended";
  battle.result = result;
  battle.currentActorUid = null;
  const title = result === "A" ? "A팀 승리" : result === "B" ? "B팀 승리" : "무승부";
  pushLog({ kind: "system", label: "END", message: `${title} · ${reason}` });
  const remainingHp = {
    A: aliveUnits("A").reduce((sum, unit) => sum + unit.currentHp, 0),
    B: aliveUnits("B").reduce((sum, unit) => sum + unit.currentHp, 0)
  };
  resultHistory.unshift({
    title,
    reason,
    turns: battle.turn,
    seed: settings.seed,
    remainingHp,
    survivors: { A: aliveUnits("A").length, B: aliveUnits("B").length },
    damage: {
      A: battle.units.filter(unit => unit.side === "A").reduce((sum, unit) => sum + unit.damageDealt, 0),
      B: battle.units.filter(unit => unit.side === "B").reduce((sum, unit) => sum + unit.damageDealt, 0)
    },
    statusDamage: {
      A: battle.units.filter(unit => unit.side === "A").reduce((sum, unit) => sum + unit.statusDamage, 0),
      B: battle.units.filter(unit => unit.side === "B").reduce((sum, unit) => sum + unit.statusDamage, 0)
    },
    healing: {
      A: battle.units.filter(unit => unit.side === "A").reduce((sum, unit) => sum + unit.healingDone, 0),
      B: battle.units.filter(unit => unit.side === "B").reduce((sum, unit) => sum + unit.healingDone, 0)
    },
    shielding: {
      A: battle.units.filter(unit => unit.side === "A").reduce((sum, unit) => sum + unit.shieldingDone, 0),
      B: battle.units.filter(unit => unit.side === "B").reduce((sum, unit) => sum + unit.shieldingDone, 0)
    },
    skills: {
      A: battle.units.filter(unit => unit.side === "A").reduce((sum, unit) => sum + unit.skillUses, 0),
      B: battle.units.filter(unit => unit.side === "B").reduce((sum, unit) => sum + unit.skillUses, 0)
    },
    settings: { ...settings }
  });
  resultHistory = resultHistory.slice(0, 4);
  activeAnalysisTab = "results";
  renderAll();
}

function checkWinner() {
  const aAlive = aliveUnits("A").length;
  const bAlive = aliveUnits("B").length;
  if (!aAlive && !bAlive) finishBattle("draw", "양 팀이 동시에 전투불능이 되었습니다.");
  else if (!aAlive) finishBattle("B", "A팀 전원이 전투불능입니다.");
  else if (!bAlive) finishBattle("A", "B팀 전원이 전투불능입니다.");
  return battle?.status === "ended";
}

function canUseSkill(actor) {
  const skillId = skillEffect(actor).id;
  if (!battle) return true;
  const enemies = aliveUnits(enemySide(actor.side));
  if (!enemies.length) return false;
  if (Number(actor.statuses.silenceActions || 0) > 0) return false;
  if (skillId === "cut_throat") return enemies.some(unit => unit.statuses.mark?.sourceUid === actor.uid);
  if (skillId === "bind") return enemies.some(unit => unit.statuses.current);
  if (skillId === "feast_time") return actor.fullness > 0;
  if (skillId === "tell_mom") return enemies.some(unit => unit.statuses.bullying?.sourceUid === actor.uid);
  if (skillId === "bon_appetit") return enemies.some(unit => unit.statuses.swallowed?.sourceUid === actor.uid);
  return true;
}

function selectTarget(actor, skillId = null) {
  const candidates = aliveUnits(enemySide(actor.side));
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((left, right) => left.slot - right.slot);
  if (skillId === "cut_throat") return sorted.find(unit => unit.statuses.mark?.sourceUid === actor.uid) || null;
  if (skillId === "bind") return sorted.find(unit => unit.statuses.current) || null;
  if (skillId === "weak_predation" || passiveEffect(actor).id === "despise_weak") {
    return [...candidates].sort((left, right) => left.currentHp - right.currentHp || left.slot - right.slot)[0];
  }
  return actor.mechanicRole === "암살자" ? sorted.at(-1) : sorted[0];
}

function lowestHpAlly(side) {
  return aliveUnits(side).sort((left, right) =>
    left.currentHp / left.maxHp - right.currentHp / right.maxHp || left.slot - right.slot
  )[0] || null;
}

function addShield(target, amount) {
  if (!target?.alive) return 0;
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  target.shield += gained;
  return gained;
}

function adjustHp(unit, amount, { floorAtTen = false } = {}) {
  const delta = Math.trunc(Number(amount) || 0);
  if (!delta) return 0;
  if (delta > 0) {
    unit.maxHp += delta;
    unit.currentHp += delta;
    return delta;
  }
  const minimum = floorAtTen ? 10 : 1;
  const decrease = Math.min(-delta, Math.max(0, unit.maxHp - minimum));
  unit.maxHp -= decrease;
  if (unit.currentHp > minimum) unit.currentHp = Math.max(minimum, unit.currentHp - decrease);
  unit.currentHp = Math.min(unit.currentHp, unit.maxHp);
  return -decrease;
}

function adjustAllStats(unit, amount, { hpFloorAtTen = false } = {}) {
  const delta = Math.trunc(Number(amount) || 0);
  adjustHp(unit, delta * settings.hpMultiplier, { floorAtTen: hpFloorAtTen });
  if (delta >= 0) {
    unit.attack += delta;
    unit.defense += delta;
    unit.speed += delta;
  } else {
    unit.attack = Math.max(0, unit.attack + delta);
    unit.defense = Math.max(0, unit.defense + delta);
    unit.speed = Math.max(0, unit.speed + delta);
  }
}

function gainMemory(unit, amount = 1) {
  const gained = Math.max(0, Math.trunc(Number(amount) || 0));
  unit.memory += gained;
  return gained;
}

function clearMemory(unit) {
  const removed = Math.max(0, Number(unit.memory || 0));
  unit.memory = 0;
  return removed;
}

function moveToFront(unit) {
  if (!unit || unit.slot === 0) return false;
  const front = battle.units.find(item => item.side === unit.side && item.slot === 0);
  if (front) front.slot = unit.slot;
  unit.slot = 0;
  return true;
}

function basicDamageFor(actor, target, { ignoreDefense = false } = {}) {
  const defense = ignoreDefense ? 0 : target.defense;
  return Math.max(settings.minDamage, Math.floor(effectiveAttack(actor) * settings.attackFactor - defense));
}

function executeUnit(actor, target) {
  if (!target?.alive) return null;
  const hpBefore = target.currentHp;
  target.currentHp = 0;
  target.shield = 0;
  target.alive = false;
  actor.damageDealt += hpBefore;
  actor.directDamage += hpBefore;
  const result = {
    target,
    dodged: false,
    dodgeRoll: null,
    dodgeChance: 0,
    rawDamage: hpBefore,
    shieldAbsorb: 0,
    hpDamage: hpBefore,
    hpBefore,
    hpAfter: 0,
    knockout: true,
    nullified: false,
    executed: true
  };
  onKnockout(actor, target);
  return result;
}

function healUnit(source, target, amount) {
  if (!target?.alive) return { healed: 0, shield: 0 };
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  if (!requested) return { healed: 0, shield: 0 };
  if (passiveEffect(target).id === "healing_to_shield") {
    const shield = addShield(target, requested);
    if (source) source.shieldingDone += shield;
    return { healed: 0, shield };
  }
  const before = target.currentHp;
  target.currentHp = Math.min(target.maxHp, target.currentHp + requested);
  const healed = target.currentHp - before;
  if (source) source.healingDone += healed;
  return { healed, shield: 0 };
}

function applyHarmfulStatus(target, type, payload = {}) {
  if (!target?.alive || passiveEffect(target).id === "status_immunity") return false;
  if (type === "mark") {
    for (const unit of battle.units) {
      if (unit.statuses.mark?.sourceUid === payload.sourceUid) delete unit.statuses.mark;
    }
    target.statuses.mark = { sourceUid: payload.sourceUid };
    return true;
  }
  if (type === "stun") {
    target.statuses.stunActions = Math.max(Number(target.statuses.stunActions || 0), Number(payload.actions || 1));
    return true;
  }
  if (type === "poison") {
    if (!target.statuses.poison) target.statuses.poison = { sourceUid: payload.sourceUid, stage: 0 };
    return true;
  }
  if (type === "bleed") {
    if (!target.statuses.bleed) target.statuses.bleed = { sourceUid: payload.sourceUid };
    return true;
  }
  if (type === "current") {
    if (!target.statuses.current) target.statuses.current = { sourceUid: payload.sourceUid };
    return true;
  }
  if (type === "paralysis") {
    if (!target.statuses.paralysis) target.statuses.paralysis = { sourceUid: payload.sourceUid };
    return true;
  }
  if (type === "binding") {
    if (!target.statuses.binding) target.statuses.binding = { sourceUid: payload.sourceUid, count: 0 };
    target.statuses.binding.count += Math.max(1, Number(payload.count || 1));
    return true;
  }
  if (type === "bloodScent") {
    target.statuses.bloodScent = {
      sourceUid: payload.sourceUid,
      expiresAfterSourceAction: Number(payload.expiresAfterSourceAction || 1)
    };
    return true;
  }
  if (type === "bullying") {
    for (const unit of battle.units) {
      if (unit.statuses.bullying?.sourceUid === payload.sourceUid) delete unit.statuses.bullying;
    }
    target.statuses.bullying = { sourceUid: payload.sourceUid };
    return true;
  }
  if (type === "swallowed") {
    if (!target.statuses.swallowed) target.statuses.swallowed = { sourceUid: payload.sourceUid, count: 0 };
    target.statuses.swallowed.count += Math.max(1, Number(payload.count || 1));
    return true;
  }
  if (type === "deadlyPoison") {
    if (!target.statuses.deadlyPoison) target.statuses.deadlyPoison = { sourceUid: payload.sourceUid, count: 0 };
    target.statuses.deadlyPoison.count += Math.max(1, Number(payload.count || 1));
    return true;
  }
  if (type === "silence") {
    target.statuses.silenceActions = Math.max(Number(target.statuses.silenceActions || 0), Number(payload.actions || 1));
    return true;
  }
  return false;
}

function applyDamage(target, rawDamage, { bypassShield = false } = {}) {
  const normalized = Number.isFinite(rawDamage) ? Math.max(0, Math.floor(rawDamage)) : target.currentHp + target.shield;
  const wasAlive = target.alive;
  if (wasAlive && normalized > 0 && passiveEffect(target).id === "first_damage_null" && !target.firstDamageBlocked) {
    target.firstDamageBlocked = true;
    return { rawDamage: 0, attemptedDamage: normalized, shieldAbsorb: 0, hpDamage: 0, hpBefore: target.currentHp, hpAfter: target.currentHp, knockout: false, nullified: true };
  }
  const shieldAbsorb = bypassShield ? 0 : Math.min(target.shield, normalized);
  target.shield -= shieldAbsorb;
  const hpLoss = Math.max(0, normalized - shieldAbsorb);
  const hpBefore = target.currentHp;
  target.currentHp = Math.max(0, target.currentHp - hpLoss);
  let endured = false;
  if (target.currentHp <= 0 && passiveEffect(target).id === "steel_wing" && !target.enduredKnockout) {
    target.currentHp = 1;
    target.enduredKnockout = true;
    endured = true;
  }
  const hpDamage = hpBefore - target.currentHp;
  if (target.currentHp <= 0) target.alive = false;
  return { rawDamage: normalized, attemptedDamage: normalized, shieldAbsorb, hpDamage, hpBefore, hpAfter: target.currentHp, knockout: wasAlive && !target.alive, nullified: false, endured };
}

function damageWithPassives(actor, target, rawDamage, attackKind = "basic") {
  let adjusted = Math.max(0, Number(rawDamage) || 0);
  if (passiveEffect(actor).id === "blood_excitement" && actor.type === target.type) adjusted *= 1.2;
  if (passiveEffect(actor).id === "swift_pressure" && effectiveSpeed(actor) > effectiveSpeed(target)) adjusted *= 1.3;
  if (passiveEffect(actor).id === "poison_spray" && target.statuses.poison) adjusted *= 1.5;
  if (target.statuses.mark?.sourceUid === actor.uid) adjusted *= 1.2;
  if (target.statuses.bullying) adjusted *= 1.3;
  if (target.glutted) adjusted *= 1.5;
  if (passiveEffect(target).id === "tough_hide") adjusted *= attackKind === "skill" ? 1.3 : 0.7;
  return Math.floor(adjusted);
}

function onKnockout(source, target) {
  for (const unit of battle.units.filter(item => item.alive && passiveEffect(item).id === "primal_predation")) {
    unit.attack += 1;
    unit.speed += 1;
    pushLog({ kind: "passive", label: "KO", message: `${unit.name}의 원시의 포식 · 공격력 +1 · 속도 +1` });
  }
  for (const unit of battle.units.filter(item => item.alive && item.side === target.side && passiveEffect(item).id === "aloof_knowledge")) {
    unit.knowledge += 1;
    pushLog({ kind: "passive", label: "KO", message: `${unit.name}의 고고함 · 아군 전투불능으로 지식 ${unit.knowledge}` });
  }
  for (const unit of battle.units) {
    if (unit.statuses.bloodScent?.sourceUid === target.uid) delete unit.statuses.bloodScent;
  }
  if (!source || source.uid === target.uid) return;
  source.kills += 1;
  if (source.mechanicRole === "돌격자" && source.alive) {
    const recovery = Math.floor(source.maxHp * 0.05);
    const result = healUnit(source, source, recovery);
    if (result.healed || result.shield) {
      pushLog({ kind: "passive", label: "KO", message: `${source.name}의 역할군 회복 · ${result.healed ? `HP +${result.healed}` : `보호막 +${result.shield}`}` });
    }
  }
  if (teamHasPassive(source.side, "howling")) battle.teamEffects[source.side].howlPending = true;
  if (passiveEffect(source).id === "kill_growth" && source.alive) {
    source.attack += 3;
    source.maxHp += 10;
    source.currentHp += 10;
    pushLog({ kind: "passive", label: "KO", message: `${source.name}의 배부름 · 공격력 +3 · 체력 스탯 +1 (HP ${source.currentHp}/${source.maxHp})` });
  }
}

function resolveHit(actor, target, rawDamage, { allowDodge = true, attackKind = "basic" } = {}) {
  let dodgeRoll = null;
  let dodged = false;
  const chance = actor.sureHit ? 0 : dodgeChance(target);
  if (allowDodge && chance > 0) {
    dodgeRoll = battle.rng();
    dodged = dodgeRoll < chance / 100;
  }
  if (passiveEffect(actor).id === "sacrificial_self_harm") actor.selfHarm += 1;
  if (passiveEffect(target).id === "current_wrap" && actor.alive) {
    const paralysisRoll = battle.rng();
    if (paralysisRoll < 0.5) applyHarmfulStatus(actor, "paralysis", { sourceUid: target.uid });
  }
  if (passiveEffect(target).id === "bullying" && actor.alive) applyHarmfulStatus(actor, "bullying", { sourceUid: target.uid });
  if (target.alive && passiveEffect(target).id === "vengeful_blade") gainMemory(target, 1);
  if (dodged) {
    return { target, dodged: true, dodgeRoll, dodgeChance: chance, rawDamage: 0, shieldAbsorb: 0, hpDamage: 0, hpBefore: target.currentHp, hpAfter: target.currentHp, knockout: false, nullified: false };
  }
  const adjusted = damageWithPassives(actor, target, rawDamage, attackKind);
  const result = applyDamage(target, adjusted);
  actor.damageDealt += result.hpDamage;
  actor.directDamage += result.hpDamage;
  if (passiveEffect(target).id === "charge_on_hit") target.charge += 1;
  if (passiveEffect(target).id === "amplified_armor") target.attack += 2;
  if (passiveEffect(target).id === "swarm_body" && target.swarm > 0) target.swarm -= 1;
  if (passiveEffect(actor).id === "mata_hari" && target.alive) {
    applyHarmfulStatus(target, "deadlyPoison", { sourceUid: actor.uid, count: 1 });
    if (target.statuses.deadlyPoison.count >= 6) return executeUnit(actor, target);
  }
  for (const unit of battle.units.filter(item => item.alive && item.side === target.side && passiveEffect(item).id === "aloof_knowledge")) unit.knowledge += 1;
  if (result.knockout) onKnockout(actor, target);
  return { target, dodged: false, dodgeRoll, dodgeChance: chance, ...result };
}

function hitText(hit) {
  if (hit.dodged) return `${hit.target.name} 회피 ${hit.dodgeChance}%(${hit.dodgeRoll.toFixed(3)})`;
  if (hit.nullified) return `${hit.target.name} 첫 피해 무효`;
  if (hit.executed) return `${hit.target.name} 처형·전투불능`;
  if (hit.endured) return `${hit.target.name} ${hit.hpBefore}→1·강철날개 생존`;
  const shield = hit.shieldAbsorb ? `·보호막 ${hit.shieldAbsorb}` : "";
  const knockout = hit.knockout ? "·전투불능" : "";
  return `${hit.target.name} ${hit.hpBefore}→${hit.hpAfter}${shield}${knockout}`;
}

function afterDirectDamage(actor, totalHpDamage) {
  if (totalHpDamage <= 0) return [];
  const notes = [];
  const passiveId = passiveEffect(actor).id;
  if (passiveId === "inhale") {
    actor.grit += 1;
    notes.push("들숨 투지 +1");
  }
  if (passiveId === "voracious_drain") {
    const result = healUnit(actor, actor, Math.floor(totalHpDamage * 0.2));
    if (result.healed > 0) {
      actor.fullness += 1;
      notes.push(`흡혈 HP +${result.healed}·배부름 ${actor.fullness}`);
    }
  }
  if (passiveId === "conviction") {
    const target = lowestHpAlly(actor.side);
    const result = healUnit(actor, target, Math.floor(totalHpDamage * 0.2));
    if (result.healed || result.shield) notes.push(`신념 ${target.name} ${result.healed ? `HP +${result.healed}` : `보호막 +${result.shield}`}`);
  }
  return notes;
}

function executeBasicAttack(actor) {
  const scented = passiveEffect(actor).id === "prey_found"
    ? aliveUnits(enemySide(actor.side)).filter(unit => unit.statuses.bloodScent?.sourceUid === actor.uid).sort((left, right) => left.slot - right.slot)
    : [];
  const targets = scented.length ? scented : [selectTarget(actor)].filter(Boolean);
  if (!targets.length) return { hits: [], notes: ["공격할 대상 없음"] };
  const hits = [];
  const repeat = passiveEffect(actor).id === "steel_wing" && !scented.length ? 2 : 1;
  for (const target of targets) {
    for (let count = 0; count < repeat && target.alive; count += 1) hits.push(resolveHit(actor, target, basicDamageFor(actor, target)));
  }
  const notes = [];
  if (repeat > 1) notes.push("강철날개 · 기본 공격 2회");
  if (scented.length) notes.push(`피냄새 대상 ${scented.length}명 공격`);
  for (const hit of hits) {
    const target = hit.target;
    if (!hit.dodged && target.alive && passiveEffect(actor).id === "mark_prey") {
      const applied = applyHarmfulStatus(target, "mark", { sourceUid: actor.uid });
      notes.push(applied ? `${target.name} 표식` : `${target.name} 표식 면역`);
    }
  }
  return { hits, notes };
}

function executeSkill(actor, skill) {
  const enemies = aliveUnits(enemySide(actor.side)).sort((left, right) => left.slot - right.slot);
  const allies = aliveUnits(actor.side).sort((left, right) => left.slot - right.slot);
  const hits = [];
  const notes = [];
  const attack = effectiveAttack(actor);
  const speed = effectiveSpeed(actor);
  const hitOne = (target, damage) => {
    if (!target) return null;
    const hit = resolveHit(actor, target, damage, { attackKind: "skill" });
    hits.push(hit);
    return hit;
  };
  const hitAll = damage => enemies.slice().forEach(target => hitOne(target, damage));

  switch (skill.id) {
    case "self_destruct": {
      hitAll(attack * actor.charge);
      const selfResult = applyDamage(actor, actor.maxHp);
      if (selfResult.knockout) notes.push(`${actor.name} 자폭으로 전투불능`);
      else notes.push(`${actor.name} 자폭 피해 ${selfResult.rawDamage}`);
      break;
    }
    case "weak_predation": {
      const hit = hitOne(selectTarget(actor, skill.id), attack * 2);
      if (hit && !hit.dodged) {
        const result = healUnit(actor, actor, Math.floor(hit.hpDamage * 0.3));
        if (result.healed || result.shield) notes.push(`흡수 ${result.healed ? `HP +${result.healed}` : `보호막 +${result.shield}`}`);
      }
      break;
    }
    case "sea_poison": {
      for (const target of enemies.slice()) {
        const hit = hitOne(target, Math.floor(attack / 2));
        if (!hit || hit.dodged || !target.alive) continue;
        const roll = battle.rng();
        if (roll < 0.3) {
          const applied = applyHarmfulStatus(target, "poison", { sourceUid: actor.uid });
          notes.push(applied ? `${target.name} 독(${roll.toFixed(3)})` : `${target.name} 독 면역`);
        }
      }
      break;
    }
    case "blessing": {
      const target = lowestHpAlly(actor.side);
      const result = healUnit(actor, target, Math.floor(target.maxHp * 0.1));
      notes.push(`${target.name} ${result.healed ? `HP +${result.healed}` : result.shield ? `보호막 +${result.shield}` : "변화 없음"}`);
      break;
    }
    case "cut_throat": {
      const target = selectTarget(actor, skill.id);
      hitOne(target, attack * 3);
      if (target?.statuses.mark?.sourceUid === actor.uid) delete target.statuses.mark;
      notes.push("표식 제거");
      break;
    }
    case "hunt_start": {
      for (const target of enemies) {
        if (passiveEffect(target).id === "status_immunity") notes.push(`${target.name} 방어 감소 면역`);
        else {
          target.defense -= 1;
          notes.push(`${target.name} 방어력 -1`);
        }
      }
      break;
    }
    case "smash":
      hitOne(selectTarget(actor, skill.id), attack * 2);
      break;
    case "sea_wave":
      for (const target of allies.filter(unit => unit.type === "해")) {
        const gained = addShield(target, Math.floor(target.maxHp * 0.1));
        actor.shieldingDone += gained;
        notes.push(`${target.name} 보호막 +${gained}`);
      }
      break;
    case "exhale":
      for (const target of allies.filter(unit => unit.uid !== actor.uid)) {
        target.grit += 1;
        notes.push(`${target.name} 투지 +1`);
      }
      break;
    case "full_barrage":
      hitAll(attack * 1.5);
      break;
    case "kings_leap_attack":
      hitOne(selectTarget(actor, skill.id), attack + speed);
      break;
    case "molt":
      actor.defense -= 1;
      actor.speed -= 1;
      actor.attack += 3;
      notes.push("방어력 -1·속도 -1·공격력 +3");
      break;
    case "feast_time":
      enemies.slice(0, Math.min(actor.fullness, enemies.length)).forEach(target => hitOne(target, attack * 1.5));
      notes.push(`배부름 ${actor.fullness} · 대상 ${hits.length}명`);
      break;
    case "bind": {
      const target = selectTarget(actor, skill.id);
      const applied = applyHarmfulStatus(target, "stun", { sourceUid: actor.uid, actions: 1 });
      notes.push(applied ? `${target.name} 다음 행동 기절` : `${target.name} 기절 면역`);
      break;
    }
    case "sharp_teeth": {
      const target = selectTarget(actor, skill.id);
      const hit = hitOne(target, attack * 2);
      if (hit && !hit.dodged && target.alive) {
        const applied = applyHarmfulStatus(target, "bleed", { sourceUid: actor.uid });
        notes.push(applied ? `${target.name} 출혈` : `${target.name} 출혈 면역`);
      }
      break;
    }
    case "perseverance":
      hitAll(attack);
      for (const target of allies.filter(unit => unit.alive)) {
        const gained = addShield(target, 10);
        actor.shieldingDone += gained;
        notes.push(`${target.name} 보호막 +${gained}`);
      }
      break;
    case "leaf_guard":
      for (const target of allies) {
        const gained = addShield(target, Math.floor(target.maxHp * 0.2));
        actor.shieldingDone += gained;
        notes.push(`${target.name} 보호막 +${gained}`);
      }
      break;
    case "surprise_strike": {
      const target = selectTarget(actor, skill.id);
      const missingRatio = target ? 1 - target.currentHp / target.maxHp : 0;
      hitOne(target, attack * (1 + missingRatio));
      notes.push(`잃은 HP ${Math.floor(missingRatio * 100)}% · 배율 ${(1 + missingRatio).toFixed(2)}`);
      break;
    }
    case "wraith_advance": {
      const swarm = Math.max(0, actor.swarm);
      enemies.slice(0, Math.min(swarm, enemies.length)).forEach(target => hitOne(target, swarm * attack));
      actor.swarm = Math.min(3, actor.swarm + 1);
      notes.push(`군체 ${swarm} 기준 대상 ${hits.length}명 · 군체 ${actor.swarm}`);
      break;
    }
    case "express_delivery": {
      const target = selectTarget(actor, skill.id);
      const repeat = target && speed > effectiveSpeed(target) ? 3 : 2;
      for (let index = 0; index < repeat && target?.alive; index += 1) hitOne(target, basicDamageFor(actor, target, { ignoreDefense: true }));
      notes.push(`방어 무시 ${repeat}회 공격`);
      break;
    }
    case "pierce": {
      const target = selectTarget(actor, skill.id);
      const stun = applyHarmfulStatus(target, "stun", { sourceUid: actor.uid, actions: 1 });
      const poison = applyHarmfulStatus(target, "poison", { sourceUid: actor.uid });
      const actorMoved = moveToFront(actor);
      const targetMoved = moveToFront(target);
      notes.push(`${target.name} ${stun ? "기절" : "기절 면역"} · ${poison ? "독" : "독 면역"}${actorMoved || targetMoved ? " · 양 팀 1번 위치 이동" : ""}`);
      break;
    }
    case "descent": {
      const repeat = Math.max(0, actor.selfHarm);
      for (let count = 0; count < repeat; count += 1) {
        for (const target of aliveUnits(enemySide(actor.side)).sort((left, right) => left.slot - right.slot)) {
          hitOne(target, basicDamageFor(actor, target));
        }
      }
      notes.push(`사용 직전 자해 ${repeat} · 전체 공격 ${repeat}회`);
      break;
    }
    case "paralysis_release":
      for (const target of enemies) notes.push(applyHarmfulStatus(target, "paralysis", { sourceUid: actor.uid }) ? `${target.name} 마비` : `${target.name} 마비 면역`);
      notes.push(applyHarmfulStatus(actor, "paralysis", { sourceUid: actor.uid }) ? `${actor.name} 마비` : `${actor.name} 마비 면역`);
      break;
    case "black_feather": {
      const target = selectTarget(actor, skill.id);
      hitOne(target, basicDamageFor(actor, target));
      adjustAllStats(actor, 2);
      notes.push(`모든 스탯 +2 · HP ${actor.currentHp}/${actor.maxHp}`);
      break;
    }
    case "orca_strike": {
      const target = selectTarget(actor, skill.id);
      hitOne(target, attack * 3);
      if (target?.alive && target.currentHp <= 15) {
        const execution = executeUnit(actor, target);
        if (execution) hits.push(execution);
        notes.push(`${target.name} HP 15 이하 처형`);
      }
      break;
    }
    case "predation": {
      const target = selectTarget(actor, skill.id);
      const lowHp = target && target.currentHp / target.maxHp < 0.5;
      hitOne(target, attack * 2.5 * (lowHp ? 1.3 : 1));
      if (lowHp) notes.push("대상 HP 50% 미만 · 피해 +30%");
      break;
    }
    case "web_bind": {
      const target = selectTarget(actor, skill.id);
      const actorSpeed = speed;
      const targetSpeed = target ? effectiveSpeed(target) : 0;
      const hit = hitOne(target, target ? basicDamageFor(actor, target) : 0);
      if (hit && !hit.dodged && target.alive) {
        if (targetSpeed < actorSpeed) {
          const applied = applyHarmfulStatus(target, "binding", { sourceUid: actor.uid, count: 1 });
          if (!applied) notes.push(`${target.name} 속박 면역`);
          else {
            const count = target.statuses.binding.count;
            notes.push(`${target.name} 속박 ${count}`);
            if (count === 2) {
              applyHarmfulStatus(target, "stun", { sourceUid: actor.uid, actions: 1 });
              notes.push("속박 2 · 기절");
            }
            if (count >= 3) {
              const execution = executeUnit(actor, target);
              if (execution) hits.push(execution);
              notes.push("속박 3 · 처형");
            }
          }
        } else if (targetSpeed > actorSpeed) {
          const applied = applyHarmfulStatus(target, "paralysis", { sourceUid: actor.uid });
          notes.push(applied ? `${target.name} 마비` : `${target.name} 마비 면역`);
        } else notes.push("동일 속도 · 상태 없음");
      }
      break;
    }
    case "kind_greeting":
      for (const target of allies) {
        target.attack += 3;
        notes.push(`${target.name} 공격력 +3`);
      }
      break;
    case "moonlight_moment": {
      const multiplier = { crescent: 2, half: 2.5, full: 3 }[actor.lunarPhase] || 1;
      hitOne(selectTarget(actor, skill.id), attack * multiplier);
      notes.push(`${{ crescent: "그믐", half: "반월", full: "만월" }[actor.lunarPhase] || "무상태"} · 공격력 ×${multiplier}`);
      break;
    }
    case "bite": {
      const targets = [...enemies].sort((left, right) => right.slot - left.slot).slice(0, 2);
      for (const target of targets) {
        const hit = hitOne(target, basicDamageFor(actor, target));
        if (hit && !hit.dodged && target.alive) {
          applyHarmfulStatus(target, "bloodScent", { sourceUid: actor.uid, expiresAfterSourceAction: actor.actionsTaken + 1 });
          notes.push(`${target.name} 피냄새`);
        }
      }
      break;
    }
    case "flurry": {
      const repeat = Math.max(0, actor.wild);
      for (let count = 0; count < repeat; count += 1) {
        const candidates = aliveUnits(enemySide(actor.side));
        if (!candidates.length) break;
        const target = candidates[Math.floor(battle.rng() * candidates.length)];
        hitOne(target, basicDamageFor(actor, target));
      }
      notes.push(`야성 ${repeat} · 무작위 공격 ${hits.length}회`);
      break;
    }
    case "memory_barrage": {
      const target = selectTarget(actor, skill.id);
      const repeat = Math.max(0, actor.memory);
      for (let count = 0; count < repeat && target?.alive; count += 1) hitOne(target, basicDamageFor(actor, target));
      const removed = clearMemory(actor);
      notes.push(`암기 ${repeat} 기준 ${hits.length}회 공격 · 암기 ${removed} 제거`);
      break;
    }
    case "all_out_offense": {
      const target = selectTarget(actor, skill.id);
      const gemState = actor.defense > actor.attack;
      hitOne(target, basicDamageFor(actor, target));
      if (gemState) actor.defense += 1;
      else actor.attack += 1;
      notes.push(gemState ? "보석 상태 · 방어력 +1" : "공세 상태 · 공격력 +1");
      break;
    }
    case "beast_slash":
      hitOne(selectTarget(actor, skill.id), attack * 1.3);
      break;
    case "tell_mom": {
      const target = enemies.find(unit => unit.statuses.bullying?.sourceUid === actor.uid);
      if (target && moveToFront(target)) notes.push(`${target.name}을(를) 1번 위치로 이동`);
      else notes.push(target ? `${target.name}은(는) 이미 1번 위치` : "괴롭힘 대상 없음");
      break;
    }
    case "bon_appetit": {
      const target = enemies.find(unit => unit.statuses.swallowed?.sourceUid === actor.uid);
      if (target) {
        applyHarmfulStatus(target, "swallowed", { sourceUid: actor.uid, count: 1 });
        notes.push(`${target.name} 삼킴 ${target.statuses.swallowed.count}`);
        if (target.statuses.swallowed.count >= 4) {
          const execution = executeUnit(actor, target);
          if (execution) hits.push(execution);
          notes.push(`${target.name} 삼킴 4 · 처형`);
        }
      }
      const result = healUnit(actor, actor, Math.floor(actor.maxHp * 0.05));
      if (result.healed || result.shield) notes.push(result.healed ? `HP +${result.healed}` : `보호막 +${result.shield}`);
      break;
    }
    case "charlotte_corday":
      for (const target of enemies.slice(0, 2)) {
        if (!applyHarmfulStatus(target, "deadlyPoison", { sourceUid: actor.uid, count: 1 })) notes.push(`${target.name} 극독 면역`);
        else {
          notes.push(`${target.name} 극독 ${target.statuses.deadlyPoison.count}`);
          if (target.statuses.deadlyPoison.count >= 6) {
            const execution = executeUnit(actor, target);
            if (execution) hits.push(execution);
          }
        }
      }
      break;
    case "diving_attack": {
      const hit = hitOne(selectTarget(actor, skill.id), attack * 2);
      if (hit && !hit.dodged) {
        const gained = addShield(actor, Math.floor(hit.hpDamage * 0.5));
        actor.shieldingDone += gained;
        notes.push(`보호막 +${gained}`);
      }
      break;
    }
    case "squirrel_thunder": {
      const target = selectTarget(actor, skill.id);
      const repeat = Math.max(0, actor.fall);
      for (let count = 0; count < repeat && target?.alive; count += 1) hitOne(target, basicDamageFor(actor, target));
      adjustAllStats(actor, -(repeat * 2));
      notes.push(`낙하 ${repeat} · ${hits.length}회 공격 · 모든 스탯 -${repeat * 2}`);
      break;
    }
    case "last_command": {
      const repeat = Math.max(0, Math.floor(actor.knowledge / 2));
      for (let count = 0; count < repeat && actor.alive; count += 1) {
        hitOne(actor, basicDamageFor(actor, actor));
        for (const target of aliveUnits(enemySide(actor.side)).sort((left, right) => left.slot - right.slot)) hitOne(target, basicDamageFor(actor, target));
      }
      notes.push(`지식 ${actor.knowledge} · 자신과 적 전체 ${repeat}회 공격`);
      break;
    }
    case "blue_blade": {
      const target = selectTarget(actor, skill.id);
      for (let count = 0; count < 2 && target?.alive; count += 1) {
        const hit = hitOne(target, basicDamageFor(actor, target));
        if (hit && !hit.dodged && target.alive) {
          target.defense -= 1;
          notes.push(`${target.name} 방어력 -1`);
        }
      }
      break;
    }
    case "silent_wing":
      for (const target of enemies) notes.push(applyHarmfulStatus(target, "silence", { sourceUid: actor.uid, actions: 1 }) ? `${target.name} 침묵` : `${target.name} 침묵 면역`);
      break;
    default:
      hitOne(selectTarget(actor, skill.id), settings.skillDamage);
      break;
  }
  return { hits, notes };
}

function finishTurn() {
  const label = `T${String(battle.turn).padStart(2, "0")}`;
  const statusMessages = [];
  for (const unit of battle.units.filter(item => item.alive)) {
    if (unit.statuses.poison) {
      const status = unit.statuses.poison;
      const percent = 2 * (2 ** status.stage);
      const source = battle.units.find(item => item.uid === status.sourceUid) || null;
      const result = applyDamage(unit, Math.floor(unit.currentHp * percent / 100), { bypassShield: true });
      status.stage += 1;
      if (source) {
        source.damageDealt += result.hpDamage;
        source.statusDamage += result.hpDamage;
      }
      statusMessages.push(`${unit.name} 독 ${percent}% · HP ${result.hpBefore}→${result.hpAfter}`);
      if (result.knockout) onKnockout(source, unit);
    }
    if (unit.alive && unit.statuses.bleed) {
      const status = unit.statuses.bleed;
      const source = battle.units.find(item => item.uid === status.sourceUid) || null;
      const result = applyDamage(unit, Math.floor(unit.maxHp * 0.05), { bypassShield: true });
      if (source) {
        source.damageDealt += result.hpDamage;
        source.statusDamage += result.hpDamage;
      }
      statusMessages.push(`${unit.name} 출혈 5% · HP ${result.hpBefore}→${result.hpAfter}`);
      if (result.knockout) onKnockout(source, unit);
    }
    if (unit.alive && unit.selfHarm > 0) {
      const result = applyDamage(unit, Math.floor(unit.maxHp * unit.selfHarm * 0.025), { bypassShield: true });
      statusMessages.push(`${unit.name} 자해 ${unit.selfHarm}×2.5% · HP ${result.hpBefore}→${result.hpAfter}${result.nullified ? " · 피해 무효" : ""}`);
      if (result.knockout) onKnockout(null, unit);
    }
    if (unit.alive && unit.statuses.bloodScent) {
      const status = unit.statuses.bloodScent;
      const source = battle.units.find(item => item.uid === status.sourceUid) || null;
      const result = applyDamage(unit, Math.floor(unit.maxHp * 0.05), { bypassShield: true });
      if (source) {
        source.damageDealt += result.hpDamage;
        source.statusDamage += result.hpDamage;
      }
      statusMessages.push(`${unit.name} 피냄새 5% · HP ${result.hpBefore}→${result.hpAfter}${result.nullified ? " · 피해 무효" : ""}`);
      if (result.knockout) onKnockout(source, unit);
    }
  }
  if (statusMessages.length) pushLog({ kind: "status", label, message: statusMessages.join(" / ") });
  if (checkWinner()) return;

  for (const unit of battle.units.filter(item => item.alive && passiveEffect(item).id === "limited_time")) {
    adjustAllStats(unit, -2);
    pushLog({ kind: "passive", label, message: `${unit.name}의 한정된 시간 · 모든 스탯 -2 · HP ${unit.currentHp}/${unit.maxHp} · 공격 ${unit.attack} · 방어 ${unit.defense} · 속도 ${unit.speed}` });
  }

  for (const source of battle.units.filter(item => item.alive && passiveEffect(item).id === "life_affinity")) {
    const healed = [];
    for (const target of aliveUnits(source.side).filter(unit => unit.shield > 0)) {
      const result = healUnit(source, target, Math.floor(target.currentHp * 0.1));
      if (result.healed || result.shield) healed.push(`${target.name} ${result.healed ? `HP +${result.healed}` : `보호막 +${result.shield}`}`);
    }
    if (healed.length) pushLog({ kind: "passive", label, message: `${source.name}의 생명친화 · ${healed.join(" / ")}` });
  }
  for (const unit of battle.units.filter(item => item.alive && passiveEffect(item).id === "red_gem")) {
    [unit.attack, unit.defense] = [unit.defense, unit.attack];
    pushLog({ kind: "passive", label, message: `${unit.name}의 붉은 보석 · 공격력과 방어력 교환 (공격 ${unit.attack} · 방어 ${unit.defense})` });
  }
  pushLog({ kind: "system", label, message: `${battle.turn}턴 종료` });
}

function expireBloodScentAfterAction(actor, notes = []) {
  const expired = [];
  for (const unit of battle.units) {
    const status = unit.statuses.bloodScent;
    if (status?.sourceUid === actor.uid && actor.actionsTaken >= status.expiresAfterSourceAction) {
      delete unit.statuses.bloodScent;
      expired.push(unit.name);
    }
  }
  if (expired.length) notes.push(`피냄새 제거: ${expired.join(", ")}`);
}

function advanceOneAction({ render = true } = {}) {
  if (!battle || battle.status === "ended") return false;
  battle.lastTargetUid = null;
  while (!battle.queue.length) {
    if (battle.turn > 0) {
      finishTurn();
      if (battle.status === "ended") return false;
    }
    if (battle.turn >= settings.maxTurns) {
      finishBattle("draw", `${settings.maxTurns}턴 제한에 도달했습니다.`);
      return false;
    }
    startTurn();
  }

  let actor = null;
  while (battle.queue.length && !actor) {
    const uidValue = battle.queue.shift();
    const candidate = battle.units.find(unit => unit.uid === uidValue);
    if (candidate?.alive) actor = candidate;
  }
  if (!actor) return advanceOneAction({ render });

  battle.currentActorUid = actor.uid;
  battle.actionInTurn += 1;
  actor.actionsTaken += 1;
  const label = `T${battle.turn}.${String(battle.actionInTurn).padStart(2, "0")}`;
  if (actor.statuses.swallowed) {
    pushLog({ kind: "status", side: actor.side, action: "swallowed", label, message: `${actor.name}은(는) 삼킴 ${actor.statuses.swallowed.count} 상태로 행동할 수 없습니다.` });
    if (render) renderAll();
    return true;
  }
  if (passiveEffect(actor).id === "aloof_knowledge" && actor.knowledge <= 29) {
    pushLog({ kind: "passive", side: actor.side, action: "knowledge", label, message: `${actor.name}의 지식 ${actor.knowledge} · 29 이하라 행동하지 않습니다.` });
    if (render) renderAll();
    return true;
  }
  if (actor.statuses.stunActions > 0) {
    actor.statuses.stunActions -= 1;
    const notes = [];
    expireBloodScentAfterAction(actor, notes);
    pushLog({ kind: "status", side: actor.side, action: "stun", label, message: `${actor.name}은(는) 기절로 행동하지 못했습니다.${notes.length ? ` · ${notes.join(" · ")}` : ""}` });
    if (render) renderAll();
    return true;
  }

  const gritBefore = actor.grit;
  const skill = skillEffect(actor);
  const silenced = Number(actor.statuses.silenceActions || 0) > 0;
  const usesSkill = !silenced && skillReady(actor);
  if (silenced) actor.statuses.silenceActions -= 1;
  if (usesSkill) {
    actor.grit -= skillCostFor(actor);
    actor.skillUses += 1;
  } else {
    actor.basicUses += 1;
  }

  const outcome = usesSkill ? executeSkill(actor, skill) : executeBasicAttack(actor);
  const totalHpDamage = outcome.hits.reduce((sum, hit) => sum + hit.hpDamage, 0);
  outcome.notes.push(...afterDirectDamage(actor, totalHpDamage));
  expireBloodScentAfterAction(actor, outcome.notes);
  if (!(usesSkill && skill.noGritGain)) actor.grit += settings.gritGain;
  battle.lastTargetUid = outcome.hits[0]?.target.uid || null;

  const actionName = usesSkill ? skill.name : "기본 공격";
  const hitSummary = outcome.hits.length ? outcome.hits.map(hitText).join(" / ") : "피해 없음";
  const noteSummary = outcome.notes.length ? ` · ${outcome.notes.join(" · ")}` : "";
  const knockout = outcome.hits.some(hit => hit.knockout) || !actor.alive;
  pushLog({
    kind: knockout ? "ko" : usesSkill ? "skill" : "action",
    side: actor.side,
    action: usesSkill ? "skill" : "basic",
    label,
    message: `${actor.name} · ${actionName} · ${hitSummary}${noteSummary} · 투지 ${gritBefore}→${actor.grit}`,
    actor: actor.uid,
    targets: outcome.hits.map(hit => hit.target.uid),
    hpDamage: totalHpDamage,
    gritBefore,
    gritAfter: actor.grit,
    knockout
  });
  checkWinner();
  if (render && battle?.status !== "ended") renderAll();
  return true;
}

function playbackDelay() {
  const speed = Number($("#speed-select").value) || 1;
  return { 1: 720, 2: 360, 4: 150 }[speed] || 720;
}

function startPlayback() {
  if (!battle && !beginBattle()) return;
  if (battle.status === "ended") {
    if (!beginBattle()) return;
  }
  battle.status = "running";
  advanceOneAction();
  if (battle?.status === "running") {
    stopPlayback();
    playTimer = setInterval(() => {
      advanceOneAction();
      if (!battle || battle.status !== "running") stopPlayback();
    }, playbackDelay());
  }
  renderAll();
}

function togglePlayback() {
  if (battle?.status === "running") {
    battle.status = "paused";
    stopPlayback();
    renderAll();
    return;
  }
  startPlayback();
}

function stepBattle() {
  if (!battle && !beginBattle()) return;
  if (battle.status === "ended") return;
  battle.status = "paused";
  stopPlayback();
  advanceOneAction();
}

function addCharacter(id) {
  if (battle) resetBattle({ notify: true });
  if (teams[editingTeam].some(member => member.catalogId === id)) {
    showToast("같은 팀에는 동일 캐릭터를 둘 수 없습니다.");
    return;
  }
  if (teams[editingTeam].length >= 5) {
    showToast(`${teamName(editingTeam)}은 이미 5명입니다.`);
    return;
  }
  teams[editingTeam].push(makeMember(id));
  renderAll();
}

function openEditor(side, index) {
  const member = teams[side][index];
  if (!member) {
    editingTeam = side;
    $$('[data-edit-team]').forEach(button => button.classList.toggle("is-active", button.dataset.editTeam === side));
    renderRoster();
    $("#roster-search").focus();
    showToast(`${teamName(side)}에 추가할 캐릭터를 고르세요.`);
    return;
  }
  currentEditor = { side, index };
  const character = catalogById[member.catalogId];
  const role = roleEffect(character);
  const passive = passiveEffect(character);
  const skill = skillEffect(character);
  const mapped = character.sourceRole !== character.mechanicRole ? `${character.sourceRole} → ${character.mechanicRole} 규칙` : character.sourceRole;
  const pending = (!character.passive || !character.skill) ? `<span class="role-chip role-chip--pending">빈 항목은 임시 규칙 유지</span>` : `<span class="role-chip">리메이크 문서 반영</span>`;
  $("#editor-content").innerHTML = `
    <div class="editor-head"><img src="${character.image}" alt=""><div>
      <span class="eyebrow">${teamName(side)} · 슬롯 ${index + 1}</span>
      <h2>${escapeHtml(character.name)}</h2>
      <p>${escapeHtml(character.species)} · ${character.type} 타입</p>
      <div class="role-chips"><span class="role-chip">${escapeHtml(mapped)}</span>${pending}</div>
    </div></div>
    <div class="editor-stats">
      <label>체력<input data-editor-stat="hp" type="number" min="1" max="99" value="${member.hp}"></label>
      <label>공격력<input data-editor-stat="atk" type="number" min="1" max="99" value="${member.atk}"></label>
      <label>방어력<input data-editor-stat="def" type="number" min="1" max="99" value="${member.def}"></label>
      <label>속도<input data-editor-stat="spd" type="number" min="1" max="99" value="${member.spd}"></label>
      <label>우선도<input data-editor-stat="priority" type="number" min="-99" max="99" value="${member.priority}"></label>
    </div>
    <div id="editor-total" class="editor-total"><span>기본 스탯 합계</span><b>${memberTotal(member)}${settings.enforceStatCap ? " / 25" : ""}</b></div>
    <div class="effect-grid effect-grid--three">
      <div class="effect-card"><span>ROLE</span><strong>${escapeHtml(character.mechanicRole)} · ${escapeHtml(role.name)}</strong><p>${escapeHtml(role.description)}</p></div>
      <div class="effect-card ${passive.implemented === false ? "is-pending" : ""}"><span>PASSIVE</span><strong>${escapeHtml(passive.name)}</strong><p>${escapeHtml(passive.description)}</p></div>
      <div class="effect-card ${skill.provisional ? "is-pending" : ""}"><span>SKILL · 투지 ${skillCostFor(character)}${skill.priority ? ` · 우선도 +${skill.priority}` : ""}</span><strong>${escapeHtml(skill.name)}</strong><p>${escapeHtml(skill.description)}</p></div>
    </div>
    <div class="editor-actions"><div class="editor-actions__group"><button type="button" data-editor-action="left" ${index === 0 ? "disabled" : ""}>← 앞 슬롯</button><button type="button" data-editor-action="right" ${index === teams[side].length - 1 ? "disabled" : ""}>뒤 슬롯 →</button></div><div class="editor-actions__group"><button type="button" data-editor-action="restore">원본 수치</button><button type="button" class="danger-button" data-editor-action="remove">편성 해제</button><button type="button" class="save-button" data-editor-action="save">적용</button></div></div>`;
  $("#editor-dialog").showModal();
}

function editorValues() {
  return Object.fromEntries($$('[data-editor-stat]').map(input => [input.dataset.editorStat, Number(input.value)]));
}

function updateEditorTotal() {
  const values = editorValues();
  const total = [values.hp, values.atk, values.def, values.spd].reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const node = $("#editor-total");
  node.innerHTML = `<span>기본 스탯 합계</span><b>${total}${settings.enforceStatCap ? " / 25" : ""}</b>`;
  node.classList.toggle("is-error", settings.enforceStatCap && total > 25);
}

function editorAction(action) {
  if (!currentEditor) return;
  const { side, index } = currentEditor;
  const member = teams[side][index];
  if (!member) return;
  if (action === "remove") {
    if (teams[side].length <= 1) {
      showToast("팀에는 최소 1명이 필요합니다.");
      return;
    }
    teams[side].splice(index, 1);
    $("#editor-dialog").close();
    resetBattle({ notify: Boolean(battle) });
    return;
  }
  if (action === "left" || action === "right") {
    const target = action === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= teams[side].length) return;
    [teams[side][index], teams[side][target]] = [teams[side][target], teams[side][index]];
    $("#editor-dialog").close();
    resetBattle({ notify: Boolean(battle) });
    return;
  }
  if (action === "restore") {
    const original = catalogById[member.catalogId];
    for (const key of ["hp", "atk", "def", "spd"]) $(`[data-editor-stat="${key}"]`).value = original[key];
    $("[data-editor-stat='priority']").value = 0;
    updateEditorTotal();
    return;
  }
  if (action === "save") {
    const values = editorValues();
    if ([values.hp, values.atk, values.def, values.spd].some(value => !Number.isInteger(value) || value < 1 || value > 99) || !Number.isInteger(values.priority) || values.priority < -99 || values.priority > 99) {
      showToast("능력치는 1~99, 우선도는 -99~99 정수로 입력하세요.");
      return;
    }
    const total = values.hp + values.atk + values.def + values.spd;
    if (settings.enforceStatCap && total > 25) {
      showToast("기본 스탯 합계 25 제한을 초과했습니다.");
      return;
    }
    Object.assign(member, values);
    $("#editor-dialog").close();
    resetBattle({ notify: Boolean(battle) });
  }
}

function renderRules() {
  const rows = [
    ["전투 시퀀스", "스테이지 시작 → 턴 시작 → 공격 시작 → 공격 타격/피격 → 공격 종료 → 턴 종료"],
    ["행동 순서", "턴 시작에 스킬 우선도↓ → 속도↓ → 슬롯↑ → 완전 동률이면 A팀 순으로 고정"],
    ["기본 피해", `max(${settings.minDamage}, floor(공격력 × ${settings.attackFactor} − 방어력))`],
    ["캐릭터 스킬", `각 캐릭터의 투지 요구량 이상이면 자동 사용 · 모든 행동 종료 후 투지 +${settings.gritGain}`],
    ["문서 미정 스킬", `개별 스킬이 비어 있는 캐릭터만 투지 ${settings.skillCost} · 방어 무시 고정 피해 ${settings.skillDamage} 임시 규칙 적용`],
    ["독", "부여된 턴 종료부터 보호막을 무시하고 현재 HP의 2% → 4% → 8% → 16%… 피해 · 재부여 시 중첩/초기화 없음"],
    ["출혈", "부여된 턴 종료부터 보호막을 무시하고 매 턴 최대 HP의 5% 피해 · 재부여 시 중첩 없음"],
    ["자해 / 피냄새", "턴 종료 시 보호막을 무시하고 자해는 중첩당 최대 HP 1%, 피냄새는 최대 HP 2.5% 피해"],
    ["마비", "전투 종료까지 속도를 절반으로 감소 · 중복 부여되어도 한 번만 적용"],
    ["회피 / 필중", "역할군·군체·야성·암기의 회피율을 합산해 최대 100% 적용 · 필중은 모든 회피를 무시"],
    ["체력 스탯", `체력 1은 최대·현재 HP ${settings.hpMultiplier}으로 환산 · 아젤리아의 턴 종료 감소는 HP 10 아래로 내리지 않음`],
    ["정수 처리", "피해·회복·보호막의 소수점은 내림 · 회복은 최대 HP를 초과하지 않음"],
    ["암살자", ROLE_EFFECTS["암살자"].description],
    ["보호자 / 치유자", ROLE_EFFECTS["보호자"].description],
    ["돌격자 / 추격자", ROLE_EFFECTS["돌격자"].description],
    ["결전자", ROLE_EFFECTS["결전자"].description],
    ["교란자", ROLE_EFFECTS["교란자"].description.replace("15%", `${settings.dodgeRate}%`)],
    ["종료", `${settings.maxTurns}턴까지 승패가 없으면 무승부 · HP 0 이하는 즉시 전투불능`],
    ["재현", `난수 시드 ${settings.seed} · 같은 설정과 편성이면 회피와 독 부여 결과가 동일`]
  ];
  $("#rules-content").innerHTML = `<div class="rules-grid">${rows.map(([title, description]) => `<div class="rule-row"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`).join("")}</div>`;
}

function applySetting(input) {
  const key = input.dataset.setting;
  if (input.type === "checkbox") {
    settings[key] = input.checked;
  } else {
    const value = Number(input.value);
    const min = Number(input.min);
    const max = Number(input.max);
    if (!Number.isFinite(value) || value < min || value > max) {
      input.value = settings[key];
      showToast(`${input.closest("label").firstChild.textContent.trim()} 값을 확인하세요.`);
      return;
    }
    settings[key] = value;
  }
  if (battle) resetBattle({ notify: true }); else renderAll();
}

function configureTeamsByIds(teamA, teamB) {
  const validateIds = (ids, label) => {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5) throw new Error(`${label}은 1~5개의 캐릭터 ID 배열이어야 합니다.`);
    if (new Set(ids).size !== ids.length) throw new Error(`${label}에는 같은 캐릭터를 중복할 수 없습니다.`);
    for (const id of ids) if (!catalogById[id]) throw new Error(`알 수 없는 캐릭터 ID: ${id}`);
  };
  validateIds(teamA, "teamA");
  validateIds(teamB, "teamB");
  teams.A = teamA.map(makeMember);
  teams.B = teamB.map(makeMember);
  resetBattle();
  return { A: teamA.map(id => catalogById[id].name), B: teamB.map(id => catalogById[id].name) };
}

function runToEnd() {
  if (!beginBattle()) throw new Error(validateConfiguration());
  battle.status = "paused";
  let guard = settings.maxTurns * 12 + 20;
  while (battle.status !== "ended" && guard-- > 0) advanceOneAction({ render: false });
  renderAll();
  return resultHistory[0];
}

function registerWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const tools = [
    {
      name: "read_battle_state",
      title: "전투 상태 읽기",
      description: "현재 편성, 설정, 턴, 생존자와 최근 결과를 읽습니다.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({
        status: battle?.status || "ready",
        turn: battle?.turn || 0,
        teams: Object.fromEntries(["A", "B"].map(side => [side, teams[side].map(member => member.catalogId)])),
        settings: { ...settings },
        units: battle?.units.map(unit => ({
          id: unit.catalogId,
          name: unit.name,
          side: unit.side,
          slot: unit.slot + 1,
          hp: unit.currentHp,
          maxHp: unit.maxHp,
          shield: unit.shield,
          grit: unit.grit,
          attack: effectiveAttack(unit),
          defense: unit.defense,
          speed: effectiveSpeed(unit),
          charge: unit.charge,
          fullness: unit.fullness,
          statuses: { ...unit.statuses },
          alive: unit.alive
        })) || [],
        recentLogs: battle?.logs.slice(-20).map(entry => ({ label: entry.label, message: entry.message })) || [],
        result: resultHistory[0] || null
      })
    },
    {
      name: "configure_battle_teams",
      title: "전투 팀 편성",
      description: "도감 ID로 A팀과 B팀을 각각 1~5명 편성하고 화면을 갱신합니다.",
      inputSchema: {
        type: "object",
        properties: {
          teamA: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
          teamB: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } }
        },
        required: ["teamA", "teamB"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: input => configureTeamsByIds(input?.teamA, input?.teamB)
    },
    {
      name: "run_battle_to_end",
      title: "전투 끝까지 실행",
      description: "현재 편성과 설정으로 전투를 즉시 끝까지 실행하고 결과를 화면과 JSON으로 반환합니다.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => runToEnd()
    }
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(error => console.warn("WebMCP registration failed", error));
    } catch (error) {
      console.warn("WebMCP unavailable", error);
    }
  }
}

document.addEventListener("click", event => {
  const teamButton = event.target.closest("[data-edit-team]");
  if (teamButton) {
    editingTeam = teamButton.dataset.editTeam;
    $$('[data-edit-team]').forEach(button => button.classList.toggle("is-active", button === teamButton));
    renderRoster();
    return;
  }
  const characterCard = event.target.closest("[data-character]");
  if (characterCard) {
    addCharacter(characterCard.dataset.character);
    return;
  }
  const slot = event.target.closest("[data-edit-slot], [data-open-slot]");
  if (slot) {
    const raw = slot.dataset.editSlot || slot.dataset.openSlot;
    const [side, index] = raw.split(":");
    openEditor(side, Number(index));
    return;
  }
  if (event.target.closest("#start-button")) {
    togglePlayback();
    return;
  }
  if (event.target.closest("#step-button")) {
    stepBattle();
    return;
  }
  if (event.target.closest("#reset-button")) {
    resetBattle();
    return;
  }
  if (event.target.closest("#formula-toggle")) {
    const fields = $("#formula-fields");
    const hidden = fields.hidden;
    fields.hidden = !hidden;
    $("#formula-toggle").textContent = hidden ? "접기" : "펼치기";
    $("#formula-toggle").setAttribute("aria-expanded", String(hidden));
    return;
  }
  if (event.target.closest("#rules-button")) {
    renderRules();
    $("#rules-dialog").showModal();
    return;
  }
  const tab = event.target.closest("[data-analysis-tab]");
  if (tab) {
    activeAnalysisTab = tab.dataset.analysisTab;
    renderAnalysis();
    return;
  }
  const editorButton = event.target.closest("[data-editor-action]");
  if (editorButton) editorAction(editorButton.dataset.editorAction);
});

$("#roster-search").addEventListener("input", renderRoster);
$("#role-filter").addEventListener("change", renderRoster);
$("#formula-fields").addEventListener("change", event => {
  const input = event.target.closest("[data-setting]");
  if (input) applySetting(input);
});
$("#speed-select").addEventListener("change", () => {
  if (battle?.status === "running") {
    stopPlayback();
    playTimer = setInterval(() => {
      advanceOneAction();
      if (!battle || battle.status !== "running") stopPlayback();
    }, playbackDelay());
  }
});
$("#editor-content").addEventListener("input", event => {
  if (event.target.closest("[data-editor-stat]")) updateEditorTotal();
});

renderAll();
registerWebMCP();
