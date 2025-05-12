/**
 * Shows a modal dialog to select an amount between min and max.
 * Allows increment/decrement by 1k, 10k, 100k, min/max, and cancel/ok.
 * Returns a Promise<number|null> (null if cancelled).
 */
export function showAmountDialog(min: number, max: number, initial: number = min): Promise<number|null> {
  return new Promise((resolve) => {
    // Overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '10000';

    // Dialog box
    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '32px 40px';
    box.style.borderRadius = '12px';
    box.style.boxShadow = '0 2px 16px rgba(0,0,0,0.2)';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.alignItems = 'center';
    box.style.gap = '18px';

    const label = document.createElement('div');
    label.textContent = `Select amount to commit:`;
    label.style.fontSize = '1.2rem';
    label.style.marginBottom = '8px';
    box.appendChild(label);

    // Amount display
    let amount = Math.max(min, Math.min(max, initial));
    const amountDisplay = document.createElement('div');
    amountDisplay.textContent = amount.toLocaleString();
    amountDisplay.style.fontSize = '2rem';
    amountDisplay.style.fontWeight = 'bold';
    amountDisplay.style.margin = '8px 0';
    box.appendChild(amountDisplay);

    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '6px';

    function updateAmount(newAmt: number) {
      amount = Math.max(min, Math.min(max, newAmt));
      amountDisplay.textContent = amount.toLocaleString();
    }

    function makeBtn(text: string, onClick: () => void) {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.padding = '6px 14px';
      btn.style.fontSize = '1.1rem';
      btn.style.border = 'none';
      btn.style.borderRadius = '6px';
      btn.style.background = 'linear-gradient(90deg,#43cea2 0%,#185a9d 100%)';
      btn.style.color = '#fff';
      btn.style.cursor = 'pointer';
      btn.onclick = onClick;
      return btn;
    }

    btnRow.appendChild(makeBtn('-100k', () => updateAmount(amount - 100000)));
    btnRow.appendChild(makeBtn('-10k', () => updateAmount(amount - 10000)));
    btnRow.appendChild(makeBtn('-1k', () => updateAmount(amount - 1000)));
    btnRow.appendChild(makeBtn('Min', () => updateAmount(min)));
    btnRow.appendChild(makeBtn('Max', () => updateAmount(max)));
    btnRow.appendChild(makeBtn('+1k', () => updateAmount(amount + 1000)));
    btnRow.appendChild(makeBtn('+10k', () => updateAmount(amount + 10000)));
    btnRow.appendChild(makeBtn('+100k', () => updateAmount(amount + 100000)));
    box.appendChild(btnRow);

    // OK/Cancel
    const okCancelRow = document.createElement('div');
    okCancelRow.style.display = 'flex';
    okCancelRow.style.gap = '12px';
    okCancelRow.style.marginTop = '18px';

    const okBtn = makeBtn('OK', () => {
      document.body.removeChild(overlay);
      resolve(amount);
    });
    okBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#43e97b 100%)';
    okBtn.style.fontWeight = 'bold';
    const cancelBtn = makeBtn('Cancel', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });
    cancelBtn.style.background = 'linear-gradient(90deg,#e57373 0%,#ffb74d 100%)';
    okCancelRow.appendChild(okBtn);
    okCancelRow.appendChild(cancelBtn);
    box.appendChild(okCancelRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    // Focus OK by default
    okBtn.focus();
  });
}
