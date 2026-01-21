(() => {
  const API_URL = '/api/content';
  const FALLBACK_URL = 'content.json';

  const fetchJson = async (url, timeoutMs = 4000) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch (error) {
      return null;
    }
  };

  const getValue = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, key) => {
      if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
        return acc[key];
      }
      return undefined;
    }, obj);
  };

  const setText = (el, value) => {
    if (value === undefined || value === null) return;
    el.textContent = String(value);
  };

  const setHtml = (el, value) => {
    if (value === undefined || value === null) return;
    el.innerHTML = String(value).replace(/\n/g, '<br/>');
  };

  const setChip = (el, value) => {
    if (value === undefined || value === null) return;
    const label = String(value);
    const dot = el.querySelector('.dot');
    el.textContent = '';
    if (dot) {
      el.appendChild(dot);
    } else {
      const dotEl = document.createElement('span');
      dotEl.className = 'dot';
      el.appendChild(dotEl);
    }
    el.appendChild(document.createTextNode(` ${label}`));
  };

  const applyContent = (content) => {
    document.querySelectorAll('[data-ix-text]').forEach((el) => {
      const value = getValue(content, el.dataset.ixText);
      if (value !== undefined) {
        setText(el, value);
      }
    });

    document.querySelectorAll('[data-ix-html]').forEach((el) => {
      const value = getValue(content, el.dataset.ixHtml);
      if (value !== undefined) {
        setHtml(el, value);
      }
    });

    document.querySelectorAll('[data-ix-chip]').forEach((el) => {
      const value = getValue(content, el.dataset.ixChip);
      if (value !== undefined) {
        setChip(el, value);
      }
    });

    document.querySelectorAll('[data-ix-href]').forEach((el) => {
      const value = getValue(content, el.dataset.ixHref);
      if (value !== undefined) {
        el.setAttribute('href', value);
      }
    });

    document.querySelectorAll('[data-ix-src]').forEach((el) => {
      const value = getValue(content, el.dataset.ixSrc);
      if (value !== undefined) {
        el.setAttribute('src', value);
      }
    });

    document.querySelectorAll('[data-ix-placeholder]').forEach((el) => {
      const value = getValue(content, el.dataset.ixPlaceholder);
      if (value !== undefined) {
        el.setAttribute('placeholder', value);
      }
    });

    document.querySelectorAll('[data-ix-cc]').forEach((el) => {
      const value = getValue(content, el.dataset.ixCc);
      if (value !== undefined && value !== null && value !== '') {
        el.textContent = `+${value}`;
      }
    });

    document.querySelectorAll('[data-ix-permission]').forEach((el) => {
      const value = getValue(content, el.dataset.ixPermission);
      if (value !== undefined) {
        el.hidden = !Boolean(value);
      }
    });
  };

  const getStoredContent = () => {
    const stored = localStorage.getItem('IX_CONTENT_OVERRIDE');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      return null;
    }
  };

  const load = async () => {
    let content = getStoredContent();
    if (!content) {
      content = await fetchJson(API_URL);
    }
    if (!content) {
      content = await fetchJson(FALLBACK_URL);
    }
    if (!content) return;
    window.IX_CONTENT = content;
    applyContent(content);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
