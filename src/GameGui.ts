import { Renderer } from './Renderer';

export class GameGui {
  private state: string;
  private currentGame: any = null;
  private rootContainer: HTMLElement | null = null;

  // List of all clicked country names
  private clickedCountryNames: string[] = [];

  // Cached rendered world map
  private worldMapCanvas: HTMLCanvasElement | null = null;
  private mapDirty: boolean = true;

  constructor() {
    this.state = 'initialized';
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
              this.clickedCountryNames.push(clickedCountry.name);
              // Update the panel
              const listElem = document.getElementById('clicked-country-list');
              if (listElem) {
                listElem.innerHTML = this.clickedCountryNames.map((n: string) => `<div>${n}</div>`).join('');
              }
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
              console.log('[GameGui] Clicked country:', clickedCountry.name);
            } else {
              console.log('[GameGui] No country at click.');
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
    actionsDiv.style.display = 'flex';
    actionsDiv.style.flexDirection = 'column';
    actionsDiv.style.gap = '12px';
    actionsDiv.style.marginTop = 'auto';

    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = 'New Game';
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
