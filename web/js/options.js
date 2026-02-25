// ── Option rendering with iOS cards ───────────────────────

function formatCostDelta(delta) {
  if (delta === 0 || delta === undefined) return { text: '$0', cls: 'cost-zero' };
  if (delta > 0) return { text: `+$${delta}`, cls: 'cost-positive' };
  return { text: `-$${Math.abs(delta)}`, cls: 'cost-negative' };
}

function renderOptions(options) {
  allOptions = options || [];
  applyFiltersAndSort();
}

function applyFiltersAndSort() {
  let opts = [...allOptions];

  if (showRecommendedOnly) {
    opts = opts.filter((o) => o.compatibility >= 0.85 || o.confidence >= 0.85);
  }

  if (currentSort === 'time') {
    opts.sort((a, b) => a.depart.localeCompare(b.depart));
  } else if (currentSort === 'cost') {
    opts.sort((a, b) => (a.costDelta || 0) - (b.costDelta || 0));
  }

  currentOptions = opts;

  // Update tab badge
  const badge = document.getElementById('tabBadgeOptions');
  if (allOptions.length > 0) {
    badge.textContent = allOptions.length;
    badge.classList.add('visible');
  }

  if (currentOptions.length === 0) {
    optionsList.innerHTML = '<div class="options-no-items">No matching options.</div>';
    return;
  }

  optionsList.innerHTML = currentOptions
    .map((o) => {
      const cost = formatCostDelta(o.costDelta);
      const perks = (o.premiumPerks && o.premiumPerks.length > 0)
        ? `<div class="opt-perks">${o.premiumPerks.map(p => `<span class="perk-pill">${p}</span>`).join('')}</div>`
        : '';
      const compatWidth = o.compatibility ? Math.round(o.compatibility * 100) : 0;
      return `
    <div class="option-card ${selectedOptionId === o.optionId ? 'selected' : ''}"
         id="opt-${o.optionId}"
         onclick="selectOption('${o.optionId}')"
         aria-label="Option ${o.rank || o.optionId}: ${o.routing}">
      <div class="opt-rank">${o.rank || o.optionId}</div>
      <div class="opt-selected-check">✓</div>
      <div class="opt-times">
        <span class="opt-time-lg">${o.depart}</span>
        <span class="opt-arrow">→</span>
        <span class="opt-time-lg">${o.arrive}</span>
      </div>
      <div class="opt-route">${o.routing}</div>
      <div class="opt-meta-row">
        <span class="meta-pill class-pill">${o.class || 'Economy'}</span>
        <span class="meta-pill ${cost.cls}">${cost.text}</span>
        <span class="meta-pill stops-pill">${o.stops} stop${o.stops !== 1 ? 's' : ''}</span>
      </div>
      ${o.rationale ? `<div class="opt-rationale">${o.rationale}</div>` : ''}
      ${perks}
      ${compatWidth > 0 ? `<div class="opt-compat-bar"><div class="opt-compat-fill" style="width:${compatWidth}%"></div></div>` : ''}
    </div>
  `;
    })
    .join('');
}

function sortOptions(by) {
  currentSort = by;
  document.getElementById('sortTime').classList.toggle('active', by === 'time');
  document.getElementById('sortCost').classList.toggle('active', by === 'cost');
  document.getElementById('filterRecommended').classList.toggle('active', false);
  if (by !== 'recommended') showRecommendedOnly = false;
  applyFiltersAndSort();
}

function toggleRecommendedFilter() {
  showRecommendedOnly = !showRecommendedOnly;
  document.getElementById('filterRecommended').classList.toggle('active', showRecommendedOnly);
  document.getElementById('sortTime').classList.toggle('active', false);
  document.getElementById('sortCost').classList.toggle('active', false);
  if (showRecommendedOnly) currentSort = 'time';
  applyFiltersAndSort();
}

// Filter pill click handlers
document.getElementById('sortTime').addEventListener('click', () => sortOptions('time'));
document.getElementById('sortCost').addEventListener('click', () => sortOptions('cost'));
document.getElementById('filterRecommended').addEventListener('click', toggleRecommendedFilter);
