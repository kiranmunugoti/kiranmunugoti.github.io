// Portfolio Repository Loader
// Fetches repository data from GitHub API and renders it dynamically

class PortfolioRepoLoader {
  constructor(configUrl = './repos-config.json') {
    this.configUrl = configUrl;
    this.config = null;
    this.repos = [];
  }

  // Load configuration file
  async loadConfig() {
    try {
      const response = await fetch(this.configUrl);
      if (!response.ok) throw new Error('Failed to load config');
      this.config = await response.json();
      return this.config;
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }

  // Fetch repository data from GitHub API
  async fetchRepoData(owner, repo) {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!response.ok) throw new Error(`Failed to fetch repo: ${repo}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${repo}:`, error);
      return null;
    }
  }

  // Fetch README from repository
  async fetchReadme(owner, repo, path = '') {
    try {
      let url = `https://api.github.com/repos/${owner}/${repo}/readme`;
      if (path) {
        url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}/README.md`;
      }
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
      });
      
      if (!response.ok) return null;
      return await response.text();
    } catch (error) {
      console.error(`Error fetching README from ${repo}/${path}:`, error);
      return null;
    }
  }

  // Parse markdown to HTML (basic)
  markdownToHtml(markdown) {
    if (!markdown) return '';
    return markdown
      .split('\n')
      .map(line => {
        if (line.startsWith('# ')) return `<h2>${line.slice(2)}</h2>`;
        if (line.startsWith('## ')) return `<h3>${line.slice(3)}</h3>`;
        if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
        if (line.trim()) return `<p>${line}</p>`;
        return '';
      })
      .join('');
  }

  // Build repository card HTML
  createRepoCard(config, repoData) {
    const stars = repoData?.stargazers_count || 0;
    const language = repoData?.language || 'Not specified';
    const url = `https://github.com/${this.config.username}/${config.repo}/tree/main/${config.path || ''}`;
    
    return `
      <div class="repo-card">
        <div class="repo-header">
          <h3>${config.name}</h3>
          <a href="${url}" target="_blank" class="repo-link">View on GitHub →</a>
        </div>
        <p class="repo-description">${config.description}</p>
        <div class="repo-meta">
          <span class="language">📌 ${language}</span>
          <span class="stars">⭐ ${stars} stars</span>
        </div>
        <div class="repo-tags">
          ${config.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <a href="${url}" target="_blank" class="repo-cta">Explore Project</a>
      </div>
    `;
  }

  // Render all repositories
  async renderRepositories(containerId = 'projects-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }

    // Load config
    await this.loadConfig();
    if (!this.config) {
      container.innerHTML = '<p>Error loading repositories</p>';
      return;
    }

    // Fetch data for each repo
    const cards = [];
    for (const repoConfig of this.config.repositories) {
      const repoData = await this.fetchRepoData(this.config.username, repoConfig.repo);
      const card = this.createRepoCard(repoConfig, repoData);
      cards.push(card);
    }

    // Render all cards
    container.innerHTML = `
      <div class="repos-grid">
        ${cards.join('')}
      </div>
    `;
  }

  // Update repository (call when config changes)
  async updateRepositories(containerId = 'projects-container') {
    await this.renderRepositories(containerId);
  }
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const loader = new PortfolioRepoLoader('./repos-config.json');
  loader.renderRepositories('projects-container');
});
