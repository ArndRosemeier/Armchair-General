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
import { Country } from './Country';
import { FunReader } from './FunReader';
import manualText from '../docs/Armchair-General-Manual.txt?raw';

export class GameGui {
  private state: string;
  public currentGame: any = null;
  private rootContainer: HTMLElement | null = null;
  public canceled: boolean = false;
  private paused: boolean = false;

  // Stores a history of all clicked country names (not just the currently relevant ones for an action).
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
          const nameStyle = clickedCountry.unrestLevel > 0 ? 'color: red; font-style: italic;' : '';
          const unrestText = clickedCountry.unrestLevel > 0 ? `<div style="color: red; font-style: italic;">Rioting</div>` : '';
          const incomeStyle = clickedCountry.unrestLevel > 0 ? 'color: red; text-decoration: line-through;' : '';
          infoPanel.innerHTML = `
            <div><b>Name:</b> <span style="${nameStyle}">${info.name}</span></div>
            <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
            <div><b>Income:</b> <span style="${incomeStyle}">${info.income !== undefined ? info.income : '?'}</span></div>
            <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
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
            const nameStyle = clickedCountry.unrestLevel > 0 ? 'color: red; font-style: italic;' : '';
            const unrestText = clickedCountry.unrestLevel > 0 ? `<div style="color: red; font-style: italic;">Rioting</div>` : '';
            const incomeStyle = clickedCountry.unrestLevel > 0 ? 'color: red; text-decoration: line-through;' : '';
            // Information status string (no 'Recency:' label)
            let infoStatusHtml = '';
            const player = this.currentGame.activePlayer;
            if (player.armyKnown(clickedCountry)) {
              infoStatusHtml = '<span style="color: #4caf50; font-weight: bold;">Certified information</span>';
            } else {
              const knowledge = player.knowledge.find((k: any) => k.country === clickedCountry);
              if (clickedCountry.owner && clickedCountry.owner !== player && knowledge) {
                const turnsOld = this.currentGame.gameTurn - knowledge.gameTurn;
                infoStatusHtml = `<span style=\"color: #ffd700; font-weight: bold;\">${turnsOld} turn${turnsOld === 1 ? '' : 's'} old information</span>`;
              } else {
                infoStatusHtml = '<span style="color: #ff4444; font-weight: bold;">No information</span>';
              }
            }
            infoPanel.innerHTML = `
              <div><b>Name:</b> <span style="${nameStyle}">${info.name}</span></div>
              <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
              <div><b>Income:</b> <span style="${incomeStyle}">${info.income !== undefined ? info.income : '?'} </span></div>
              <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
              <div>${infoStatusHtml}</div>
              ${unrestText}
            `;
          }
        }
        // --- Show country info overlay and action panel for the last used country (simulate click) ---
        if (!this.isProcessingAdvisorSynthetic && this.currentGame.activePlayer && this.currentGame.activePlayer.actionLog.length > 0) {
          const lastAction = this.currentGame.activePlayer.actionLog[this.currentGame.activePlayer.actionLog.length - 1];
          if (lastAction.countries && lastAction.countries.length > 0) {
            const lastCountry = lastAction.countries[lastAction.countries.length - 1];
            if (lastCountry && lastCountry.name) {
              // Set as last clicked
              this.clickedCountryNames.push(lastCountry.name);
              // Simulate click: show overlays for this country
              // Find the map area and canvas
              const mapArea = this.rootContainer.querySelector('div[style*="flex: 3"]');
              const mapCanvas = mapArea ? mapArea.querySelector('canvas') : null;
              if (mapCanvas && mapArea) {
                // Find the country object by name
                const countries = this.currentGame.worldMap.getCountries();
                const country = countries.find((c: any) => c.name === lastCountry.name);
                if (country) {
                  // Calculate center in client coordinates
                  const [cx, cy] = country.center ? country.center() : [0, 0];
                  const mapWidth = mapCanvas.width;
                  const mapHeight = mapCanvas.height;
                  const clientRect = mapCanvas.getBoundingClientRect();
                  const scaleX = clientRect.width / mapWidth;
                  const scaleY = clientRect.height / mapHeight;
                  const px = cx * scaleX;
                  const py = cy * scaleY;
                  // Create a synthetic MouseEvent at the country center
                  const evt = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    clientX: clientRect.left + px,
                    clientY: clientRect.top + py
                  });
                  mapCanvas.dispatchEvent(evt);
                }
              }
            }
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
    // Remove old floating action panel if it exists
    const mapArea = document.querySelector('div[style*="flex: 3"]');
    let actionOverlayPanel = mapArea ? mapArea.querySelector('#country-action-overlay') as HTMLDivElement : null;
    if (actionOverlayPanel) {
      actionOverlayPanel.remove();
      actionOverlayPanel = null;
    }
    // Sidebar action buttons area (keep persistent buttons only)
    const actionsDiv = document.getElementById('action-buttons-area');
    if (actionsDiv) {
      Array.from(actionsDiv.children).forEach(child => {
        if (!(child instanceof HTMLElement)) return;
        if (!child.classList.contains('persistent-action-btn')) {
          actionsDiv.removeChild(child);
        }
      });
    }
    if (!this.currentGame || !this.currentGame.players || !this.currentGame.activePlayer) return;
    const countries = this.currentGame.worldMap ? this.currentGame.worldMap.getCountries() : [];
    // Get clicked country objects by name
    const clickedCountries = this.clickedCountryNames.map(name => countries.find((c: any) => c.name === name)).filter(Boolean);
    // If no actions left or no country selected, do not show floating panel
    if (this.currentGame.activePlayer.actionsLeft <= 0 || clickedCountries.length === 0 || !mapArea) return;
    // Create dynamic action buttons
    const dynamicButtons: HTMLElement[] = [];
    for (const action of this.actions) {
      const buttonText = action.GetButtonText(clickedCountries, this.currentGame.activePlayer);
      if (buttonText) {
        const btn = document.createElement('button');
        btn.textContent = buttonText;
        btn.style.padding = '4px 10px';
        btn.style.fontSize = '0.95rem';
        btn.style.background = 'rgba(0,0,0,0.18)';
        btn.style.color = '#b3e5fc';
        btn.style.border = '1px solid #555';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 1px 4px rgba(30,32,34,0.10)';
        btn.style.margin = '0 6px 0 0';
        btn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
        btn.style.transition = 'background 0.15s, color 0.15s';
        btn.onmouseenter = () => { btn.style.background = '#ffd700'; btn.style.color = '#222'; };
        btn.onmouseleave = () => { btn.style.background = 'rgba(0,0,0,0.18)'; btn.style.color = '#b3e5fc'; };
        btn.onclick = async () => {
          const amountRange = action.RequiresAmount(clickedCountries, this.currentGame.activePlayer, this.currentGame);
          let result: string | null = null;
          let amountUsed = 0;
          if (amountRange) {
            const [min, max] = amountRange;
            let initial = max;
            if (this.currentGame && this.currentGame.advisedOpportunity) {
              const opp = this.currentGame.advisedOpportunity;
              const worldCountries = this.currentGame.worldMap.getCountries();
              for (const c of opp.countries) {
                const byName = worldCountries.find((wc: any) => wc.name === c.name);
                if (byName && byName !== c) {
                  console.warn('[Advisor/Action] Country instance mismatch:', c.name, c, byName);
                  if (byName.name === c.name) {
                    console.error('[Advisor/Action] Country instance mismatch but names match:', c.name, c, byName);
                  }
                }
              }
              const sameAction = opp.action.Type() === action.Type();
              if (!sameAction) {
                console.log('[Advisor/Action] Action type mismatch:', opp.action.Type(), action.Type());
              }
              // Only compare the last n entries of clickedCountries, where n = opp.countries.length
              const n = opp.countries.length;
              const lastClicked = clickedCountries.slice(-n);
              const sameCountries = lastClicked.length === n && opp.countries.every((c: any, i: number) => c === lastClicked[i]);
              if (!sameCountries) {
                console.log('[Advisor/Action] Country array mismatch:');
                console.log('  opp.countries:', opp.countries.map((c: any) => c.name));
                console.log('  lastClicked:', lastClicked.map((c: any) => c && c.name));
                for (let i = 0; i < Math.max(opp.countries.length, lastClicked.length); ++i) {
                  const oc = opp.countries[i];
                  const cc = lastClicked[i];
                  if (oc !== cc) {
                    if (oc && cc && oc.name === cc.name) {
                      console.error('[Advisor/Action] Country instance mismatch at index', i, 'but names match:', oc.name, oc, cc);
                    } else {
                      console.log('[Advisor/Action] Country mismatch at index', i, ':', oc, cc);
                    }
                  }
                }
              }
              if (sameAction && sameCountries) {
                console.log('[Advisor/Action] Using advisor suggested amount:', opp.amount);
                initial = opp.amount;
              } else {
                console.log('[Advisor/Action] Not using advisor amount. sameAction:', sameAction, 'sameCountries:', sameCountries);
              }
            }
            const selected = await showAmountDialog(min, max, initial);
            if (selected === null) return; // Cancelled
            amountUsed = selected;
            result = await action.Act(clickedCountries, this.currentGame.activePlayer, this.currentGame, selected);
          } else {
            result = await action.Act(clickedCountries, this.currentGame.activePlayer, this.currentGame);
          }
          const usedCountries = clickedCountries.slice(-action.countryCountNeeded);
          this.currentGame.activePlayer.actionLog.push({
            actionType: action.Type(),
            countries: usedCountries,
            amount: amountUsed,
            result: result ?? null
          });
          this.currentGame.activePlayer.useAction();
          if (typeof result === 'string' && result !== null) {
            this.afterAction();
            this.showActionResult(result);
          } else {
            this.afterAction();
          }
          if (this.currentGame) this.currentGame.advisedOpportunity = null;
        };
        dynamicButtons.push(btn);
      }
    }
    if (dynamicButtons.length > 0) {
      // Create floating panel
      actionOverlayPanel = document.createElement('div');
      actionOverlayPanel.id = 'country-action-overlay';
      actionOverlayPanel.style.position = 'absolute';
      actionOverlayPanel.style.pointerEvents = 'auto';
      actionOverlayPanel.style.background = 'rgba(40, 40, 60, 0.85)';
      actionOverlayPanel.style.border = '1.5px solid #555';
      actionOverlayPanel.style.borderRadius = '10px';
      actionOverlayPanel.style.padding = '12px 18px';
      actionOverlayPanel.style.color = '#b3e5fc';
      actionOverlayPanel.style.fontSize = '0.95rem';
      actionOverlayPanel.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
      actionOverlayPanel.style.display = 'flex';
      actionOverlayPanel.style.flexDirection = 'column';
      actionOverlayPanel.style.alignItems = 'center';
      actionOverlayPanel.style.justifyContent = 'center';
      actionOverlayPanel.style.gap = '10px';
      actionOverlayPanel.style.zIndex = '21';
      actionOverlayPanel.style.minWidth = '140px';
      actionOverlayPanel.style.maxWidth = '340px';
      actionOverlayPanel.style.visibility = 'hidden';
      actionOverlayPanel.style.flexWrap = 'wrap';
      actionOverlayPanel.style.maxWidth = '340px';
      actionOverlayPanel.style.minHeight = 'unset';
      dynamicButtons.forEach(btn => {
        btn.style.width = '100%';
        btn.style.margin = '0';
        btn.style.textAlign = 'center';
        btn.style.background = '#b3e5fc';
        btn.style.color = '#1a237e';
        btn.onmouseenter = () => { btn.style.background = '#ffd700'; btn.style.color = '#222'; };
        btn.onmouseleave = () => { btn.style.background = '#b3e5fc'; btn.style.color = '#1a237e'; };
        actionOverlayPanel!.appendChild(btn);
      });
      mapArea.appendChild(actionOverlayPanel!);
      // Position below the country info overlay using the same logic as info overlay
      const mapCanvas = mapArea.querySelector('canvas');
      if (mapCanvas && clickedCountries.length === 1) {
        const country = clickedCountries[0];
        const [cx, cy] = country.center ? country.center() : [0, 0];
        const mapWidth = mapCanvas.width;
        const mapHeight = mapCanvas.height;
        const clientRect = mapCanvas.getBoundingClientRect();
        const scaleX = clientRect.width / mapWidth;
        const scaleY = clientRect.height / mapHeight;
        const px = cx * scaleX;
        const py = cy * scaleY;
        // Get info overlay height if present
        const infoOverlay = mapArea.querySelector('#country-info-overlay') as HTMLDivElement;
        // Ensure info overlay is visible and positioned first
        if (infoOverlay && infoOverlay.style.display !== 'none') {
          // Use requestAnimationFrame to ensure layout is updated
          requestAnimationFrame(() => {
            // Now both overlays should have correct sizes
            const infoHeight = infoOverlay.offsetHeight;
            actionOverlayPanel!.style.left = `${px - actionOverlayPanel!.offsetWidth / 2}px`;
            actionOverlayPanel!.style.top = `${py + infoHeight + 2}px`;
            actionOverlayPanel!.style.visibility = 'visible';
            actionOverlayPanel!.style.flexWrap = 'wrap';
            actionOverlayPanel!.style.maxWidth = '340px';
            actionOverlayPanel!.style.minHeight = 'unset';
          });
        } else {
          // Fallback: just use country center
          actionOverlayPanel!.style.left = `${px - actionOverlayPanel!.offsetWidth / 2}px`;
          actionOverlayPanel!.style.top = `${py + 8}px`;
          actionOverlayPanel!.style.visibility = 'visible';
        }
      }
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
    let mapOverlayPanel = mapArea.querySelector('#country-info-overlay') as HTMLDivElement;
    if (!mapOverlayPanel) {
      mapOverlayPanel = document.createElement('div');
      mapOverlayPanel.id = 'country-info-overlay';
      mapOverlayPanel.style.position = 'absolute';
      mapOverlayPanel.style.pointerEvents = 'auto';
      mapOverlayPanel.style.background = 'rgba(40, 40, 60, 0.85)';
      mapOverlayPanel.style.border = '1.5px solid #555';
      mapOverlayPanel.style.borderRadius = '10px';
      mapOverlayPanel.style.padding = '14px 18px';
      mapOverlayPanel.style.color = '#b3e5fc';
      mapOverlayPanel.style.fontSize = '1.08rem';
      mapOverlayPanel.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
      mapOverlayPanel.style.minWidth = '180px';
      mapOverlayPanel.style.maxWidth = '320px';
      mapOverlayPanel.style.display = 'none';
      mapOverlayPanel.style.zIndex = '20';
      mapArea.appendChild(mapOverlayPanel);
    }

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
        let clickedCountry: Country | null = null;
        if (x >= 0 && y >= 0 && y < map.length && x < map[0].length) {
          const value = map[y][x];
          if (value >= 0 && countries[value]) {
            clickedCountry = countries[value];
            // Counter check: is (x, y) in clickedCountry.coordinates?
            if (clickedCountry && !clickedCountry.coordinates.some(([cx, cy]: [number, number]) => cx === x && cy === y)) {
              console.warn(`[GameGui] Click at (${x},${y}) is not in coordinates of country: ${clickedCountry.name}`);
            }
            if (clickedCountry) this.clickedCountryNames.push(clickedCountry.name);

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

            // Show country info as overlay above the country center
            if (clickedCountry && mapOverlayPanel && game && game.activePlayer && typeof game.gameTurn === 'number') {
              const info = game.activePlayer.getCountryInfo(clickedCountry, game.gameTurn);
              const nameStyle = clickedCountry.unrestLevel > 0 ? 'color: #ff6666; font-style: italic;' : '';
              const unrestText = clickedCountry.unrestLevel > 0 ? `<div style=\"color: #ff6666; font-style: italic;\">Rioting</div>` : '';
              const incomeStyle = clickedCountry.unrestLevel > 0 ? 'color: #ff6666; text-decoration: line-through;' : '';
              // Information status string (no 'Recency:' label)
              let infoStatusHtml = '';
              const player = game.activePlayer;
              if (player.armyKnown(clickedCountry)) {
                infoStatusHtml = '<span style="color: #4caf50; font-weight: bold;">Certified information</span>';
              } else {
                const knowledge = player.knowledge.find((k: any) => k.country === clickedCountry);
                if (clickedCountry.owner && clickedCountry.owner !== player && knowledge) {
                  const turnsOld = game.gameTurn - knowledge.gameTurn;
                  infoStatusHtml = `<span style=\"color: #ffd700; font-weight: bold;\">${turnsOld} turn${turnsOld === 1 ? '' : 's'} old information</span>`;
                } else {
                  infoStatusHtml = '<span style="color: #ff4444; font-weight: bold;">No information</span>';
                }
              }
              mapOverlayPanel.innerHTML = `
                <div><b>Name:</b> <span style="${nameStyle}">${info.name}</span></div>
                <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
                <div><b>Income:</b> <span style="${incomeStyle}">${info.income !== undefined ? info.income : '?'} </span></div>
                <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
                <div>${infoStatusHtml}</div>
                ${unrestText}
              `;
              // Position overlay above the country center
              const [cx, cy] = clickedCountry.center ? clickedCountry.center() : [0, 0];
              // Convert map coords to canvas pixel coords
              const mapWidth = mapCanvas.width;
              const mapHeight = mapCanvas.height;
              const clientRect = mapCanvas.getBoundingClientRect();
              const scaleX = clientRect.width / mapWidth;
              const scaleY = clientRect.height / mapHeight;
              const px = cx * scaleX;
              const py = cy * scaleY;
              // Offset overlay above the country center
              mapOverlayPanel.style.left = `${px - mapOverlayPanel.offsetWidth / 2}px`;
              mapOverlayPanel.style.top = `${py - mapOverlayPanel.offsetHeight - 18}px`;
              mapOverlayPanel.style.display = 'block';

              // --- Floating action panel logic moved here ---
              requestAnimationFrame(() => {
                // Remove old floating action panel if it exists
                const mapArea = document.querySelector('div[style*="flex: 3"]');
                let actionOverlayPanel = mapArea ? mapArea.querySelector('#country-action-overlay') as HTMLDivElement : null;
                if (actionOverlayPanel) {
                  actionOverlayPanel.remove();
                  actionOverlayPanel = null;
                }
                // Only show if actions left and a country is selected
                if (!game.activePlayer || game.activePlayer.actionsLeft <= 0 || !clickedCountry) return;
                // Use all selected countries
                const countries = game.worldMap.getCountries();
                const clickedCountries = this.clickedCountryNames
                  .map(name => countries.find((c: any) => c.name === name))
                  .filter(Boolean);
                if (clickedCountries.length === 0) return;
                // Create dynamic action buttons
                const dynamicButtons: HTMLElement[] = [];
                for (const action of this.actions) {
                  const buttonText = action.GetButtonText(clickedCountries, game.activePlayer);
                  if (buttonText) {
                    const btn = document.createElement('button');
                    btn.textContent = buttonText;
                    btn.style.padding = '4px 10px';
                    btn.style.fontSize = '0.95rem';
                    btn.style.background = 'rgba(0,0,0,0.18)';
                    btn.style.color = '#b3e5fc';
                    btn.style.border = '1px solid #555';
                    btn.style.borderRadius = '6px';
                    btn.style.cursor = 'pointer';
                    btn.style.boxShadow = '0 1px 4px rgba(30,32,34,0.10)';
                    btn.style.margin = '0 6px 0 0';
                    btn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
                    btn.style.transition = 'background 0.15s, color 0.15s';
                    btn.onmouseenter = () => { btn.style.background = '#ffd700'; btn.style.color = '#222'; };
                    btn.onmouseleave = () => { btn.style.background = 'rgba(0,0,0,0.18)'; btn.style.color = '#b3e5fc'; };
                    btn.onclick = async () => {
                      if (clickedCountries.length === 0) return;
                      const amountRange = action.RequiresAmount(clickedCountries, game.activePlayer, game);
                      let result: string | null = null;
                      let amountUsed = 0;
                      if (amountRange) {
                        const [min, max] = amountRange;
                        let initial = max;
                        if (game && game.advisedOpportunity) {
                          const opp = game.advisedOpportunity;
                          const worldCountries = game.worldMap.getCountries();
                          for (const c of opp.countries) {
                            const byName = worldCountries.find((wc: any) => wc.name === c.name);
                            if (byName && byName !== c) {
                              console.warn('[Advisor/Action] Country instance mismatch:', c.name, c, byName);
                              if (byName.name === c.name) {
                                console.error('[Advisor/Action] Country instance mismatch but names match:', c.name, c, byName);
                              }
                            }
                          }
                          const sameAction = opp.action.Type() === action.Type();
                          if (!sameAction) {
                            console.log('[Advisor/Action] Action type mismatch:', opp.action.Type(), action.Type());
                          }
                          // Only compare the last n entries of clickedCountries, where n = opp.countries.length
                          const n = opp.countries.length;
                          const lastClicked = clickedCountries.slice(-n);
                          const sameCountries = lastClicked.length === n && opp.countries.every((c: any, i: number) => c === lastClicked[i]);
                          if (!sameCountries) {
                            console.log('[Advisor/Action] Country array mismatch:');
                            console.log('  opp.countries:', opp.countries.map((c: any) => c.name));
                            console.log('  lastClicked:', lastClicked.map((c: any) => c && c.name));
                            for (let i = 0; i < Math.max(opp.countries.length, lastClicked.length); ++i) {
                              const oc = opp.countries[i];
                              const cc = lastClicked[i];
                              if (oc !== cc) {
                                if (oc && cc && oc.name === cc.name) {
                                  console.error('[Advisor/Action] Country instance mismatch at index', i, 'but names match:', oc.name, oc, cc);
                                } else {
                                  console.log('[Advisor/Action] Country mismatch at index', i, ':', oc, cc);
                                }
                              }
                            }
                          }
                          if (sameAction && sameCountries) {
                            console.log('[Advisor/Action] Using advisor suggested amount:', opp.amount);
                            initial = opp.amount;
                          } else {
                            console.log('[Advisor/Action] Not using advisor amount. sameAction:', sameAction, 'sameCountries:', sameCountries);
                          }
                        }
                        const selected = await showAmountDialog(min, max, initial);
                        if (selected === null) return; // Cancelled
                        amountUsed = selected;
                        result = await action.Act(clickedCountries, game.activePlayer, game, selected);
                      } else {
                        result = await action.Act(clickedCountries, game.activePlayer, game);
                      }
                      game.activePlayer.actionLog.push({
                        actionType: action.Type(),
                        countries: clickedCountries,
                        amount: amountUsed,
                        result: result ?? null
                      });
                      game.activePlayer.useAction();
                      if (typeof result === 'string' && result !== null) {
                        this.afterAction();
                        this.showActionResult(result);
                      } else {
                        this.afterAction();
                      }
                      if (game) game.advisedOpportunity = null;
                    };
                    dynamicButtons.push(btn);
                  }
                }
                if (dynamicButtons.length > 0 && mapArea && clickedCountry) {
                  actionOverlayPanel = document.createElement('div');
                  actionOverlayPanel.id = 'country-action-overlay';
                  actionOverlayPanel.style.position = 'absolute';
                  actionOverlayPanel.style.pointerEvents = 'auto';
                  actionOverlayPanel.style.background = 'rgba(40, 40, 60, 0.85)';
                  actionOverlayPanel.style.border = '1.5px solid #555';
                  actionOverlayPanel.style.borderRadius = '10px';
                  actionOverlayPanel.style.padding = '12px 18px';
                  actionOverlayPanel.style.color = '#b3e5fc';
                  actionOverlayPanel.style.fontSize = '0.95rem';
                  actionOverlayPanel.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
                  actionOverlayPanel.style.display = 'flex';
                  actionOverlayPanel.style.flexDirection = 'column';
                  actionOverlayPanel.style.alignItems = 'center';
                  actionOverlayPanel.style.justifyContent = 'center';
                  actionOverlayPanel.style.gap = '10px';
                  actionOverlayPanel.style.zIndex = '21';
                  actionOverlayPanel.style.minWidth = '140px';
                  actionOverlayPanel.style.maxWidth = '340px';
                  actionOverlayPanel.style.visibility = 'hidden';
                  actionOverlayPanel.style.flexWrap = 'wrap';
                  actionOverlayPanel.style.maxWidth = '340px';
                  actionOverlayPanel.style.minHeight = 'unset';
                  dynamicButtons.forEach(btn => {
                    btn.style.width = '100%';
                    btn.style.margin = '0';
                    btn.style.textAlign = 'center';
                    btn.style.background = '#b3e5fc';
                    btn.style.color = '#1a237e';
                    btn.onmouseenter = () => { btn.style.background = '#ffd700'; btn.style.color = '#222'; };
                    btn.onmouseleave = () => { btn.style.background = '#b3e5fc'; btn.style.color = '#1a237e'; };
                    actionOverlayPanel!.appendChild(btn);
                  });
                  mapArea.appendChild(actionOverlayPanel!);
                  // Position below the info overlay
                  actionOverlayPanel!.style.left = `${mapOverlayPanel.offsetLeft}px`;
                  actionOverlayPanel!.style.top = `${mapOverlayPanel.offsetTop + mapOverlayPanel.offsetHeight + 2}px`;
                  actionOverlayPanel!.style.visibility = 'visible';
                  actionOverlayPanel!.style.flexWrap = 'wrap';
                  actionOverlayPanel!.style.maxWidth = '340px';
                  actionOverlayPanel!.style.minHeight = 'unset';
                }
              });
            }
          } 
        }
        this.isProcessingAdvisorSynthetic = false;
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

    // Manual image button (right-aligned, below button row)
    const manualImg = document.createElement('img');
    manualImg.src = 'manual.png';
    manualImg.alt = 'Manual';
    manualImg.style.display = 'block';
    manualImg.style.marginLeft = 'auto';
    manualImg.style.marginTop = '12px';
    manualImg.style.marginBottom = '0';
    manualImg.style.width = '96px';
    manualImg.style.height = 'auto';
    manualImg.style.cursor = 'pointer';
    manualImg.style.boxShadow = '0 0 12px #bfa76f55';
    manualImg.style.opacity = '0.7';
    manualImg.onclick = () => {
      // Modal overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.background = 'rgba(40,30,10,0.20)';
      overlay.style.zIndex = '99999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      // Manual content box
      const manualBox = document.createElement('div');
      manualBox.style.width = '80vw';
      manualBox.style.maxWidth = 'none';
      manualBox.style.height = '80vh';
      manualBox.style.overflowY = 'auto';
      manualBox.style.background = 'rgba(255,250,230,0.85)';
      manualBox.style.borderRadius = '22px';
      manualBox.style.boxShadow = '0 0 64px #bfa76f99, 0 0 8px #fffbe6';
      manualBox.style.position = 'relative';
      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '18px';
      closeBtn.style.right = '28px';
      closeBtn.style.fontSize = '2.2em';
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.color = '#b22222';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.fontWeight = 'bold';
      closeBtn.style.zIndex = '100000';
      closeBtn.onpointerdown = () => {
        overlay.remove();
      };
      manualBox.appendChild(closeBtn);
      // Manual content
      const contentDiv = document.createElement('div');
      contentDiv.style.padding = '2.5em 2.5em 2em 2.5em';
      // Render manual using FunReader
      new FunReader(manualText).renderTo(contentDiv);
      manualBox.appendChild(contentDiv);
      overlay.appendChild(manualBox);
      document.body.appendChild(overlay);
    };

    buttonRow.appendChild(newGameImg);
    buttonRow.appendChild(saveGameImg);
    buttonRow.appendChild(loadGameImg);
    sidebar.appendChild(buttonRow);

    // Move Manual image below the button row, right-aligned
    sidebar.appendChild(manualImg);

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
      // Create a flex row for stars and manual image
      const starsRow = document.createElement('div');
      starsRow.style.display = 'flex';
      starsRow.style.flexDirection = 'row';
      starsRow.style.alignItems = 'center';
      starsRow.style.justifyContent = 'space-between';
      starsRow.appendChild(starsDiv);
      starsRow.appendChild(manualImg);
      gameInfo.appendChild(starsRow);
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
    actionPanel.style.padding = '20px 24px';
    actionPanel.style.marginTop = 'auto';
    actionPanel.style.marginBottom = '18px';
    actionPanel.style.minHeight = '140px';
    actionPanel.style.maxWidth = '480px';
    // Left: advisor speech bubble (flex: 1)
    const advisorSpeech = document.createElement('div');
    advisorSpeech.id = 'advisor-speech-bubble';
    advisorSpeech.style.position = 'relative';
    advisorSpeech.style.flex = '1 1 0%';
    advisorSpeech.style.height = '80%';
    advisorSpeech.style.background = 'white';
    advisorSpeech.style.color = '#222';
    advisorSpeech.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    advisorSpeech.style.fontSize = '1.18rem';
    advisorSpeech.style.padding = '18px 24px';
    advisorSpeech.style.borderRadius = '18px';
    advisorSpeech.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
    advisorSpeech.style.border = '2px solid #a67c52';
    advisorSpeech.style.display = 'none';
    advisorSpeech.style.zIndex = '2';
    advisorSpeech.style.pointerEvents = 'none';
    advisorSpeech.style.transition = 'opacity 0.3s';
    advisorSpeech.style.opacity = '0';
    advisorSpeech.style.textAlign = 'left';
    advisorSpeech.style.lineHeight = '1.4';
    advisorSpeech.innerHTML = '';
    // Add a right-pointing speech bubble spike using a pseudo-element
    advisorSpeech.style.setProperty('position', 'relative');
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
    #advisor-speech-bubble::after {
      content: '';
      position: absolute;
      right: -28px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 18px solid transparent;
      border-bottom: 18px solid transparent;
      border-left: 28px solid white;
      filter: drop-shadow(-2px 0 0 #a67c52);
      z-index: 3;
    }
    `;
    document.head.appendChild(styleSheet);
    // Right: advisor image (fixed width)
    const advisorDiv = document.createElement('div');
    advisorDiv.style.flex = '0 0 144px';
    advisorDiv.style.display = 'flex';
    advisorDiv.style.flexDirection = 'column';
    advisorDiv.style.alignItems = 'flex-end';
    advisorDiv.style.justifyContent = 'center';
    advisorDiv.style.height = '100%';
    advisorDiv.style.marginLeft = 'auto';
    // Assemble panel: speech bubble, then advisorDiv
    actionPanel.appendChild(advisorSpeech);
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

    // Add email address below End Turn button
    const emailDiv = document.createElement('div');
    emailDiv.style.textAlign = 'right';
    emailDiv.style.marginTop = '-10px';
    emailDiv.style.marginBottom = '8px';
    emailDiv.style.fontSize = '0.92em';
    emailDiv.style.opacity = '0.7';
    emailDiv.style.letterSpacing = '0.01em';
    emailDiv.style.userSelect = 'text';
    const emailLink = document.createElement('a');
    emailLink.href = 'mailto:armchair@futuremagic.de?subject=Armchair-general';
    emailLink.textContent = 'armchair@futuremagic.de';
    emailLink.style.color = '#fff';
    emailLink.style.textDecoration = 'underline dotted';
    emailLink.style.fontSize = 'inherit';
    emailLink.style.fontFamily = 'inherit';
    emailLink.target = '_blank';
    emailDiv.appendChild(emailLink);
    sidebar.appendChild(emailDiv);

    // Make sidebar wider
    sidebar.style.flex = '1';
    sidebar.style.background = '#3b2412'; // deep brown
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.style.padding = '32px 24px';
    sidebar.style.color = '#fff';
    sidebar.style.minWidth = '420px';
    sidebar.style.maxWidth = '520px';
    sidebar.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";

    // Assemble
    wrapper.appendChild(mapArea);
    wrapper.appendChild(sidebar);
    container.appendChild(wrapper);

    // Add click handler to advisor image
    advisorDiv.addEventListener('click', async () => {
      console.log('[Advisor] advisor image clicked');
      if (this.isAdvisorAnimationRunning) {
        console.log('[Advisor] Animation already running, ignoring click');
        return;
      }
      const player = this.currentGame?.activePlayer;
      if (!player || !player.AI) return;
      player.AI.game = this.currentGame; // Ensure AI has a valid game reference
      const opp = player.AI.findBestOpportunity();
      let adviceText = '';
      if (!opp) {
        adviceText = 'Sorry, sir, I have no idea what to do!';
      } else {
        let actionString = opp.action.ActionString(opp.countries, player, this.currentGame, opp.amount);
        if (actionString.length > 0) {
          actionString = actionString.charAt(0).toLowerCase() + actionString.slice(1);
        }
        adviceText = `I think, ${actionString} would be a good idea.`;
      }
      // Show bubble immediately
      advisorSpeech.innerHTML = adviceText;
      advisorSpeech.style.display = 'block';
      advisorSpeech.style.opacity = '1';
      // Play animation after showing bubble
      if (opp) {
        if (this.currentGame) this.currentGame.advisedOpportunity = opp;
        const { runAdvisorAnimation } = await import('./AdvisorAnimation');
        this.isAdvisorAnimationRunning = true;
        console.log('[Advisor] Starting advisor animation');
        await runAdvisorAnimation(this, opp);
        this.isAdvisorAnimationRunning = false;
      }
      setTimeout(() => {
        advisorSpeech.style.opacity = '0';
        setTimeout(() => advisorSpeech.style.display = 'none', 5000);
      }, 5000);
    });

    // Advisor image
    const advisorImg = document.createElement('img');
    advisorImg.src = 'Advisor.png';
    advisorImg.alt = 'Advisor';
    advisorImg.style.maxWidth = '100%';
    advisorImg.style.maxHeight = '144px';
    advisorImg.style.objectFit = 'contain';
    advisorImg.style.borderRadius = '6px';
    advisorDiv.appendChild(advisorImg);
  }

  /**
   * Allows external code (e.g., AdvisorAnimation) to set the clicked countries for simulation.
   */
  public setClickedCountryNames(names: string[]) {
    this.clickedCountryNames = names;
  }

  public isProcessingAdvisorSynthetic: boolean = false;

  public isAdvisorAnimationRunning: boolean = false;
}
