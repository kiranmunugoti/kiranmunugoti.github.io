// Self-Mounting Portfolio Repository Loader
// Automatically finds a suitable spot on the page and injects project cards.
// Requires ONLY a single <script src="portfolio-repos.js"></script> tag in index.html —
// no container div, no other markup changes needed, ever.

(function () {
  const CONFIG_URL = './repos-config.json';

  async function loadConfig() {
    try {
      const res = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load repos-config.json');
      return await res.json();
    } catch (err) {
      console.error('[portfolio-repos] config load error:', err);
      return null;
    }
  }

  async function fetchRepoData(owner, repo) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function createRepoCard(username, config, repoData) {
    const stars = repoData?.stargazers_count ?? 0;
    const language = repoData?.language || 'N/A';
    const url = `https://github.com/${username}/${config.repo}${config.path ? '/tree/main/' + config.path : ''}`;

    const card = document.createElement('div');
    card.className = 'pr-repo-card';
    card.innerHTML = `
      <div class="pr-repo-header">
        <h3>${escapeHtml(config.name)}</h3>
        <a href="${url}" target="_blank" rel="noopener" class="pr-repo-link">View on GitHub →</a>
      </div>
      <p class="pr-repo-description">${escapeHtml(config.description || '')}</p>
      <div class="pr-repo-meta">
        <span>📌 ${escapeHtml(language)}</span>
        <span>⭐ ${stars} stars</span>
      </div>
      <div class="pr-repo-tags">
        ${(config.tags || []).map(tag => `<span class="pr-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <a href="${url}" target="_blank" rel="noopener" class="pr-repo-cta">Explore Project</a>
    `;
    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  // Injects the minimal CSS this widget needs, scoped under .pr- classes
  // so it can never collide with or override the existing portfolio's styles.
  function injectStyles() {
    if (document.getElementById('pr-styles')) return;
    const style = document.createElement('style');
    style.id = 'pr-styles';
    style.textContent = `
      .pr-repos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 1.5rem 0;
      }
      .pr-repo-card {
        background: #f8f9fa;
        border: 1px solid #e1e8ed;
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .pr-repo-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
      .pr-repo-header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem; }
      .pr-repo-header h3 { margin: 0; font-size: 1.2rem; }
      .pr-repo-link { font-size: 0.85rem; color: #3498db; text-decoration: none; white-space: nowrap; }
      .pr-repo-description { color: #555; font-size: 0.95rem; flex-grow: 1; }
      .pr-repo-meta { display: flex; gap: 1rem; font-size: 0.85rem; color: #777; margin: 0.5rem 0; }
      .pr-repo-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.5rem 0; }
      .pr-tag { background: rgba(52,152,219,0.15); color: #2c5282; padding: 0.25rem 0.6rem; border-radius: 12px; font-size: 0.78rem; }
      .pr-repo-cta { margin-top: 0.75rem; text-align: center; background: #3498db; color: #fff; padding: 0.55rem 1rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
      .pr-repo-cta:hover { background: #2980b9; }
      .pr-loading { color: #888; padding: 1rem 0; }
    `;
    document.head.appendChild(style);
  }

  // Finds the best existing element to anchor the widget to, without requiring
  // any specific markup to already exist in the page.
  function findMountPoint() {
    // 1. Explicit opt-in container, if the user ever adds one
    const explicit = document.getElementById('projects-container');
    if (explicit) return { el: explicit, mode: 'replace' };

    // 2. A heading that looks like a "Projects" section
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
    const match = headings.find(h => /projects|portfolio work|featured work/i.test(h.textContent));
    if (match) return { el: match, mode: 'after' };

    // 3. Fallback: append to the end of <body>
    return { el: document.body, mode: 'append' };
  }

  async function mount() {
    injectStyles();
    const config = await loadConfig();
    if (!config || !config.repositories?.length) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'pr-auto-projects';
    wrapper.innerHTML = '<div class="pr-loading">Loading projects…</div>';

    const { el, mode } = findMountPoint();
    if (mode === 'replace') {
      el.replaceWith(wrapper);
    } else if (mode === 'after') {
      el.insertAdjacentElement('afterend', wrapper);
    } else {
      el.appendChild(wrapper);
    }

    const cards = await Promise.all(
      config.repositories.map(async (repoConfig) => {
        const repoData = await fetchRepoData(config.username, repoConfig.repo);
        return createRepoCard(config.username, repoConfig, repoData);
      })
    );

    const grid = document.createElement('div');
    grid.className = 'pr-repos-grid';
    cards.forEach(card => grid.appendChild(card));

    wrapper.innerHTML = '';
    wrapper.appendChild(grid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
