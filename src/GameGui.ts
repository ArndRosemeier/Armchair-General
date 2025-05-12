import { Renderer } from './Renderer';
import { Action } from './Action';
import { ActionSpy } from './ActionSpy';
import { ActionFortify } from './ActionFortify';
import { showAmountDialog } from './AmountDialog';
import { ActionAttack } from './ActionAttack';
import { ActionCalculateAttack } from './ActionCalculateAttack';

export class GameGui {
  private state: string;
  private currentGame: any = null;
  private rootContainer: HTMLElement | null = null;

  // List of all clicked country names
  private clickedCountryNames: string[] = [];

  // Cached rendered world map
  private worldMapCanvas: HTMLCanvasElement | null = null;
  private mapDirty: boolean = true;

  // Array of actions
  public actions: Action[];

  constructor() {
    this.state = 'initialized';
    this.actions = [new ActionSpy(), new ActionFortify(), new ActionAttack(), new ActionCalculateAttack()];
  }

  /**
   * Refreshes the country info panel for the last clicked country and forces a redraw of the world map.
   */
  afterAction() {
    // Refresh country info panel for the last clicked country
    if (this.clickedCountryNames.length > 0 && this.currentGame && this.currentGame.worldMap) {
      const lastCountryName = this.clickedCountryNames[this.clickedCountryNames.length - 1];
      const countries = this.currentGame.worldMap.getCountries();
      const clickedCountry = countries.find((c: any) => c.name === lastCountryName);
      if (clickedCountry && this.currentGame.activePlayer && typeof this.currentGame.gameTurn === 'number') {
        const info = this.currentGame.activePlayer.getCountryInfo(clickedCountry, this.currentGame.gameTurn);
        const infoPanel = document.getElementById('country-info-panel');
        if (infoPanel) {
          infoPanel.innerHTML = `
            <b>Country Info</b><br>
            <div><b>Name:</b> ${info.name}</div>
            <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
            <div><b>Income:</b> ${info.income !== undefined ? info.income : '?'}</div>
            <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
            <div><b>Recency:</b> ${info.recency !== undefined ? info.recency : '?'}</div>
          `;
        }
      }
    }
    // Force redraw of the world map
    this.markMapDirty();
    if (this.rootContainer) {
      this.renderMainGui(this.rootContainer, this.currentGame);
      // After re-render, update country info panel for last clicked country
      if (this.clickedCountryNames.length > 0 && this.currentGame && this.currentGame.worldMap) {
        const lastCountryName = this.clickedCountryNames[this.clickedCountryNames.length - 1];
        const countries = this.currentGame.worldMap.getCountries();
        const clickedCountry = countries.find((c: any) => c.name === lastCountryName);
        if (clickedCountry && this.currentGame.activePlayer && typeof this.currentGame.gameTurn === 'number') {
          const info = this.currentGame.activePlayer.getCountryInfo(clickedCountry, this.currentGame.gameTurn);
          const infoPanel = document.getElementById('country-info-panel');
          if (infoPanel) {
            infoPanel.innerHTML = `
              <b>Country Info</b><br>
              <div><b>Name:</b> ${info.name}</div>
              <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
              <div><b>Income:</b> ${info.income !== undefined ? info.income : '?'}</div>
              <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
              <div><b>Recency:</b> ${info.recency !== undefined ? info.recency : '?'}</div>
            `;
          }
        }
      }
    }
    this.updateActionButtons();
  }

