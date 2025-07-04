import { WorldMap } from './WorldMap';
import { Renderer } from './Renderer';
import { Country } from './Country';
import { Player } from './Player';
import { Game } from './Game';

export type PlayerConfig = { name: string; isAI: boolean; color: string };

export interface NewGameDialogResult {
  map: WorldMap;
  players: PlayerConfig[];
  showArmies: boolean;
}

/**
 * Shows a modal dialog for creating a new game. Returns a Promise that resolves
 * with the selected map and players, or rejects if cancelled.
 */
export function showNewGameDialog(container: HTMLElement): Promise<NewGameDialogResult> {
  return new Promise((resolve, reject) => {
    // Modal overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(30,32,34,0.85)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    // Dialog
    const dialog = document.createElement('div');
    dialog.style.width = 'min(96vw, 1140px)';
    dialog.style.height = 'min(96vh, 624px)';
    dialog.style.minWidth = '600px';
    dialog.style.minHeight = '528px';
    dialog.style.background = 'linear-gradient(120deg, #232526 0%, #414345 100%)';
    dialog.style.borderRadius = '20px';
    dialog.style.boxShadow = '0 12px 48px rgba(0,0,0,0.55)';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.alignItems = 'stretch';
    dialog.style.justifyContent = 'flex-start';
    dialog.style.padding = '0';
    dialog.style.overflow = 'hidden';
    dialog.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";

    // Header
    const header = document.createElement('div');
    header.style.background = 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)';
    header.style.padding = '28px 0 18px 0';
    header.style.textAlign = 'center';
    header.style.color = '#fff';
    header.style.fontSize = '2.1rem';
    header.style.fontWeight = 'bold';
    header.style.letterSpacing = '1px';
    header.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    header.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    header.textContent = 'New Game';
    dialog.appendChild(header);

    // Main content area (2 columns)
    const main = document.createElement('div');
    main.style.display = 'flex';
    main.style.flex = '1';
    main.style.flexDirection = 'row';
    main.style.gap = '0';
    main.style.height = '100%';
    main.style.background = 'none';
    dialog.appendChild(main);

    // Left: Map preview column
    const leftCol = document.createElement('div');
    leftCol.style.flex = '2.2';
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.alignItems = 'center';
    leftCol.style.justifyContent = 'center';
    leftCol.style.background = 'linear-gradient(135deg, #232526 0%, #232526 100%)';
    leftCol.style.padding = '36px 16px 24px 32px';
    leftCol.style.borderRight = '2px solid #333';
    leftCol.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    main.appendChild(leftCol);

    // Map preview area (3:2 ratio, e.g. 300x200)
    const mapPreviewDiv = document.createElement('div');
    mapPreviewDiv.style.width = '585px';
    mapPreviewDiv.style.height = '312px';
    mapPreviewDiv.style.background = '#222';
    mapPreviewDiv.style.border = '3px solid #666';
    mapPreviewDiv.style.borderRadius = '14px';
    mapPreviewDiv.style.display = 'flex';
    mapPreviewDiv.style.alignItems = 'center';
    mapPreviewDiv.style.justifyContent = 'center';
    mapPreviewDiv.style.marginBottom = '16px';
    mapPreviewDiv.style.position = 'relative';
    mapPreviewDiv.style.overflow = 'hidden';
    leftCol.appendChild(mapPreviewDiv);

    // Loading spinner
    const spinner = document.createElement('div');
    spinner.style.border = '4px solid #f3f3f3';
    spinner.style.borderTop = '4px solid #888';
    spinner.style.borderRadius = '50%';
    spinner.style.width = '36px';
    spinner.style.height = '36px';
    spinner.style.animation = 'spin 1s linear infinite';
    spinner.style.position = 'absolute';
    spinner.style.left = 'calc(50% - 18px)';
    spinner.style.top = 'calc(50% - 18px)';
    mapPreviewDiv.appendChild(spinner);

    // Recreate map button
    const recreateBtn = document.createElement('button');
    recreateBtn.textContent = 'Recreate Map';

    // Track the latest requested map generation and worker state
    let mapGenerationToken = 0;
    let currentWorker: Worker | null = null;
    let currentMap: WorldMap | null = null;
    let mapCanvas: HTMLCanvasElement | null = null;

    function triggerMapGeneration() {
      mapGenerationToken++;
      if (currentWorker) {
        currentWorker.terminate();
      }
      currentWorker = new Worker(new URL('./mapWorker.ts', import.meta.url), { type: 'module' });
      spinner.style.display = 'block';
      if (mapCanvas) mapPreviewDiv.removeChild(mapCanvas);
      const thisToken = mapGenerationToken;
      currentWorker.onmessage = (event: MessageEvent) => {
        if (thisToken !== mapGenerationToken) return;
        const { map, countries } = event.data.result;
        // Reconstruct countries as real Country instances
        // Step 1: Reconstruct all countries (neighbors left empty for now)
        const reconstructedCountries = countries.map((c: any) => {
          const country = new Country(c.name, c.owner, c.armies, c.income);
          country.coordinates = c.coordinates;
          country.border = c.border;
          country.oceanBorder = c.oceanBorder;
          country.color = c.color;
          return country;
        });
        // Step 2: Build a lookup map by name
        const countryMap = new Map(reconstructedCountries.map((c: Country) => [c.name, c]));
        // Log country order after transfer
        //WorldMap.logCountryNamesInOrder(reconstructedCountries, 'after transfer');
        // Step 3: Assign neighbors by reference
        countries.forEach((c: any, i: number) => {
          reconstructedCountries[i].neighbors = (c.neighbors || [])
            .map((n: any) => countryMap.get(n.name))
            .filter(Boolean);
        });
        // Reconstruct WorldMap from plain data, restoring prototype for methods
        const worldMap = Object.assign(Object.create(WorldMap.prototype), {
          map,
          countries: reconstructedCountries,
        });
        // Consistency check: ensure map indices match countries array
        if (!WorldMap.checkMapCountryConsistency(map, reconstructedCountries)) {
          console.warn('[WorldMap] Consistency check failed after reconstructing from worker!');
        }
        currentMap = worldMap as WorldMap;
        if (!currentMap) {
          throw new Error('WorldMap is null when rendering map preview.');
        }
        mapCanvas = Renderer.render(currentMap, [], [], true);
        // Only set style for preview scaling, do not touch attribute width/height
        mapCanvas.style.width = '585px';
        mapCanvas.style.height = '312px';
        mapCanvas.style.display = 'block';
        spinner.style.display = 'none';
        mapPreviewDiv.appendChild(mapCanvas);
        currentWorker?.terminate();
        currentWorker = null;
      };
      currentWorker.postMessage({ type: 'generate', width: 1200, height: 800, countryCount: 40 });
    }
    recreateBtn.onclick = triggerMapGeneration;
    // Automatically trigger map generation when dialog opens
    triggerMapGeneration();
    recreateBtn.style.margin = '0 0 0 0';
    recreateBtn.style.padding = '10px 20px';
    recreateBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    recreateBtn.style.color = '#fff';
    recreateBtn.style.border = 'none';
    recreateBtn.style.borderRadius = '8px';
    recreateBtn.style.fontWeight = 'bold';
    recreateBtn.style.fontSize = '1rem';
    recreateBtn.style.cursor = 'pointer';
    recreateBtn.style.marginTop = '4px';
    recreateBtn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    recreateBtn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    recreateBtn.onmouseenter = () => recreateBtn.style.background = 'linear-gradient(90deg,#185a9d 0%,#43cea2 100%)';
    recreateBtn.onmouseleave = () => recreateBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    leftCol.appendChild(recreateBtn);

    // Right: Player controls column
    const rightCol = document.createElement('div');
    rightCol.style.flex = '1.5';
    rightCol.style.display = 'flex';
    rightCol.style.flexDirection = 'column';
    rightCol.style.alignItems = 'stretch';
    rightCol.style.justifyContent = 'flex-start';
    rightCol.style.padding = '36px 32px 24px 24px';
    rightCol.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    main.appendChild(rightCol);

    // Player list state
    let players: PlayerConfig[] = [];
    let nextColorIdx = 0;

    // Emperor name reservoir
    const EMPEROR_NAMES = [
      'Augustus', 'Charlemagne', 'Qin Shi Huang', 'Akbar', 'Justinian',
      'Napoleon', 'Constantine', 'Ashoka', 'Catherine', 'Meiji',
      'Trajan', 'Hadrian', 'Aurangzeb', 'Elizabeth', 'Peter',
      'Victoria', 'Franz Joseph', 'Wilhelm', 'Haile Selassie', 'Menelik'
    ];
    let usedEmperorNames: string[] = [];
    function getRandomEmperorName() {
      if (usedEmperorNames.length >= EMPEROR_NAMES.length) usedEmperorNames = [];
      const available = EMPEROR_NAMES.filter(n => !usedEmperorNames.includes(n));
      const name = available[Math.floor(Math.random() * available.length)];
      usedEmperorNames.push(name);
      return name;
    }

    // --- PLAYER CONTROLS COLUMN ---
    // Player list label
    const playerListLabel = document.createElement('div');
    playerListLabel.textContent = 'Players';
    playerListLabel.style.fontWeight = 'bold';
    playerListLabel.style.fontSize = '1.1rem';
    playerListLabel.style.color = '#fff';
    playerListLabel.style.marginBottom = '8px';
    playerListLabel.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    rightCol.appendChild(playerListLabel);

    // Player list (scrollable)
    const playerList = document.createElement('ul');
    playerList.style.listStyle = 'none';
    playerList.style.padding = '0';
    playerList.style.margin = '0 0 14px 0';
    playerList.style.background = 'rgba(36,40,44,0.93)';
    playerList.style.border = '1px solid #333';
    playerList.style.borderRadius = '8px';
    playerList.style.maxHeight = '320px';
    playerList.style.overflowY = 'auto';
    playerList.style.boxShadow = '0 2px 8px rgba(30,32,34,0.10)';
    playerList.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    rightCol.appendChild(playerList);

    function updatePlayerList() {
      playerList.innerHTML = '';
      players.forEach((p, idx) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.marginBottom = '6px';
        li.style.color = '#fff';
        li.style.background = 'rgba(60,70,80,0.18)';
        li.style.borderRadius = '6px';
        li.style.padding = '6px 10px';
        li.style.boxShadow = '0 1px 4px rgba(30,32,34,0.09)';
        li.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
        // Player color swatch
        const colorSwatch = document.createElement('span');
        colorSwatch.style.display = 'inline-block';
        colorSwatch.style.width = '18px';
        colorSwatch.style.height = '18px';
        colorSwatch.style.borderRadius = '4px';
        colorSwatch.style.background = p.color;
        colorSwatch.style.marginRight = '10px';
        colorSwatch.style.border = '2px solid #222';
        li.appendChild(colorSwatch);
        // Player name and AI badge
        // Inline editable player name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${p.name}`;
        nameSpan.style.flex = '1';
        nameSpan.style.cursor = 'pointer';
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";

    nameSpan.onclick = () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = p.name;
      input.style.flex = '1';
      input.style.fontWeight = 'bold';
      input.style.fontSize = '1.05rem';
      input.style.background = 'rgba(60,70,80,0.18)';
      input.style.color = '#fff';
      input.style.border = 'none';
      input.style.borderBottom = '2px solid #43cea2';
      input.style.outline = 'none';
      input.style.padding = '2px 0';
      input.style.margin = '0';
      input.style.borderRadius = '0';
      input.style.transition = 'border-color 0.2s';
      input.autofocus = true;
          input.style.fontSize = '1.05rem';
          input.style.background = 'rgba(60,70,80,0.18)';
          input.style.color = '#fff';
          input.style.border = 'none';
          input.style.borderBottom = '2px solid #43cea2';
          input.style.outline = 'none';
          input.style.padding = '2px 0';
          input.style.margin = '0';
          input.style.borderRadius = '0';
          input.style.transition = 'border-color 0.2s';
          input.autofocus = true;

          // Replace span with input
          li.replaceChild(input, nameSpan);
          input.focus();
          input.select();

          // Save on blur or Enter
          function save() {
            const newName = input.value.trim() || p.name;
            p.name = newName;
            updatePlayerList();
            resolve({
              map: currentMap!,
              players: players,
              showArmies: showArmiesCheckbox.checked
            });
          }
          input.addEventListener('blur', save);
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              input.blur();
            } else if (e.key === 'Escape') {
              updatePlayerList();
            }
          });
        };
        li.appendChild(nameSpan);
        if (p.isAI) {
          const aiBadge = document.createElement('span');
          aiBadge.textContent = 'AI';
          aiBadge.style.background = 'linear-gradient(90deg,#ff9966 0%,#ff5e62 100%)';
          aiBadge.style.color = '#fff';
          aiBadge.style.fontSize = '0.85em';
          aiBadge.style.fontWeight = 'bold';
          aiBadge.style.borderRadius = '3px';
          aiBadge.style.padding = '2px 7px';
          aiBadge.style.marginLeft = '8px';
          aiBadge.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
          li.appendChild(aiBadge);
        }
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✖';
        removeBtn.style.marginLeft = '10px';
        removeBtn.style.background = 'linear-gradient(90deg,#e57373 0%,#ffb74d 100%)';
        removeBtn.style.border = 'none';
        removeBtn.style.borderRadius = '4px';
        removeBtn.style.color = '#fff';
        removeBtn.style.fontWeight = 'bold';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.padding = '2px 8px';
        removeBtn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
        removeBtn.onmouseenter = () => removeBtn.style.background = 'linear-gradient(90deg,#ffb74d 0%,#e57373 100%)';
        removeBtn.onmouseleave = () => removeBtn.style.background = 'linear-gradient(90deg,#e57373 0%,#ffb74d 100%)';
        removeBtn.onclick = () => {
          players.splice(idx, 1);
          updatePlayerList();
          updateStartBtn();
        };
        li.appendChild(removeBtn);
        playerList.appendChild(li);
      });
    }

    // --- PLAYER BUTTONS ---
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '14px';
    btnRow.style.marginBottom = '18px';
    rightCol.appendChild(btnRow);

    // Add human player button
    const addHumanBtn = document.createElement('button');
    addHumanBtn.textContent = 'Add Human';
    addHumanBtn.style.flex = '1';
    addHumanBtn.style.padding = '8px 0';
    addHumanBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    addHumanBtn.style.color = '#fff';
    addHumanBtn.style.border = 'none';
    addHumanBtn.style.borderRadius = '8px';
    addHumanBtn.style.fontWeight = 'bold';
    addHumanBtn.style.fontSize = '1rem';
    addHumanBtn.style.cursor = 'pointer';
    addHumanBtn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    addHumanBtn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    addHumanBtn.onmouseenter = () => addHumanBtn.style.background = 'linear-gradient(90deg,#185a9d 0%,#43cea2 100%)';
    addHumanBtn.onmouseleave = () => addHumanBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    addHumanBtn.onclick = () => {
      if (players.length >= 8) return;
      const name = getRandomEmperorName();
      const color = Player.COLORS[nextColorIdx % Player.COLORS.length];
      const playerConfig = { name, isAI: false, color };
      // Only add if less than 8
      if (players.length < 8) {
        players.push(playerConfig);
        nextColorIdx++;
        updatePlayerList();
        updateStartBtn();
      }
    };
    btnRow.appendChild(addHumanBtn);

    // Add AI player button
    const addAIBtn = document.createElement('button');
    addAIBtn.textContent = 'Add AI';
    addAIBtn.style.flex = '1';
    addAIBtn.style.padding = '8px 0';
    addAIBtn.style.background = 'linear-gradient(90deg,#ff9966 0%,#ff5e62 100%)';
    addAIBtn.style.color = '#fff';
    addAIBtn.style.border = 'none';
    addAIBtn.style.borderRadius = '8px';
    addAIBtn.style.fontWeight = 'bold';
    addAIBtn.style.fontSize = '1rem';
    addAIBtn.style.cursor = 'pointer';
    addAIBtn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    addAIBtn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    addAIBtn.onmouseenter = () => addAIBtn.style.background = 'linear-gradient(90deg,#ff5e62 0%,#ff9966 100%)';
    addAIBtn.onmouseleave = () => addAIBtn.style.background = 'linear-gradient(90deg,#ff9966 0%,#ff5e62 100%)';
    addAIBtn.onclick = () => {
      if (players.length >= 8) return;
      const name = getRandomEmperorName() + ' AI';
      const color = Player.COLORS[nextColorIdx % Player.COLORS.length];
      const playerConfig = { name, isAI: true, color };
      // Only add if less than 8
      if (players.length < 8) {
        players.push(playerConfig);
        nextColorIdx++;
        updatePlayerList();
        updateStartBtn();
      }
    };
    btnRow.appendChild(addAIBtn);

    // --- START/CANCEL BUTTONS ---
    const actionRow = document.createElement('div');
    actionRow.style.display = 'flex';
    actionRow.style.gap = '16px';
    actionRow.style.marginTop = 'auto';
    rightCol.appendChild(actionRow);

    // Start game button
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Game';
    startBtn.style.flex = '2';
    startBtn.style.padding = '12px 0';
    startBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    startBtn.style.color = '#fff';
    startBtn.style.border = 'none';
    startBtn.style.borderRadius = '8px';
    startBtn.style.fontWeight = 'bold';
    startBtn.style.fontSize = '1.1rem';
    startBtn.style.cursor = 'pointer';
    startBtn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    startBtn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    startBtn.disabled = true;
    startBtn.onmouseenter = () => startBtn.style.background = 'linear-gradient(90deg,#185a9d 0%,#43cea2 100%)';
    startBtn.onmouseleave = () => startBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    actionRow.appendChild(startBtn);

    function updateStartBtn() {
      // Defensive disabling removed: always enable start button
    startBtn.disabled = false;
    }

    startBtn.onclick = () => {
      if (!currentMap || players.length < 2) return;
      document.body.removeChild(overlay);
      resolve({ map: currentMap, players, showArmies: showArmiesCheckbox.checked });
    };

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.flex = '1';
    cancelBtn.style.padding = '12px 0';
    cancelBtn.style.background = 'linear-gradient(90deg,#e57373 0%,#ffb74d 100%)';
    cancelBtn.style.color = '#fff';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '8px';
    cancelBtn.style.fontWeight = 'bold';
    cancelBtn.style.fontSize = '1.1rem';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.boxShadow = '0 2px 8px rgba(30,32,34,0.13)';
    cancelBtn.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
    cancelBtn.onmouseenter = () => cancelBtn.style.background = 'linear-gradient(90deg,#ffb74d 0%,#e57373 100%)';
    cancelBtn.onmouseleave = () => cancelBtn.style.background = 'linear-gradient(90deg,#e57373 0%,#ffb74d 100%)';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
      reject();
    };
    actionRow.appendChild(cancelBtn);

    // Cancel on ESC or click outside
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        reject();
      }
    };
    document.addEventListener('keydown', function escListener(ev) {
      if (ev.key === 'Escape') {
        document.body.removeChild(overlay);
        document.removeEventListener('keydown', escListener);
        reject();
      }
    });

    // Add Show Armies checkbox
    const showArmiesDiv = document.createElement('div');
    showArmiesDiv.style.margin = '12px 0 0 0';
    showArmiesDiv.style.display = 'flex';
    showArmiesDiv.style.alignItems = 'center';
    const showArmiesCheckbox = document.createElement('input');
    showArmiesCheckbox.type = 'checkbox';
    showArmiesCheckbox.id = 'show-armies-checkbox';
    showArmiesCheckbox.style.marginRight = '8px';
    const showArmiesLabel = document.createElement('label');
    showArmiesLabel.htmlFor = 'show-armies-checkbox';
    showArmiesLabel.textContent = 'Show Armies';
    showArmiesDiv.appendChild(showArmiesCheckbox);
    showArmiesDiv.appendChild(showArmiesLabel);
    rightCol.appendChild(showArmiesDiv);

    // Add to DOM
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    updatePlayerList();
    updateStartBtn();
  });
}
