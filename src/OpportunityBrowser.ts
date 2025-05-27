import { Player } from './Player';
import { OpportunityHistoryEntry } from './Player';

export class OpportunityBrowser {
  private container: HTMLElement;
  private players: Player[];
  private selectedPlayer: Player | null = null;
  private selectedTurn: number | 'all' = 'all';
  private overlay: HTMLElement | null = null;

  constructor(players: Player[]) {
    this.players = players.filter(p => p.isAI);
    this.container = document.createElement('div');
    this.container.style.padding = '24px 24px 24px 24px';
    this.container.style.background = '#232526';
    this.container.style.color = '#fff';
    this.container.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    this.container.style.overflow = 'auto';
    this.container.style.maxHeight = '90vh';
    this.container.style.width = '80vw';
    this.container.style.maxWidth = '80vw';
    this.container.style.borderRadius = '12px';
    this.container.style.boxShadow = '0 2px 16px #0008';
    this.container.style.zIndex = '10001';
    this.container.style.position = 'relative';
  }

  mount(parent: HTMLElement) {
    // Make a sticky header for controls
    const header = document.createElement('div');
    header.style.position = 'sticky';
    header.style.top = '0';
    header.style.background = '#232526';
    header.style.zIndex = '10002';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '0 0 12px 0';
    // Player selector
    const selectorDiv = this.renderPlayerSelector();
    header.appendChild(selectorDiv);
    // Turn selector
    const turnSelectorDiv = this.renderTurnSelector();
    header.appendChild(turnSelectorDiv);
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    closeBtn.style.fontSize = '2.2em';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#ffd700';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.marginLeft = '18px';
    closeBtn.style.marginRight = '8px';
    closeBtn.onclick = () => {
      if (this.overlay) this.overlay.remove();
      else this.container.remove();
    };
    header.appendChild(closeBtn);
    // Clear container and add header
    this.container.innerHTML = '';
    this.container.appendChild(header);
    parent.appendChild(this.container);
    // For overlay close
    if (parent.id === 'opportunity-browser-overlay') {
      this.overlay = parent;
    }
    if (this.players.length > 0) {
      this.selectPlayer(this.players[0]);
    }
  }

  renderPlayerSelector(): HTMLElement {
    const selectorDiv = document.createElement('div');
    selectorDiv.style.display = 'flex';
    selectorDiv.style.gap = '12px';
    selectorDiv.style.alignItems = 'center';
    const label = document.createElement('span');
    label.textContent = 'Select AI Player:';
    label.style.fontWeight = 'bold';
    selectorDiv.appendChild(label);
    const select = document.createElement('select');
    for (const player of this.players) {
      const option = document.createElement('option');
      option.value = player.name;
      option.textContent = player.name;
      select.appendChild(option);
    }
    select.onchange = () => {
      const player = this.players.find(p => p.name === select.value);
      if (player) this.selectPlayer(player);
    };
    selectorDiv.appendChild(select);
    return selectorDiv;
  }

  renderTurnSelector(): HTMLElement {
    const turnDiv = document.createElement('div');
    turnDiv.style.display = 'flex';
    turnDiv.style.gap = '8px';
    turnDiv.style.alignItems = 'center';
    const label = document.createElement('span');
    label.textContent = 'Game Turn:';
    label.style.fontWeight = 'bold';
    turnDiv.appendChild(label);
    const select = document.createElement('select');
    select.style.minWidth = '60px';
    select.style.fontSize = '1em';
    select.style.marginRight = '8px';
    select.onchange = () => {
      this.selectedTurn = select.value === 'all' ? 'all' : parseInt(select.value);
      this.renderTable();
    };
    // Will be filled in renderTable
    this._turnSelect = select;
    turnDiv.appendChild(select);
    return turnDiv;
  }

  private _turnSelect: HTMLSelectElement | null = null;

  selectPlayer(player: Player) {
    this.selectedPlayer = player;
    this.renderTable();
  }

  renderTable() {
    // Remove old table if any
    const oldTable = this.container.querySelector('table');
    if (oldTable) oldTable.remove();
    if (!this.selectedPlayer) return;
    const history = this.selectedPlayer.OpportunityHistory;
    // Get all game turns
    const allTurns = Array.from(new Set(history.map(e => e.gameTurn))).sort((a, b) => a - b);
    // Update turn selector
    if (this._turnSelect) {
      this._turnSelect.innerHTML = '';
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = 'All';
      this._turnSelect.appendChild(allOpt);
      for (const turn of allTurns) {
        const opt = document.createElement('option');
        opt.value = String(turn);
        opt.textContent = String(turn);
        if (this.selectedTurn === turn) opt.selected = true;
        this._turnSelect.appendChild(opt);
      }
      if (this.selectedTurn !== 'all' && !allTurns.includes(this.selectedTurn as number)) {
        this.selectedTurn = 'all';
      }
    }
    // Filter by selected turn
    const filtered = this.selectedTurn === 'all'
      ? history
      : history.filter(e => e.gameTurn === this.selectedTurn);
    // Group by gameTurn and actionNumber
    const grouped: Record<string, OpportunityHistoryEntry[]> = {};
    for (const entry of filtered) {
      const key = `${entry.gameTurn}-${entry.actionNumber}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    }
    // Sort keys by gameTurn, then actionNumber
    const keys = Object.keys(grouped).sort((a, b) => {
      const [turnA, actA] = a.split('-').map(Number);
      const [turnB, actB] = b.split('-').map(Number);
      if (turnA !== turnB) return turnA - turnB;
      return actA - actB;
    });
    // Build table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.background = '#333';
    table.style.marginTop = '12px';
    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const h of ['Game Turn', 'Action #', 'Action', 'Countries', 'Amount', 'Score']) {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.padding = '8px 12px';
      th.style.background = '#444';
      th.style.color = '#ffd700';
      th.style.fontWeight = 'bold';
      th.style.borderBottom = '2px solid #ffd700';
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    // Body
    const tbody = document.createElement('tbody');
    for (const key of keys) {
      const group = grouped[key].slice().sort((a, b) => b.opportunity.score - a.opportunity.score);
      let maxScore = group.length > 0 ? group[0].opportunity.score : null;
      for (const entry of group) {
        const tr = document.createElement('tr');
        if (entry.opportunity.score === maxScore) {
          tr.style.background = 'linear-gradient(90deg,#ffd70022,#fffbe622)';
          tr.style.fontWeight = 'bold';
        } else {
          tr.style.background = '#232526';
        }
        for (const val of [
          entry.gameTurn,
          entry.actionNumber,
          entry.opportunity.action?.Type?.() ?? '',
          entry.opportunity.countries?.map((c: any) => c.name).join(', '),
          entry.opportunity.amount,
          entry.opportunity.score
        ]) {
          const td = document.createElement('td');
          td.textContent = String(val ?? '');
          td.style.padding = '6px 10px';
          td.style.borderBottom = '1px solid #444';
          td.style.textAlign = 'center';
          tbody.appendChild(tr);
          tr.appendChild(td);
        }
      }
    }
    table.appendChild(tbody);
    this.container.appendChild(table);
  }
} 