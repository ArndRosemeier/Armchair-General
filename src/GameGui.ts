import { Renderer } from './Renderer';
import { Action } from './Action';
import { ActionSpy } from './ActionSpy';
import { ActionFortify } from './ActionFortify';
import { showAmountDialog } from './AmountDialog';
import { ActionAttack } from './ActionAttack';
import { ActionCalculateAttack } from './ActionCalculateAttack';
import { ActionMove } from './ActionMove';
import { ActionBuyArmies } from './ActionBuyArmies';
import { Game } from './Game';
import { showWinDialog } from './WinDialog';
import { FishOverlay } from './FishOverlay';
import { OCEAN } from './WorldMap';
import { showActionLogDialog } from './ActionLogDialog';
import { Serializer } from './Serializer';

export class GameGui {
  private state: string;
  public currentGame: any = null;
  private rootContainer: HTMLElement | null = null;
  public canceled: boolean = false;
  private paused: boolean = false;

  // List of all clicked country names
  private clickedCountryNames: string[] = [];

  // Cached rendered world map
  private worldMapCanvas: HTMLCanvasElement | null = null;
  private mapDirty: boolean = true;

  // Array of actions
  public actions: Action[];

  private fishOverlay: any = null;

  // --- PAUSE/RESUME API ---
  public pauseGame() {
    this.paused = true;
    // Try to find FishOverlay if not already referenced
    if (!this.fishOverlay) {
      const mapArea = document.querySelector('div[style*="flex: 3"]');
      if (mapArea && (mapArea as any)._fishOverlay) {
        this.fishOverlay = (mapArea as any)._fishOverlay;
      }
    }
    if (this.fishOverlay && typeof this.fishOverlay.stop === 'function') {
      console.log('Pausing FishOverlay', this.fishOverlay);
      this.fishOverlay.stop();
    } else {
      console.log('No FishOverlay to pause');
    }
  }
  public resumeGame() {
    this.paused = false;
    // Try to find FishOverlay if not already referenced
    if (!this.fishOverlay) {
      const mapArea = document.querySelector('div[style*="flex: 3"]');
      if (mapArea && (mapArea as any)._fishOverlay) {
        this.fishOverlay = (mapArea as any)._fishOverlay;
      }
    }
    if (this.fishOverlay && typeof this.fishOverlay.resume === 'function') {
      console.log('Resuming FishOverlay', this.fishOverlay);
      this.fishOverlay.resume();
    } else {
      console.log('No FishOverlay to resume');
    }
  }
  public isPaused() {
    return this.paused;
  }
  private static _instance: GameGui | null = null;
  public static getInstance(): GameGui | null {
    return GameGui._instance;
  }