  /**
   * Updates the action buttons area at the bottom of the sidebar based on current actions and clicked countries.
   */
  updateActionButtons() {
    const actionsDiv = document.getElementById('action-buttons-area');
    if (!actionsDiv) return;
    // Remove only previously generated action buttons, keep persistent ones
    const persistentButtons: HTMLElement[] = [];
    Array.from(actionsDiv.children).forEach(child => {
      if (!(child instanceof HTMLElement)) return;
      if (child.classList.contains('persistent-action-btn')) {
        persistentButtons.push(child);
      } else {
        actionsDiv.removeChild(child);
      }
    });
    if (!this.currentGame || !this.currentGame.players || !this.currentGame.activePlayer) return;
    const countries = this.currentGame.worldMap ? this.currentGame.worldMap.getCountries() : [];
    // Get clicked country objects by name
    const clickedCountries = this.clickedCountryNames.map(name => countries.find((c: any) => c.name === name)).filter(Boolean);
    // Create dynamic action buttons
    const dynamicButtons: HTMLElement[] = [];
    for (const action of this.actions) {
      const buttonText = action.GetButtonText(clickedCountries, this.currentGame.activePlayer);
      if (buttonText) {
        const btn = document.createElement('button');
        btn.textContent = buttonText;
        btn.style.padding = '12px 0';
        btn.style.fontSize = '1.1rem';
        btn.style.background = 'linear-gradient(90deg,#00c3ff 0%,#ffff1c 100%)';
        btn.style.color = '#222';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
        btn.style.marginBottom = '8px';
        btn.onclick = async () => {
          const amountRange = action.RequiresAmount(clickedCountries);
          let result: string | null = null;
          if (amountRange) {
            const [min, max] = amountRange;
            const selected = await showAmountDialog(min, max, min);
            if (selected === null) return; // Cancelled
            result = action.Act(clickedCountries, this.currentGame.activePlayer, this.currentGame, selected);
          } else {
            result = action.Act(clickedCountries, this.currentGame.activePlayer, this.currentGame);
          }
          if (typeof result === 'string' && result !== null) {
            this.showModalMessage(result);
            this.afterAction();
          } else {
            this.afterAction();
          }
        };

        dynamicButtons.push(btn);
      }
    }
    // Insert dynamic buttons above persistent ones
    if (dynamicButtons.length && persistentButtons.length) {
      // Add a gap before persistent buttons
      const gap = document.createElement('div');
      gap.style.height = '16px';
      gap.style.width = '100%';
      actionsDiv.insertBefore(gap, persistentButtons[0]);
      dynamicButtons.forEach(btn => actionsDiv.insertBefore(btn, gap));
    } else if (dynamicButtons.length) {
      dynamicButtons.forEach(btn => actionsDiv.appendChild(btn));
    }
  }

