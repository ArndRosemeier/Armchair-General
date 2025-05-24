// FunReader.ts
// Renders formatted text (like the manual) in a fun, old-fashioned way

export class FunReader {
  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  renderTo(container: HTMLElement) {
    container.innerHTML = '';
    container.style.padding = '2em';
    container.style.fontFamily = '"UnifrakturCook", "Cinzel Decorative", "Old English Text MT", serif';
    container.style.color = '#3a2c13';
    container.style.lineHeight = '1.7';
    container.style.maxWidth = 'none';
    container.style.width = '100%';
    container.style.margin = '2em 0';
    container.style.boxSizing = 'border-box';
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
        h.style.fontFamily = 'Cinzel Decorative, serif';
        h.style.fontSize = '2.6em';
        h.style.letterSpacing = '0.12em';
        h.style.textShadow = '0 0 16px #fffbe6, 0 2px 8px #bfa76f';
        h.style.textAlign = 'center';
        h.style.margin = '0.7em 0 0.5em 0';
        container.appendChild(h);
        return;
      }
      if (/^\d+\./.test(line)) {
        // Numbered section
        const h = document.createElement('h2');
        h.textContent = line.replace(/^\d+\./, '').trim();
        h.style.fontFamily = 'Cinzel Decorative, serif';
        h.style.fontSize = '1.7em';
        h.style.margin = '1.2em 0 0.3em 0';
        h.style.color = '#7a5c1b';
        h.style.textShadow = '0 0 8px #fffbe6';
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
          ul.style.margin = '0.5em 0 0.5em 2em';
          ul.style.fontSize = '1.1em';
          ul.style.listStyleType = 'square';
          container.appendChild(ul);
        }
        const ul = container.lastElementChild as HTMLUListElement;
        const li = document.createElement('li');
        li.innerHTML = this.parseInline(line.replace(/^\s*\- /, ''));
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
          faqDiv.style.background = '#fffbe6';
          faqDiv.style.border = '2px solid #bfa76f';
          faqDiv.style.borderRadius = '10px';
          faqDiv.style.margin = '1.2em 0';
          faqDiv.style.padding = '1em 1.5em';
          faqDiv.style.boxShadow = '0 0 8px #bfa76f33';
          faqDiv.style.fontFamily = 'Cinzel, serif';
          faqDiv.style.fontSize = '1.08em';
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
        p.innerHTML = `<span style="float:left;font-size:2.2em;font-family:'Cinzel Decorative',serif;color:#bfa76f;line-height:0.8;margin-right:0.18em;">${line.trim()[0]}</span>${this.parseInline(line.trim().slice(1))}`;
        p.style.fontSize = '1.18em';
        p.style.margin = '1.2em 0 0.7em 0';
        p.style.textAlign = 'justify';
        container.appendChild(p);
        return;
      }
      // Normal paragraph
      if (line.trim().length > 0) {
        const p = document.createElement('p');
        p.innerHTML = this.parseInline(line.trim());
        p.style.fontSize = '1.13em';
        p.style.margin = '0.7em 0';
        p.style.textAlign = 'justify';
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