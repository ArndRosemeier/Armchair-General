import { WorldMap } from './WorldMap';
import { Renderer } from './Renderer';

export type PlayerConfig = { name: string; isAI: boolean };

export interface NewGameDialogResult {
  map: WorldMap;
  players: PlayerConfig[];
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
    dialog.style.width = 'min(96vw, 760px)';
    dialog.style.height = 'min(96vh, 520px)';
    dialog.style.minWidth = '600px';
    dialog.style.minHeight = '440px';
    dialog.style.background = 'linear-gradient(120deg, #232526 0%, #414345 100%)';
    dialog.style.borderRadius = '20px';
    dialog.style.boxShadow = '0 12px 48px rgba(0,0,0,0.55)';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.alignItems = 'stretch';
    dialog.style.justifyContent = 'flex-start';
    dialog.style.padding = '0';
    dialog.style.overflow = 'hidden';

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
    leftCol.style.flex = '1.1';
    leftCol.style.display = 'flex';
    leftCol.style.flexDirection = 'column';
    leftCol.style.alignItems = 'center';
    leftCol.style.justifyContent = 'center';
    leftCol.style.background = 'linear-gradient(135deg, #232526 0%, #232526 100%)';
    leftCol.style.padding = '36px 16px 24px 32px';
    leftCol.style.borderRight = '2px solid #333';
    main.appendChild(leftCol);

    // Map preview area (3:2 ratio, e.g. 300x200)
    const mapPreviewDiv = document.createElement('div');
    mapPreviewDiv.style.width = '300px';
    mapPreviewDiv.style.height = '200px';
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
    recreateBtn.onclick = generateAndShowMap;
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
    main.appendChild(rightCol);

    // Map state
    let currentMap: WorldMap | null = null;
    let mapCanvas: HTMLCanvasElement | null = null;
    async function generateAndShowMap() {
      spinner.style.display = 'block';
      if (mapCanvas) mapPreviewDiv.removeChild(mapCanvas);
      // Generate a 1200x800 map
      currentMap = await Promise.resolve(WorldMap.createMap(1200, 800, 40));
      mapCanvas = Renderer.render(currentMap);
      mapCanvas.style.width = '300px'; // scale to fit preview box
      mapCanvas.style.height = '200px';
      mapCanvas.style.objectFit = 'cover'; // ensure no distortion
      mapCanvas.style.display = 'block';
      spinner.style.display = 'none';
      mapPreviewDiv.appendChild(mapCanvas);
    }


    // Player list state
    let players: PlayerConfig[] = [];

    // --- PLAYER CONTROLS COLUMN ---
    // Player list label
    const playerListLabel = document.createElement('div');
    playerListLabel.textContent = 'Players';
    playerListLabel.style.fontWeight = 'bold';
    playerListLabel.style.fontSize = '1.1rem';
    playerListLabel.style.color = '#fff';
    playerListLabel.style.marginBottom = '8px';
    rightCol.appendChild(playerListLabel);

    // Player list (scrollable)
    const playerList = document.createElement('ul');
    playerList.style.listStyle = 'none';
    playerList.style.padding = '0';
    playerList.style.margin = '0 0 14px 0';
    playerList.style.background = 'rgba(36,40,44,0.93)';
    playerList.style.border = '1px solid #333';
    playerList.style.borderRadius = '8px';
    playerList.style.maxHeight = '160px';
    playerList.style.overflowY = 'auto';
    playerList.style.boxShadow = '0 2px 8px rgba(30,32,34,0.10)';
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
        // Player name and AI badge
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${p.name}`;
        nameSpan.style.flex = '1';
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
    addHumanBtn.onmouseenter = () => addHumanBtn.style.background = 'linear-gradient(90deg,#185a9d 0%,#43cea2 100%)';
    addHumanBtn.onmouseleave = () => addHumanBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    addHumanBtn.onclick = () => {
      players.push({ name: `Human ${players.filter(p=>!p.isAI).length+1}`, isAI: false });
      updatePlayerList();
      updateStartBtn();
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
    addAIBtn.onmouseenter = () => addAIBtn.style.background = 'linear-gradient(90deg,#ff5e62 0%,#ff9966 100%)';
    addAIBtn.onmouseleave = () => addAIBtn.style.background = 'linear-gradient(90deg,#ff9966 0%,#ff5e62 100%)';
    addAIBtn.onclick = () => {
      players.push({ name: `AI ${players.filter(p=>p.isAI).length+1}`, isAI: true });
      updatePlayerList();
      updateStartBtn();
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
    startBtn.disabled = true;
    startBtn.onmouseenter = () => startBtn.style.background = 'linear-gradient(90deg,#185a9d 0%,#43cea2 100%)';
    startBtn.onmouseleave = () => startBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
    actionRow.appendChild(startBtn);

    function updateStartBtn() {
      startBtn.disabled = players.length < 2 || !currentMap;
    }

    startBtn.onclick = () => {
      if (!currentMap || players.length < 2) return;
      document.body.removeChild(overlay);
      resolve({ map: currentMap, players });
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

    // Add to DOM
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    updatePlayerList();
    updateStartBtn();
  });
}