  /**
   * Shows a modal messagebox with the given message.
   */
  showModalMessage(message: string) {
    let modal = document.getElementById('gamegui-modal-messagebox');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gamegui-modal-messagebox';
      modal.style.position = 'fixed';
      modal.style.left = '0';
      modal.style.top = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.5)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '9999';
      const box = document.createElement('div');
      box.style.background = '#fff';
      box.style.padding = '32px 40px';
      box.style.borderRadius = '12px';
      box.style.boxShadow = '0 2px 16px rgba(0,0,0,0.2)';
      box.style.maxWidth = '90vw';
      box.style.maxHeight = '80vh';
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.alignItems = 'center';
      box.style.gap = '24px';
      const msgElem = document.createElement('div');
      msgElem.id = 'gamegui-modal-messagebox-text';
      msgElem.style.fontSize = '1.2rem';
      msgElem.style.color = '#222';
      box.appendChild(msgElem);
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'OK';
      closeBtn.style.marginTop = '12px';
      closeBtn.style.padding = '8px 24px';
      closeBtn.style.fontSize = '1.1rem';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '6px';
      closeBtn.style.background = 'linear-gradient(90deg,#ff9966 0%,#ff5e62 100%)';
      closeBtn.style.color = '#fff';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = () => {
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
      };
      box.appendChild(closeBtn);
      modal.appendChild(box);
      document.body.appendChild(modal);
    }
    const msgElem = document.getElementById('gamegui-modal-messagebox-text');
    if (msgElem) msgElem.textContent = message;
    modal.style.display = 'flex';
  }

  /**
   * Mark the cached world map as dirty (needs re-render).
   */
  markMapDirty() {
    this.mapDirty = true;
  }

  /**
   * Get the cached or newly rendered world map canvas.
   * If dirty, re-render using Renderer and cache.
   */
  getWorldMapCanvas(): HTMLCanvasElement | null {
    if (!this.currentGame || !this.currentGame.worldMap) return null;
    if (this.mapDirty || !this.worldMapCanvas) {
      this.worldMapCanvas = Renderer.render(this.currentGame.worldMap);
      this.mapDirty = false;
    }
    return this.worldMapCanvas;
  }

  private _onResize = () => {
    this.markMapDirty();
    if (this.rootContainer) {
      this.renderMainGui(this.rootContainer, this.currentGame);
    }
  };

  async mount(container: HTMLElement) {
    this.rootContainer = container;
    window.addEventListener('resize', this._onResize);
    // Render the main GUI with a placeholder (no game yet)
    this.renderMainGui(container, this.currentGame);
  }

  unmount() {
    window.removeEventListener('resize', this._onResize);
  }

  async startNewGame() {
    // Always use the root container for the dialog
    const container = this.rootContainer!;
    const { showNewGameDialog } = await import('./NewGameDialog');
    try {
      const result = await showNewGameDialog(container);
      // Dynamically import Player and Game modules
      const PlayerMod = await import('./Player');
      const GameMod = await import('./Game');
      // Use Player.COLORS or fallback
      const defaultColors = ['#4fc3f7','#81c784','#ffb74d','#e57373','#ba68c8','#ffd54f','#64b5f6','#a1887f'];
      const colorArr = PlayerMod.Player.COLORS ?? defaultColors;
      const playerObjs = result.players.map((p, i) => new PlayerMod.Player(
        p.name,
        colorArr[i % colorArr.length],
        [],
        null,
        [],
        0,
        p.isAI
      ));
      this.currentGame = GameMod.Game.initNewGame(result.map, playerObjs);
      this.markMapDirty();
      this.getWorldMapCanvas(); // Render and cache the map after game start
      this.renderMainGui(container, this.currentGame);
    } catch (err) {
      console.error('NewGameDialog error or cancellation:', err);
    }
  }

  renderMainGui(_container: HTMLElement, game: any) {
    // Defensive check removed: trust rootContainer is always set
    const container = this.rootContainer;
    if (!container) {
      throw new Error("rootContainer is not set (null) in renderMainGui");
    }
    container.innerHTML = '';
    // Main wrapper
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.background = 'linear-gradient(120deg, #232526 0%, #414345 100%)';
    wrapper.style.borderRadius = '0';
    wrapper.style.boxShadow = 'none';
    wrapper.style.overflow = 'hidden';
    wrapper.style.margin = '0';
    wrapper.style.maxWidth = '100vw';

    // Left: Map area
    const mapArea = document.createElement('div');
    mapArea.style.flex = '3';
    mapArea.style.background = '#222';
    mapArea.style.display = 'flex';
    mapArea.style.alignItems = 'center';
    mapArea.style.justifyContent = 'center';
    mapArea.style.position = 'relative';
    mapArea.style.borderRight = '2px solid #333';
    // Rendered map or placeholder
    let mapCanvas = null;
    if (game && game.worldMap) {
      mapCanvas = this.getWorldMapCanvas();
    }
    // Track clicked country names (persistent across renders)
    if (!this.clickedCountryNames) {
      this.clickedCountryNames = [];
    }
    // Panel for displaying clicked country names
    const clickedPanel = document.createElement('div');
    clickedPanel.style.background = '#181b1f';
    clickedPanel.style.border = '1px solid #444';
    clickedPanel.style.borderRadius = '8px';
    clickedPanel.style.padding = '10px 12px';
    clickedPanel.style.marginBottom = '18px';
    clickedPanel.style.color = '#ffe082';
    clickedPanel.style.fontSize = '1.05rem';
    clickedPanel.style.maxHeight = '120px';
    clickedPanel.style.overflowY = 'auto';
    clickedPanel.innerHTML = '<b>Clicked Countries:</b><br><span id="clicked-country-list">(none)</span>';

    // Panel for displaying country info
    const countryInfoPanel = document.createElement('div');
    countryInfoPanel.id = 'country-info-panel';
    countryInfoPanel.style.background = '#22232a';
    countryInfoPanel.style.border = '1px solid #555';
    countryInfoPanel.style.borderRadius = '8px';
    countryInfoPanel.style.padding = '10px 12px';
    countryInfoPanel.style.marginBottom = '18px';
    countryInfoPanel.style.color = '#b3e5fc';
    countryInfoPanel.style.fontSize = '1.05rem';
    countryInfoPanel.style.minHeight = '100px';
    countryInfoPanel.innerHTML = '<b>Country Info</b><br><span style="color:#888">Click a country to view details.</span>';


    if (mapCanvas) {
      // Only set style width/height for display scaling
      mapCanvas.style.width = '100%';
      mapCanvas.style.height = '100%';
      mapCanvas.style.display = 'block';
      mapArea.appendChild(mapCanvas);
      // Add mouse click detection
      if (game && game.worldMap) {
        mapCanvas.addEventListener('mousedown', (e: MouseEvent) => {
          const mapWidth = mapCanvas.width;
          const mapHeight = mapCanvas.height;
          // Use offsetX/Y and scale by client size for accuracy
          const x = Math.floor(e.offsetX * (mapWidth / mapCanvas.clientWidth));
          const y = Math.floor(e.offsetY * (mapHeight / mapCanvas.clientHeight));
          const map = game.worldMap.getMap();
          const countries = game.worldMap.getCountries();
          let clickedCountry = null;
          if (x >= 0 && y >= 0 && y < map.length && x < map[0].length) {
            const value = map[y][x];
            if (value >= 0 && countries[value]) {
              clickedCountry = countries[value];
              // Counter check: is (x, y) in clickedCountry.coordinates?
              if (!clickedCountry.coordinates.some(([cx, cy]: [number, number]) => cx === x && cy === y)) {
                console.warn(`[GameGui] Click at (${x},${y}) is not in coordinates of country: ${clickedCountry.name}`);
              }
              this.clickedCountryNames.push(clickedCountry.name);
              // Update the panel
              const listElem = document.getElementById('clicked-country-list');
              if (listElem) {
                listElem.innerHTML = this.clickedCountryNames.map((n: string) => `<div>${n}</div>`).join('');
              }
              // Update action buttons
              this.updateActionButtons();
              // Show country info in sidebar
              const infoPanel = document.getElementById('country-info-panel');
              if (infoPanel && game && game.activePlayer && typeof game.gameTurn === 'number') {
                const info = game.activePlayer.getCountryInfo(clickedCountry, game.gameTurn);
                infoPanel.innerHTML = `
                  <b>Country Info</b><br>
                  <div><b>Name:</b> ${info.name}</div>
                  <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
                  <div><b>Income:</b> ${info.income !== undefined ? info.income : '?'}</div>
                  <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
                  <div><b>Recency:</b> ${info.recency !== undefined ? info.recency : '?'}</div>
                `;
              }
              // Show last clicked country info in sidebar
              const lastClickedCountryInfoPanel = document.getElementById('last-clicked-country-info-panel');
              if (lastClickedCountryInfoPanel && game && game.activePlayer && typeof game.gameTurn === 'number') {
                const info = game.activePlayer.getCountryInfo(clickedCountry, game.gameTurn);
                lastClickedCountryInfoPanel.innerHTML = `
                  <b>Last Clicked Country Info</b><br>
                  <div><b>Name:</b> ${info.name}</div>
                  <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
                  <div><b>Income:</b> ${info.income !== undefined ? info.income : '?'}</div>
                  <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
                  <div><b>Recency:</b> ${info.recency !== undefined ? info.recency : '?'}</div>
                `;
              }
            } 
          }
        });
      }
    } else {
      const mapPlaceholder = document.createElement('div');
      mapPlaceholder.style.width = '100%';
      mapPlaceholder.style.height = '100%';
      mapPlaceholder.style.background = 'repeating-linear-gradient(135deg,#444 0 10px,#333 10px 20px)';
      mapPlaceholder.style.border = '4px solid #666';
      mapPlaceholder.style.borderRadius = '12px';
      mapPlaceholder.style.display = 'flex';
      mapPlaceholder.style.alignItems = 'center';
      mapPlaceholder.style.justifyContent = 'center';
      mapPlaceholder.style.color = '#bbb';
      mapPlaceholder.style.fontSize = '2rem';
      mapPlaceholder.textContent = 'World Map';
      mapArea.appendChild(mapPlaceholder);
    }

    // Right: Sidebar
    const sidebar = document.createElement('div');
    // Add clicked countries panel at the top of the sidebar
    sidebar.appendChild(clickedPanel);
    // Add country info panel below
    sidebar.appendChild(countryInfoPanel);
    // On initial render, fill panel with any previously clicked countries
    setTimeout(() => {
      const listElem = document.getElementById('clicked-country-list');
      if (listElem) {
        listElem.innerHTML = this.clickedCountryNames.length
          ? this.clickedCountryNames.map((n: string) => `<div>${n}</div>`).join('')
          : '(none)';
      }
    }, 0);

    sidebar.style.flex = '1';
    sidebar.style.background = 'rgba(30,32,34,0.98)';
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.padding = '32px 24px';
    sidebar.style.color = '#fff';
    sidebar.style.minWidth = '320px';

    // Game Info
    const gameInfo = document.createElement('div');
    gameInfo.style.marginBottom = '32px';
    const turnInfo = document.createElement('div');
    turnInfo.style.fontSize = '1.2rem';
    turnInfo.style.fontWeight = 'bold';
    if (game && game.players && game.players.length > 0) {
      const activePlayer = game.activePlayer;
      turnInfo.textContent = `Turn: ${game.gameTurn} | Player: ${activePlayer.name}`;
    } else {
      turnInfo.textContent = 'No game loaded. Start a new game to play!';
    }
    gameInfo.appendChild(turnInfo);
    sidebar.appendChild(gameInfo);

    // Player list (only after game is started)
    if (game && game.players && game.players.length > 0) {
      const playerListTitle = document.createElement('div');
      playerListTitle.textContent = 'Players';
      playerListTitle.style.fontWeight = 'bold';
      playerListTitle.style.marginBottom = '8px';
      sidebar.appendChild(playerListTitle);

      const playerList = document.createElement('ul');
      playerList.style.listStyle = 'none';
      playerList.style.padding = '0';
      playerList.style.margin = '0 0 24px 0';
      for (const player of game.players) {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.marginBottom = '8px';
        const colorDot = document.createElement('span');
        colorDot.style.display = 'inline-block';
        colorDot.style.width = '16px';
        colorDot.style.height = '16px';
        colorDot.style.borderRadius = '50%';
        colorDot.style.background = player.color;
        colorDot.style.marginRight = '8px';
        li.appendChild(colorDot);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name + (player.isAI ? ' (AI)' : '');
        nameSpan.style.flex = '1';
        li.appendChild(nameSpan);
        // If player has a money property, show it
        if (typeof player.money === 'number') {
          const moneySpan = document.createElement('span');
          moneySpan.textContent = `💰 ${player.money}`;
          moneySpan.style.marginLeft = '8px';
          li.appendChild(moneySpan);
        }
        playerList.appendChild(li);
      }
      sidebar.appendChild(playerList);
    }


    // Action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.id = 'action-buttons-area';
    actionsDiv.style.display = 'flex';
    actionsDiv.style.flexDirection = 'column';
    actionsDiv.style.gap = '12px';
    actionsDiv.style.marginTop = 'auto';

    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = 'New Game';
    newGameBtn.classList.add('persistent-action-btn');
    newGameBtn.style.padding = '12px 0';
    newGameBtn.style.fontSize = '1.1rem';
    newGameBtn.style.background = 'linear-gradient(90deg,#00c3ff 0%,#ffff1c 100%)';
    newGameBtn.style.color = '#222';
    newGameBtn.style.border = 'none';
    newGameBtn.style.borderRadius = '8px';
    newGameBtn.style.cursor = 'pointer';
    newGameBtn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    newGameBtn.style.marginBottom = '8px';
    newGameBtn.onclick = () => {
      this.startNewGame();
    };
    actionsDiv.appendChild(newGameBtn);

    const endTurnBtn = document.createElement('button');
    endTurnBtn.textContent = 'End Turn';
    endTurnBtn.classList.add('persistent-action-btn');
    endTurnBtn.style.padding = '12px 0';
    endTurnBtn.style.fontSize = '1.1rem';
    endTurnBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    endTurnBtn.style.color = '#fff';
    endTurnBtn.style.border = 'none';
    endTurnBtn.style.borderRadius = '8px';
    endTurnBtn.style.cursor = 'pointer';
    endTurnBtn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    actionsDiv.appendChild(endTurnBtn);

    sidebar.appendChild(actionsDiv);

    // Assemble
    wrapper.appendChild(mapArea);
    wrapper.appendChild(sidebar);
    container.appendChild(wrapper);
  }
}
