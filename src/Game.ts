export class Game {
  private state: string;

  constructor() {
    this.state = 'initialized';
  }

  mount(container: HTMLElement) {
    const title = document.createElement('h1');
    title.textContent = 'Game App';
    container.appendChild(title);
    // Add more rendering logic here
  }
}