  constructor() {
    this.state = 'initialized';
    this.actions = [new ActionSpy(), new ActionFortify(), new ActionAttack(), new ActionCalculateAttack(), new ActionMove(), new ActionBuyArmies()];
    GameGui._instance = this;
    // Add F9 key listener for action log
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F9') {
        if (this.currentGame) {
          showActionLogDialog(this.currentGame);
        }
      }
      if (e.key === 'F8') {
        // Show win dialog with current player as winner
        // @ts-ignore
        import('./WinDialog').then(mod => {
          const playerName = this.currentGame?.activePlayer?.name || 'Player';
          mod.showWinDialog(playerName, 100);
        });
      }
    });
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
    if (this.paused) return;
    const actionsDiv = document.getElementById('action-buttons-area');
    if (!actionsDiv) return;
    // Remove only previously generated action buttons, keep persistent ones
    const persistentButtons: HTMLElement[] = [];
    Array.from(actionsDiv.children).forEach(child => {
      if (!(child instanceof HTMLElement)) return;
      if (child.classList.contains('persistent-action-btn')) {
        // Always keep persistent buttons (like New Game)
        persistentButtons.push(child);
        // Always enable New Game button
        if (child.textContent && child.textContent.trim() === 'New Game') {
          (child as HTMLButtonElement).disabled = false;
        }
      } else {
        actionsDiv.removeChild(child);
      }
    });
    if (!this.currentGame || !this.currentGame.players || !this.currentGame.activePlayer) return;
    const countries = this.currentGame.worldMap ? this.currentGame.worldMap.getCountries() : [];
    // Get clicked country objects by name
    const clickedCountries = this.clickedCountryNames.map(name => countries.find((c: any) => c.name === name)).filter(Boolean);

    // If no actions left, show warning and return
    if (this.currentGame.activePlayer.actionsLeft <= 0) {
      const warning = document.createElement('div');
      warning.textContent = 'You are out of actions for this turn!';
      warning.style.background = 'linear-gradient(90deg,#ff5e62 0%,#ff9966 100%)';
      warning.style.color = '#fff';
      warning.style.fontSize = '1.5rem';
      warning.style.fontWeight = 'bold';
      warning.style.padding = '32px 0';
      warning.style.borderRadius = '12px';
      warning.style.textAlign = 'center';
      warning.style.margin = '24px 0';
      actionsDiv.appendChild(warning);
      return;
    }

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
        btn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
        btn.onclick = async () => {
          const amountRange = action.RequiresAmount(clickedCountries, this.currentGame.activePlayer, this.currentGame);
          let result: string | null = null;
          let amountUsed = 0;
          if (amountRange) {
            const [min, max] = amountRange;
            let initial = max;
            if (this.currentGame && this.currentGame.advisedOpportunity) {
              const opp = this.currentGame.advisedOpportunity;
              // Debug: check for duplicate country instances
              const worldCountries = this.currentGame.worldMap.getCountries();
              for (const c of opp.countries) {
                const byName = worldCountries.find((wc: any) => wc.name === c.name);
                if (byName && byName !== c) {
                  console.warn('[Advisor/Action] Country instance mismatch:', c.name, c, byName);
                }
              }
              // Check if action and countries match
              const sameAction = opp.action.Type() === action.Type();
              const sameCountries = opp.countries.length === clickedCountries.length && opp.countries.every((c: any, i: number) => c === clickedCountries[i]);
              if (sameAction && sameCountries) {
                initial = opp.amount;
              }
            }
            const selected = await showAmountDialog(min, max, initial);
            if (selected === null) return; // Cancelled
            amountUsed = selected;
            result = await action.Act(clickedCountries, this.currentGame.activePlayer, this.currentGame, selected);
          } else {
            result = await action.Act(clickedCountries, this.currentGame.activePlayer, this.currentGame);
          }
          // Log the action
          const usedCountries = clickedCountries.slice(-action.countryCountNeeded);
          this.currentGame.activePlayer.actionLog.push({
            actionType: action.Type(),
            countries: usedCountries,
            amount: amountUsed,
            result: result ?? null
          });
          // Decrement action count
          this.currentGame.activePlayer.useAction();
          if (typeof result === 'string' && result !== null) {
            this.afterAction();
            this.showActionResult(result);
          } else {
            this.afterAction();
          }
          // Clear advised opportunity when an action is performed (at the end)
          if (this.currentGame) this.currentGame.advisedOpportunity = null;
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
   * Shows a message in the sidebar action result panel.
   */
  showActionResult(message: string) {
    const panel = document.getElementById('action-result-panel');
    if (panel) {
      panel.innerHTML = `<span style="color:#fff">${message}</span>`;
    }
  }
  clearActionResult() {
    const panel = document.getElementById('action-result-panel');
    if (panel) {
      panel.innerHTML = '<span style="color:#888">No recent action.</span>';
    }
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
  getWorldMapCanvas(): HTMLCanvasElement {
    if (this.paused) throw new Error('Game is paused');
    if (!this.currentGame || !this.currentGame.worldMap) throw new Error('GameGui.getWorldMapCanvas: currentGame or worldMap is missing');
    if (this.mapDirty || !this.worldMapCanvas) {
      let highlightCountries = [];
      if (this.currentGame.activePlayer) {
        const known = this.currentGame.activePlayer.getKnownCountries();
        highlightCountries = known.owned.concat(known.known);
      }
      this.worldMapCanvas = Renderer.render(this.currentGame.worldMap, [], highlightCountries, Game.showArmies, this.currentGame.activePlayer);
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

  /**
   * Called whenever a new turn starts (after startTurn is called on the active player).
   */
  async turnStarted() {
    if (this.paused) return;
    this.clearActionResult();
    // --- WIN CONDITION CHECK ---
    if (this.currentGame && this.currentGame.activePlayer &&
        this.currentGame.activePlayer.IncomeShare >= Game.INCOME_SHARE_WIN) {
      showWinDialog(
        this.currentGame.activePlayer.name,
        Game.INCOME_SHARE_WIN * 100,
        () => { this.canceled = true; }
      );
      this.canceled = true;
      return;
    }
    // Redraw the map and log at the start of each turn (only once per turn)
    this.renderMainGui(this.rootContainer as HTMLElement, this.currentGame);
    if (this.canceled) return;
    if (!this.currentGame?.activePlayer?.isAI) return;
    const ai = this.currentGame.activePlayer.AI;
    if (!ai) return;

    const doOneAction = async () => {
      if (this.paused) return;
      if (this.canceled) return;
      const acted = await ai.takeAction();
      this.markMapDirty();
      // Only render, do not log, after each AI action
      this.renderMainGui(this.rootContainer as HTMLElement, this.currentGame);

      if (acted) {
        setTimeout(() => doOneAction(), 100); // Schedule next action
      } else {
        // End turn and move to next player
        this.currentGame.nextTurn();
        this.markMapDirty();
        // Do not render or log here; turnStarted will be called for the next player
        if (this.currentGame.activePlayer.isAI) {
          setTimeout(() => this.turnStarted(), 100);
        } else {
          // For human, call turnStarted to trigger log/render for the new turn
          this.turnStarted();
        }
      }
    };

    doOneAction();
  }

  async startNewGame() {
    // Always use the root container for the dialog
    this.canceled = true;
    const container = this.rootContainer!;
    const { showNewGameDialog } = await import('./NewGameDialog');
    try {
      const result = await showNewGameDialog(container);
      // Dynamically import Player and Game modules
      const PlayerMod = await import('./Player');
      const GameMod = await import('./Game');
      // Set showArmies global
      GameMod.Game.showArmies = result.showArmies;
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
      this.currentGame = GameMod.Game.initNewGame(result.map, playerObjs, this);
      this.markMapDirty();
      this.getWorldMapCanvas(); // Render and cache the map after game start
      this.renderMainGui(container, this.currentGame);
      // Start the first player's turn
      if (this.currentGame && this.currentGame.players.length > 0) {
        this.canceled = false;
        this.currentGame.activePlayer.startTurn();
        this.turnStarted();
      }
    } catch (err) {
      console.error('NewGameDialog error or cancellation:', err);
    }
  }

  renderMainGui(_container: HTMLElement, game: any) {
    if (this.paused) return;
    // --- CLEANUP PREVIOUS FISH OVERLAY (if any) ---
    const container = this.rootContainer;
    if (!container) {
      throw new Error("rootContainer is not set (null) in renderMainGui");
    }
    // Find previous mapArea and clean up FishOverlay
    const prevMapArea = container.querySelector('div[style*="flex: 3"]');
    if (prevMapArea && (prevMapArea as any)._fishOverlay) {
      const fish = (prevMapArea as any)._fishOverlay;
      if (typeof fish.stop === 'function') {
        fish.stop();
      }
      // Remove overlay canvas from DOM
      if (fish.overlay && fish.overlay.parentNode) {
        fish.overlay.parentNode.removeChild(fish.overlay);
      }
      (prevMapArea as any)._fishOverlay = null;
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


    // Panel for displaying country info
    const countryInfoPanel = document.createElement('div');
    countryInfoPanel.id = 'country-info-panel';
    countryInfoPanel.style.background = '#a67c52'; // lighter brown
    countryInfoPanel.style.border = '1px solid #555';
    countryInfoPanel.style.borderRadius = '8px';
    countryInfoPanel.style.padding = '10px 12px';
    countryInfoPanel.style.marginBottom = '18px';
    countryInfoPanel.style.color = '#b3e5fc';
    countryInfoPanel.style.fontSize = '1.05rem';
    countryInfoPanel.style.minHeight = '100px';
    countryInfoPanel.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    countryInfoPanel.innerHTML = '<span style="color:#888">Click a country to view details.</span>';


    if (mapCanvas) {
      // Only set style width/height for display scaling
      mapCanvas.style.width = '100%';
      mapCanvas.style.height = '100%';
      mapCanvas.style.display = 'block';
      mapArea.appendChild(mapCanvas);
      // --- Add overlay canvas for glow effect ---
      let glowCanvas: HTMLCanvasElement | null = null;
      let lastGlowCountry: any = null;
      function ensureGlowCanvas() {
        if (!glowCanvas) {
          glowCanvas = document.createElement('canvas');
          glowCanvas.width = mapCanvas!.width;
          glowCanvas.height = mapCanvas!.height;
          glowCanvas.style.position = 'absolute';
          glowCanvas.style.left = '0';
          glowCanvas.style.top = '0';
          glowCanvas.style.pointerEvents = 'none';
          glowCanvas.style.width = '100%';
          glowCanvas.style.height = '100%';
          mapArea.appendChild(glowCanvas);
        }
      }
      function clearGlow() {
        if (glowCanvas) {
          const ctx = glowCanvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
        }
        lastGlowCountry = null;
      }
      // --- Add fish overlay (only once per render) ---
      if (!(mapArea as any)._fishOverlay) {
        const map = game.worldMap.getMap();
        const width = mapCanvas.width;
        const height = mapCanvas.height;
        const getOcean = (x: number, y: number) => {
          if (x < 0 || y < 0 || y >= map.length || x >= map[0].length) return false;
          return map[y][x] === OCEAN;
        };
        (mapArea as any)._fishOverlay = new FishOverlay(mapArea, width, height, getOcean);
      }
      this.fishOverlay = (mapArea as any)._fishOverlay;
      // --- Fix: Ensure only one click handler is attached ---
      if ((mapCanvas as any)._countryClickHandler) {
        mapCanvas.removeEventListener('mousedown', (mapCanvas as any)._countryClickHandler);
      }
      const countryClickHandler = (e: MouseEvent) => {
        if (this.paused) return;
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

            // --- Draw glow effect ---
            ensureGlowCanvas();
            clearGlow();
            if (glowCanvas && clickedCountry) {
              const ctx = glowCanvas.getContext('2d');
              if (ctx) {
                Renderer.drawCountryGlow(ctx, clickedCountry, [0,0,0], clickedCountry.color);
                lastGlowCountry = clickedCountry;
                // --- Draw country name and armies on top of glow ---
                const [cx, cy] = clickedCountry.center ? clickedCountry.center() : [0, 0];
                const displayName = clickedCountry.fortified ? '🛡️ ' + clickedCountry.name : clickedCountry.name;
                ctx.save();
                ctx.font = 'bold 10px Verdana, Geneva, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'black';
                ctx.strokeText(displayName, cx, cy);
                ctx.fillStyle = 'white';
                ctx.fillText(displayName, cx, cy);
                if (Game.showArmies && typeof clickedCountry.armies === 'number') {
                  const armiesText = `${Math.round(clickedCountry.armies / 1000)}k`;
                  ctx.font = 'bold 9px Verdana, Geneva, sans-serif';
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = 'black';
                  ctx.strokeText(armiesText, cx, cy + 13);
                  ctx.fillStyle = '#FFD700';
                  ctx.fillText(armiesText, cx, cy + 13);
                }
                ctx.restore();
              }
            }

            // Update action buttons
            this.updateActionButtons();
            // Show country info in sidebar
            const infoPanel = document.getElementById('country-info-panel');
            if (infoPanel && game && game.activePlayer && typeof game.gameTurn === 'number') {
              const info = game.activePlayer.getCountryInfo(clickedCountry, game.gameTurn);
              infoPanel.innerHTML = `
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
      };
      mapCanvas.addEventListener('mousedown', countryClickHandler);
      (mapCanvas as any)._countryClickHandler = countryClickHandler;
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
      // Replace text with image
      const img = document.createElement('img');
      img.src = 'riskStartup.png';
      img.alt = 'Risk Startup';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      mapPlaceholder.appendChild(img);
      mapArea.appendChild(mapPlaceholder);
    }

    // Right: Sidebar
    const sidebar = document.createElement('div');

    // --- Replace New Game, Save Game, Load Game buttons with images ---
    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.flexDirection = 'row';
    buttonRow.style.justifyContent = 'center';
    buttonRow.style.alignItems = 'center';
    buttonRow.style.gap = '18px';
    buttonRow.style.marginBottom = '24px';
    buttonRow.style.width = '100%';
    buttonRow.style.minWidth = '0';

    // Helper to create an image button
    function createImageButton(src: string, alt: string, onClick: () => void) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.style.flex = '1 1 0';
      img.style.width = '0';
      img.style.minWidth = '0';
      img.style.height = 'auto';
      img.style.objectFit = 'contain';
      img.style.cursor = 'pointer';
      img.style.borderRadius = '8px';
      img.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
      img.style.transition = 'transform 0.1s, box-shadow 0.1s';
      img.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.08)';
        img.style.boxShadow = '0 4px 16px #ffd700';
      });
      img.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        img.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
      });
      img.onclick = onClick;
      img.style.display = 'block';
      img.style.margin = '0 0';
      return img;
    }

    // New Game
    const newGameImg = createImageButton('newgame.png', 'New Game', () => this.startNewGame());
    // Save Game
    const saveGameImg = createImageButton('savegame.png', 'Save Game', () => {
      try {
        if (!this.currentGame) throw new Error('No game to save');
        const json = Serializer.serialize(this.currentGame);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'armchair-general-save.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (err) {
        alert('Save failed: ' + (err && (err as any).message ? (err as any).message : err));
        throw err;
      }
    });
    // Load Game
    const loadGameImg = createImageButton('loadgame.png', 'Load Game', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const json = reader.result as string;
            const game = Serializer.deserialize(json);
            game.gui = this;
            for (const player of game.players) {
              player.game = game;
              if (player.isAI && player.AI) {
                player.AI.game = game;
                player.AI.player = player;
              }
            }
            this.currentGame = game;
            this.markMapDirty();
            this.renderMainGui(this.rootContainer as HTMLElement, this.currentGame);
            this.turnStarted();
          } catch (err) {
            alert('Load failed: ' + (err && (err as any).message ? (err as any).message : err));
            throw err;
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });

    buttonRow.appendChild(newGameImg);
    buttonRow.appendChild(saveGameImg);
    buttonRow.appendChild(loadGameImg);
    sidebar.appendChild(buttonRow);

    // Add country info panel below
    sidebar.appendChild(countryInfoPanel);


    sidebar.style.flex = '1';
    sidebar.style.background = '#3b2412'; // deep brown
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.padding = '32px 24px';
    sidebar.style.color = '#fff';
    sidebar.style.minWidth = '320px';
    sidebar.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";

    // Game Info
    const gameInfo = document.createElement('div');
    gameInfo.style.marginBottom = '32px';
    const turnInfo = document.createElement('div');
    turnInfo.style.fontSize = '1.2rem';
    turnInfo.style.fontWeight = 'bold';
    if (game && game.players && game.players.length > 0) {
      const activePlayer = game.activePlayer;
      turnInfo.textContent = `Turn: ${game.gameTurn} | Player: ${activePlayer.name}`;
      // Add action stars visualization
      const starsDiv = document.createElement('div');
      const total = activePlayer.constructor.ACTIONS_PER_TURN || 5;
      const left = activePlayer.actionsLeft;
      starsDiv.style.margin = '8px 0 0 0';
      starsDiv.style.fontSize = '2rem';
      starsDiv.style.letterSpacing = '0.2rem';
      for (let i = 0; i < total; i++) {
        const star = document.createElement('span');
        star.textContent = i < left ? '★' : '☆';
        star.style.color = i < left ? '#ffd700' : '#888';
        starsDiv.appendChild(star);
      }
      starsDiv.title = `${left} of ${total} actions remaining`;
      gameInfo.appendChild(starsDiv);
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
        // Highlight the active player with a glowy box
        if (player === game.activePlayer) {
          li.style.boxShadow = '0 0 16px 4px #ffd700, 0 0 4px 2px #fff';
          li.style.border = '2px solid #ffd700';
          li.style.borderRadius = '12px';
          li.style.background = 'rgba(255, 215, 0, 0.10)';
        }
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

          // --- Progress bar for income share ---
          const progressBarContainer = document.createElement('span');
          progressBarContainer.style.display = 'inline-block';
          progressBarContainer.style.width = '54px';
          progressBarContainer.style.height = '12px';
          progressBarContainer.style.marginLeft = '8px';
          progressBarContainer.style.verticalAlign = 'middle';
          progressBarContainer.style.background = '#222';
          progressBarContainer.style.border = '1px solid #444';
          progressBarContainer.style.borderRadius = '6px';
          progressBarContainer.style.overflow = 'hidden';

          const fill = document.createElement('span');
          const share = Math.min(player.IncomeShare / Game.INCOME_SHARE_WIN, 1);
          fill.style.display = 'inline-block';
          fill.style.height = '100%';
          fill.style.width = `${Math.round(share * 100)}%`;
          fill.style.background = share >= 1 ? 'linear-gradient(90deg,#43cea2,#ffd700)' : 'linear-gradient(90deg,#43cea2,#185a9d)';
          fill.style.transition = 'width 0.3s';
          progressBarContainer.title = `Income share: ${(player.IncomeShare*100).toFixed(1)}% (win at ${(Game.INCOME_SHARE_WIN*100).toFixed(0)}%)`;
          progressBarContainer.appendChild(fill);
          li.appendChild(progressBarContainer);
        }
        playerList.appendChild(li);
      }
      sidebar.appendChild(playerList);
    }

    // Action result panel
    const actionResultPanel = document.createElement('div');
    actionResultPanel.id = 'action-result-panel';
    actionResultPanel.style.background = '#a67c52';
    actionResultPanel.style.border = '1px solid #555';
    actionResultPanel.style.borderRadius = '8px';
    actionResultPanel.style.padding = '10px 12px';
    actionResultPanel.style.marginBottom = '18px';
    actionResultPanel.style.color = '#fff';
    actionResultPanel.style.fontSize = '1.05rem';
    actionResultPanel.style.minHeight = '60px';
    actionResultPanel.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    actionResultPanel.innerHTML = '<span style="color:#888">No recent action.</span>';
    sidebar.appendChild(actionResultPanel);

    // Action buttons panel (no End Turn button)
    const actionPanel = document.createElement('div');
    actionPanel.id = 'action-panel';
    actionPanel.style.display = 'flex';
    actionPanel.style.flexDirection = 'row';
    actionPanel.style.alignItems = 'flex-start';
    actionPanel.style.background = '#a67c52';
    actionPanel.style.border = '1px solid #555';
    actionPanel.style.borderRadius = '8px';
    actionPanel.style.padding = '16px 12px';
    actionPanel.style.marginTop = 'auto';
    actionPanel.style.marginBottom = '18px';
    actionPanel.style.minHeight = '120px';
    // Left: action buttons area (80%)
    const actionsDiv = document.createElement('div');
    actionsDiv.id = 'action-buttons-area';
    actionsDiv.style.display = 'flex';
    actionsDiv.style.flexDirection = 'column';
    actionsDiv.style.gap = '12px';
    actionsDiv.style.flex = '0 1 80%';
    actionsDiv.style.maxWidth = '80%';
    // Right: advisor image (20%)
    const advisorDiv = document.createElement('div');
    advisorDiv.style.flex = '1 1 20%';
    advisorDiv.style.display = 'flex';
    advisorDiv.style.alignItems = 'flex-end';
    advisorDiv.style.justifyContent = 'center';
    advisorDiv.style.height = '100%';
    advisorDiv.style.marginLeft = '12px';
    const advisorImg = document.createElement('img');
    advisorImg.src = 'Advisor.png';
    advisorImg.alt = 'Advisor';
    advisorImg.style.maxWidth = '100%';
    advisorImg.style.maxHeight = '96px';
    advisorImg.style.objectFit = 'contain';
    advisorImg.style.borderRadius = '6px';
    advisorDiv.appendChild(advisorImg);
    // Assemble panel
    actionPanel.appendChild(actionsDiv);
    actionPanel.appendChild(advisorDiv);
    sidebar.appendChild(actionPanel);
    // End Turn button (below panel)
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
    endTurnBtn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    endTurnBtn.style.marginBottom = '18px';
    endTurnBtn.onclick = () => {
      if (this.paused) return;
      if (this.currentGame) {
        this.currentGame.nextTurn();
        this.markMapDirty();
        this.renderMainGui(this.rootContainer as HTMLElement, this.currentGame);
        this.turnStarted();
      }
    };
    sidebar.appendChild(endTurnBtn);

    // Assemble
    wrapper.appendChild(mapArea);
    wrapper.appendChild(sidebar);
    container.appendChild(wrapper);

    // Add click handler to advisor image
    advisorImg.addEventListener('click', async () => {
      const player = this.currentGame?.activePlayer;
      if (!player || !player.AI) return;
      player.AI.game = this.currentGame; // Ensure AI has a valid game reference
      const opp = player.AI.findBestOpportunity();
      const panel = document.getElementById('action-result-panel');
      if (!opp) {
        if (panel) panel.innerHTML = '<span style="color:#fff">Sorry, sir, I have no idea what to do!</span>';
        return;
      }
      // Set advisedOpportunity so the amount dialog can use it
      if (this.currentGame) this.currentGame.advisedOpportunity = opp;
      // Play advisor animation before showing text
      const { runAdvisorAnimation } = await import('./AdvisorAnimation');
      await runAdvisorAnimation(this, opp);
      let actionString = opp.action.ActionString(opp.countries, player, this.currentGame, opp.amount);
      if (actionString.length > 0) {
        actionString = actionString.charAt(0).toLowerCase() + actionString.slice(1);
      }
      if (panel) panel.innerHTML = `<span style=\"color:#fff\">I think, ${actionString} would be a good idea.</span>`;
      // Flash the action result panel to draw attention
      if (panel) {
        const originalBg = panel.style.background;
        panel.style.transition = 'background 0.2s';
        panel.style.background = '#ffd700';
        setTimeout(() => {
          panel.style.background = originalBg;
        }, 200);
      }
    });
  }

  /**
   * Allows external code (e.g., AdvisorAnimation) to set the clicked countries for simulation.
   */
  public setClickedCountryNames(names: string[]) {
    this.clickedCountryNames = names;
  }
}
