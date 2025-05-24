// FunReader.ts
// Renders formatted text (like the manual) in a fun, old-fashioned way

export class FunReader {
  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  renderTo(container: HTMLElement) {
    container.innerHTML = '';
    container.style.padding = '2.7em 3.2em 2.7em 3.2em';
    container.style.fontFamily = "UnifrakturCook, UnifrakturMaguntia, serif";
    container.style.color = '#3a2c13';
    container.style.lineHeight = '1.8';
    container.style.maxWidth = 'none';
    container.style.width = '100%';
    container.style.margin = '2.2em 0';
    container.style.boxSizing = 'border-box';
    container.style.fontSize = '1.38em';
    container.style.background =
      "url('https://www.transparenttextures.com/patterns/old-mathematics.png'), " +
      "url('https://www.transparenttextures.com/patterns/noise.png'), " +
      "radial-gradient(ellipse at 60% 40%, #f8f5e1 70%, #f3e7c6 100%)";
    container.style.backgroundBlendMode = 'multiply, multiply';
    container.style.border = '4px double #bfa76f';
    container.style.borderRadius = '18px';
    container.style.boxShadow = '0 0 32px #bfa76f55, 0 0 0 8px #fffbe6cc inset';
    container.style.textShadow = '0 1px 0 #fffbe6, 0 0 6px #fffbe6cc';
    // Split into lines and parse
    const lines = this.text.split(/\r?\n/);
    let inList = false;
    let inFAQ = false;
    let faqBlock = '';
    lines.forEach((line, idx) => {
      // Headings
      if (/^=+/.test(line)) {
        // Main title
        const h = document.createElement('h1');
        h.textContent = line.replace(/=+/g, '').trim();
        h.style.fontFamily = 'UnifrakturCook, UnifrakturMaguntia, serif';
        h.style.fontSize = '3.2em';
        h.style.letterSpacing = '0.13em';
        h.style.textShadow = '0 0 18px #fffbe6, 0 2px 12px #bfa76f, 0 0 2px #fffbe6';
        h.style.textAlign = 'center';
        h.style.margin = '0.9em 0 0.6em 0';
        h.style.color = '#bfa76f';
        h.style.borderBottom = '3px solid #bfa76f';
        h.style.paddingBottom = '0.2em';
        h.style.position = 'relative';
        h.innerHTML = `<span style="font-family:'UnifrakturCook',serif;font-size:1.2em;vertical-align:middle;">&#10070;</span> ` + h.textContent + ` <span style="font-family:'UnifrakturCook',serif;font-size:1.2em;vertical-align:middle;">&#10070;</span>`;
        container.appendChild(h);
        return;
      }
      if (/^\d+\./.test(line)) {
        // Numbered section
        const h = document.createElement('h2');
        h.textContent = line.replace(/^\d+\./, '').trim();
        h.style.fontFamily = 'UnifrakturCook, UnifrakturMaguntia, serif';
        h.style.fontSize = '2.1em';
        h.style.margin = '1.5em 0 0.4em 0';
        h.style.color = '#bfa76f';
        h.style.textShadow = '0 0 10px #fffbe6, 0 0 2px #bfa76f';
        h.style.borderBottom = '2px dashed #bfa76f';
        h.style.paddingBottom = '0.12em';
        h.style.position = 'relative';
        h.innerHTML = `<span style="font-family:'UnifrakturCook',serif;font-size:1.1em;vertical-align:middle;">&#10070;</span> ` + h.textContent;
        container.appendChild(h);
        return;
      }
      if (/^-{2,}/.test(line)) {
        // Section underline, skip
        return;
      }
      if (/^\s*\- /.test(line)) {
        // List item
        if (!inList) {
          inList = true;
          const ul = document.createElement('ul');
          ul.style.margin = '0.7em 0 0.7em 2.2em';
          ul.style.fontSize = '1.18em';
          ul.style.listStyleType = '"\u2738  ";';
          ul.style.color = '#7a5c1b';
          ul.style.fontFamily = "UnifrakturCook, UnifrakturMaguntia, serif";
          container.appendChild(ul);
        }
        const ul = container.lastElementChild as HTMLUListElement;
        const li = document.createElement('li');
        li.innerHTML = this.parseInline(line.replace(/^\s*\- /, ''));
        li.style.marginBottom = '0.3em';
        li.style.textShadow = '0 0 4px #fffbe6';
        ul.appendChild(li);
        return;
      } else if (inList) {
        inList = false;
      }
      // FAQ block
      if (/^Q: /.test(line)) {
        inFAQ = true;
        faqBlock += `<div class="faq-q"><span class="faq-q-label">Q:</span> ${this.parseInline(line.slice(3))}</div>`;
        return;
      }
      if (/^A: /.test(line)) {
        faqBlock += `<div class="faq-a"><span class="faq-a-label">A:</span> ${this.parseInline(line.slice(3))}</div>`;
        // If next line is not Q: or A:, flush
        if (!/^Q: |^A: /.test(lines[idx + 1] || '')) {
          const faqDiv = document.createElement('div');
          faqDiv.className = 'faq-block';
          faqDiv.innerHTML = faqBlock;
          faqDiv.style.background = 'linear-gradient(135deg,#fffbe6 60%,#f3e7c6 100%)';
          faqDiv.style.border = '3px double #bfa76f';
          faqDiv.style.borderRadius = '14px';
          faqDiv.style.margin = '1.5em 0';
          faqDiv.style.padding = '1.2em 2em';
          faqDiv.style.boxShadow = '0 0 16px #bfa76f33, 0 0 0 4px #fffbe6cc inset';
          faqDiv.style.fontFamily = "UnifrakturCook, UnifrakturMaguntia, serif";
          faqDiv.style.fontSize = '1.18em';
          faqDiv.style.textShadow = '0 0 6px #fffbe6';
          container.appendChild(faqDiv);
          faqBlock = '';
          inFAQ = false;
        }
        return;
      }
      // Paragraphs
      if (line.trim() === '') {
        if (inList) inList = false;
        return;
      }
      // Drop cap for first paragraph
      if (container.childElementCount === 0 && line.trim().length > 0) {
        const p = document.createElement('p');
        p.innerHTML = `<span style="float:left;font-size:2.8em;font-family:'UnifrakturCook','UnifrakturMaguntia',serif;color:#bfa76f;line-height:0.7;margin-right:0.22em;text-shadow:0 0 8px #fffbe6,0 0 2px #bfa76f;">${line.trim()[0]}</span>${this.parseInline(line.trim().slice(1))}`;
        p.style.fontSize = '1.32em';
        p.style.margin = '1.5em 0 0.9em 0';
        p.style.textAlign = 'justify';
        p.style.letterSpacing = '0.01em';
        container.appendChild(p);
        return;
      }
      // Normal paragraph
      if (line.trim().length > 0) {
        const p = document.createElement('p');
        p.innerHTML = this.parseInline(line.trim());
        p.style.fontSize = '1.19em';
        p.style.margin = '0.8em 0';
        p.style.textAlign = 'justify';
        p.style.letterSpacing = '0.01em';
        p.style.textShadow = '0 0 4px #fffbe6';
        container.appendChild(p);
        return;
      }
    });
    // Add FAQ styles
    const style = document.createElement('style');
    style.textContent = `
      .faq-q-label { color: #b22222; font-weight: bold; margin-right: 0.3em; }
      .faq-a-label { color: #1a5c1a; font-weight: bold; margin-right: 0.3em; }
      .faq-q { margin-bottom: 0.2em; }
      .faq-a { margin-bottom: 0.7em; }
    `;
    container.appendChild(style);
  }

  // Parse inline formatting (bold, etc.)
  private parseInline(text: string): string {
    // Bold: **text** or __text__
    return text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
               .replace(/__(.+?)__/g, '<b>$1</b>');
  }
} 