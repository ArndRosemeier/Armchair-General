import { Game } from './Game';
import { Player } from './Player';
import { GameGui } from './GameGui';

export function showActionLogDialog(game: Game) {
  // Remove any existing dialog
  let existing = document.getElementById('action-log-dialog');
  if (existing) existing.remove();

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'action-log-dialog';
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.6)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '99999';

  // Pause the game while dialog is open
  GameGui.getInstance()?.pauseGame();

  // Dialog box
  const dialog = document.createElement('div');
  dialog.style.background = '#fff';
  dialog.style.width = '100vw';
  dialog.style.height = '100vh';
  dialog.style.padding = '0';
  dialog.style.borderRadius = '0';
  dialog.style.boxShadow = 'none';
  dialog.style.maxWidth = '100vw';
  dialog.style.maxHeight = '100vh';
  dialog.style.display = 'flex';
  dialog.style.flexDirection = 'column';
  dialog.style.alignItems = 'stretch';
  dialog.style.gap = '0';
  dialog.style.overflow = 'hidden';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.alignSelf = 'flex-end';
  closeBtn.style.margin = '16px 24px 0 0';
  closeBtn.style.padding = '10px 32px';
  closeBtn.style.fontSize = '1.2rem';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.background = 'linear-gradient(90deg,#ff9966 0%,#ff5e62 100%)';
  closeBtn.style.color = '#fff';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    GameGui.getInstance()?.resumeGame();
    overlay.remove();
    // If only AI players are present, resume AI loop
    const gui = GameGui.getInstance();
    if (gui && gui.currentGame && !gui.canceled && gui.currentGame.activePlayer?.isAI) {
      setTimeout(() => gui.turnStarted(), 0);
    }
  };
  dialog.appendChild(closeBtn);

  // Controls container
  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.flexDirection = 'row';
  controls.style.alignItems = 'center';
  controls.style.gap = '16px';
  controls.style.padding = '24px 32px 8px 32px';
  controls.style.background = '#f5f5f5';

  // Player selector
  const playerSelect = document.createElement('select');
  playerSelect.style.fontSize = '1.1rem';
  playerSelect.style.padding = '6px 12px';
  for (const player of game.players) {
    const opt = document.createElement('option');
    opt.value = player.name;
    opt.textContent = player.name + (player.isAI ? ' (AI)' : '');
    playerSelect.appendChild(opt);
  }
  controls.appendChild(playerSelect);

  // Filter input
  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = 'Filter (wildcard, all fields)';
  filterInput.style.fontSize = '1.1rem';
  filterInput.style.padding = '6px 12px';
  filterInput.style.borderRadius = '6px';
  filterInput.style.border = '1px solid #aaa';
  controls.appendChild(filterInput);

  dialog.appendChild(controls);

  // Table container
  const tableContainer = document.createElement('div');
  tableContainer.style.overflow = 'auto';
  tableContainer.style.flex = '1';
  tableContainer.style.padding = '0 32px 32px 32px';
  tableContainer.style.background = '#fff';
  dialog.appendChild(tableContainer);

  function renderTable(player: Player, filter: string) {
    tableContainer.innerHTML = '';
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '1.05rem';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const field of ['#', 'Action', 'Countries', 'Amount', 'Result']) {
      const th = document.createElement('th');
      th.textContent = field;
      th.style.borderBottom = '2px solid #888';
      th.style.padding = '8px 12px';
      th.style.background = '#eee';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    let entries = player.actionLog;
    if (filter.trim()) {
      const f = filter.trim().toLowerCase();
      entries = entries.filter(entry => {
        return (
          entry.actionType.toLowerCase().includes(f) ||
          entry.countries.map(c => c.name).join(',').toLowerCase().includes(f) ||
          ('' + entry.amount).includes(f) ||
          (entry.result ? entry.result.toLowerCase() : '').includes(f)
        );
      });
    }
    entries.forEach((entry, i) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #ddd';
      const tdIdx = document.createElement('td');
      tdIdx.textContent = (i + 1).toString();
      tdIdx.style.padding = '6px 12px';
      tr.appendChild(tdIdx);
      const tdType = document.createElement('td');
      tdType.textContent = entry.actionType;
      tdType.style.padding = '6px 12px';
      tr.appendChild(tdType);
      const tdCountries = document.createElement('td');
      tdCountries.textContent = entry.countries.map(c => c.name).join(', ');
      tdCountries.style.padding = '6px 12px';
      tr.appendChild(tdCountries);
      const tdAmount = document.createElement('td');
      tdAmount.textContent = entry.amount.toString();
      tdAmount.style.padding = '6px 12px';
      tr.appendChild(tdAmount);
      const tdResult = document.createElement('td');
      tdResult.textContent = entry.result ?? '';
      tdResult.style.padding = '6px 12px';
      tr.appendChild(tdResult);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }

  // Initial render
  let selectedPlayer = game.players[0];
  renderTable(selectedPlayer, '');

  playerSelect.onchange = () => {
    selectedPlayer = game.players.find(p => p.name === playerSelect.value) || game.players[0];
    renderTable(selectedPlayer, filterInput.value);
  };
  filterInput.oninput = () => {
    renderTable(selectedPlayer, filterInput.value);
  };

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
} 