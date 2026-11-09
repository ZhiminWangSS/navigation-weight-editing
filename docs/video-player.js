/* Frozen-action RGB replays. This module only owns the #videos section. */
(() => {
  'use strict';

  function initializeVideoSection() {
    const section = document.querySelector('#videos[data-video-module]');
    if (!section || section.dataset.videoInitialized === 'true') return;
    section.dataset.videoInitialized = 'true';

    const video = section.querySelector('[data-replay-video]');
    const tabs = [...section.querySelectorAll('[data-video-episode]')];
    const tablist = section.querySelector('[data-video-tablist]');
    const panel = section.querySelector('[data-video-panel]');
    const instruction = section.querySelector('[data-video-instruction]');
    const title = section.querySelector('[data-video-title]');
    const summary = section.querySelector('[data-video-summary]');
    const status = section.querySelector('[data-video-status]');
    const fallback = section.querySelector('[data-video-fallback]');
    const downloads = [...section.querySelectorAll('[data-video-download]')];
    const data = window.EXPERIMENT_DATA;
    let selectedId = null;

    if (!video || !tablist || !panel || !instruction || !title || !status || !fallback) return;

    const number = value => Number.isFinite(Number(value))
      ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Number(value))
      : 'Unavailable';
    const metric = (name, value) => {
      const element = section.querySelector(`[data-video-metric="${name}"]`);
      if (element) element.textContent = value;
    };
    const records = new Map();

    tabs.forEach(tab => {
      const id = Number(tab.dataset.videoEpisode);
      const episode = data?.episodes?.find(item => Number(item.id) === id);
      const trajectory = window.REPLAY_DATA?.find(item => Number(item.id) === id) || data?.trajectories?.find(item => Number(item.id) === id);
      if (episode && trajectory?.instruction) {
        records.set(id, { episode, trajectory });
      } else {
        tab.disabled = true;
        tab.setAttribute('aria-label', `Episode ${id}: replay details unavailable`);
      }
    });

    if (!records.size) {
      selectedId = 6;
      status.textContent = 'Episode details could not be loaded. The Episode 06 replay and its download link are still available.';
      video.addEventListener('error', showLoadError);
      if (video.error) showLoadError();
      return;
    }

    function selectEpisode(id, initial = false) {
      const record = records.get(id);
      if (!record || (!initial && id === selectedId)) return;
      selectedId = id;
      const { episode, trajectory } = record;
      const label = String(id).padStart(2, '0');
      const source = `assets/videos/episode-${id}-replay.mp4`;
      const poster = `assets/videos/episode-${id}-poster.jpg`;

      video.pause();
      tabs.forEach(tab => {
        const active = Number(tab.dataset.videoEpisode) === id;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) panel.setAttribute('aria-labelledby', tab.id);
      });

      title.textContent = `Episode ${label}`;
      instruction.textContent = trajectory.instruction.trim();
      if (summary) summary.textContent = trajectory.summary || "";
      metric('baseline-success', episode.baselineSuccess ? 'Success' : 'Failed');
      metric('combined-success', episode.combinedSuccess ? 'Success' : 'Failed');
      metric('baseline-calls', String(episode.baselineQueries));
      metric('combined-calls', String(episode.combinedQueries));
      metric('baseline-ne', `${number(episode.baselineNE)} m`);
      metric('combined-ne', `${number(episode.combinedNE)} m`);

      downloads.forEach(link => {
        link.href = source;
        link.setAttribute('download', `navila-episode-${id}-replay.mp4`);
        link.setAttribute('aria-label', `Download Episode ${label} side-by-side replay as an MP4`);
      });
      video.setAttribute('aria-label', `Episode ${label} replay. Baseline on the left; combined edit on the right.`);
      video.poster = poster;
      fallback.hidden = true;
      status.textContent = `Episode ${label} selected. Press play to watch the replay.`;

      // Changing a case always pauses playback. Initial markup already has EP06's
      // source, so avoid issuing a second request when the module initializes.
      if (!initial || video.getAttribute('src') !== source) {
        video.src = source;
        video.load();
      } else if (video.error) {
        showLoadError();
      }
    }

    function showLoadError() {
      fallback.hidden = false;
      status.textContent = `Episode ${String(selectedId).padStart(2, '0')} could not be played here. Use the MP4 download link below or choose another episode.`;
    }

    tablist.addEventListener('click', event => {
      const tab = event.target.closest('[data-video-episode]');
      if (tab && tablist.contains(tab) && !tab.disabled) selectEpisode(Number(tab.dataset.videoEpisode));
    });

    // Manual tab activation avoids fetching another clip just to move focus.
    // Enter and Space use each button's native click behavior.
    tablist.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-video-episode]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const enabled = tabs.filter(item => !item.disabled);
      const current = enabled.indexOf(tab);
      if (current < 0) return;
      event.preventDefault();
      let next = current;
      if (event.key === 'ArrowRight') next = (current + 1) % enabled.length;
      if (event.key === 'ArrowLeft') next = (current + enabled.length - 1) % enabled.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = enabled.length - 1;
      enabled.forEach((item, index) => { item.tabIndex = index === next ? 0 : -1; });
      enabled[next].focus();
    });

    video.addEventListener('error', showLoadError);
    video.addEventListener('loadedmetadata', () => {
      fallback.hidden = true;
      status.textContent = `Episode ${String(selectedId).padStart(2, '0')} is ready. Use the player controls to play, pause or seek.`;
    });

    selectEpisode(records.has(6) ? 6 : records.keys().next().value, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVideoSection, { once: true });
  } else {
    initializeVideoSection();
  }
})();
