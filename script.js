console.log('[PWA] Script starting...');

(() => {
  console.log('[PWA] IIFE executing');

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Reduced motion preference → disable orbit spin
  const orbit = document.querySelector('.orbit');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    orbit?.setAttribute('data-reduced-motion','true');
    const ring = document.querySelector('.orbit__ring');
    if (ring) ring.style.animation = 'none';
  }

  // Fetch helpers with error handling
  async function getJSON(url){
    console.log('[PWA] Fetching:', url);
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      console.log('[PWA] Response status:', res.status, 'for', url);
      if (!res.ok) {
        console.error(`API error ${url}: HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      console.log('[PWA] Got data from', url, ':', data);
      return data;
    } catch (e) {
      console.error(`Fetch error ${url}:`, e);
      return null;
    }
  }

  // Render orbit items (mix videos + posts)
  function renderOrbit(items){
    console.log('[PWA] renderOrbit called with', items.length, 'items:', items);
    const list = document.getElementById('orbit-list');
    console.log('[PWA] orbit-list element:', list);
    if (!list) {
      console.error('[PWA] orbit-list element not found!');
      return;
    }
    list.innerHTML = '';
    const radius = 260; // px, matches transform-origin in CSS
    const count = items.length;

    items.forEach((item, i) => {
      const angle = (i / count) * Math.PI * 2; // radians
      const li = document.createElement('li');
      li.style.transform = `rotate(${(angle * 180/Math.PI).toFixed(2)}deg)`;

      const a = document.createElement('a');
      a.href = item.url;
      a.className = 'orbit__item';
      a.setAttribute('role','button');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(item);
      });

      const img = document.createElement('img');
      img.src = item.thumb || item.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%2290%22></svg>';
      img.alt = '';
      img.className = 'orbit__thumb';

      const meta = document.createElement('div');
      meta.className = 'orbit__meta';

      const kicker = document.createElement('div');
      kicker.className = 'orbit__kicker';
      kicker.textContent = item.kind?.toUpperCase() || 'CONTENT';

      const title = document.createElement('div');
      title.className = 'orbit__title';
      title.textContent = item.title || 'Untitled';

      meta.appendChild(kicker);
      meta.appendChild(title);
      a.appendChild(img);
      a.appendChild(meta);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  // Modal logic
  const modalEl = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  const modalLink = document.getElementById('modal-link');
  let lastFocus = null;

  function openModal(item){
    lastFocus = document.activeElement;
    modalEl.setAttribute('aria-hidden','false');
    modalTitle.textContent = item.title || '';
    modalLink.href = item.url;

    // Embed YouTube if video
    if (item.kind === 'video' && item.id) {
      const id = item.id;
      modalBody.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen title="YouTube video"></iframe>`;
    } else {
      // Article preview
      modalBody.innerHTML = `<p>${item.excerpt || 'Open the original article to read the full story.'}</p>`;
    }

    // Focus trap
    document.addEventListener('keydown', escClose);
  }
  function closeModal(){
    modalEl.setAttribute('aria-hidden','true');
    modalBody.innerHTML = '';
    document.removeEventListener('keydown', escClose);
    if (lastFocus) lastFocus.focus();
  }
  function escClose(e){ if (e.key === 'Escape') closeModal(); }
  modalEl.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) closeModal();
  });

  // Compose content
  async function loadContent(){
    console.log('[PWA] loadContent starting...');
    try{
      console.log('[PWA] About to fetch videos and posts...');
      const [videos, posts] = await Promise.all([
        getJSON('/api/videos'),
        getJSON('/api/posts')
      ]);
      console.log('[PWA] Raw videos response:', videos);
      console.log('[PWA] Raw posts response:', posts);

      const v = (videos?.items || []).slice(0,3).map(x=>({
        kind:'video', id:x.id, title:x.title, url:x.url, thumb:x.thumb, published:x.published
      }));
      console.log('[PWA] Processed videos:', v);

      const p = (posts?.items || []).slice(0,3).map(x=>({
        kind:'post', id:x.id, title:x.title, url:x.url, image:x.image, published:x.published, excerpt:x.excerpt
      }));
      console.log('[PWA] Processed posts:', p);

      const items = [...v, ...p];
      console.log('[PWA] Combined items count:', items.length, 'items:', items);

      if (items.length === 0){
        console.log('[PWA] No items found, showing fallback');
        // Fallback links when APIs fail
        renderOrbit([
          {kind:'video', id:'', title:'Watch on YouTube', url:'https://www.youtube.com/@politicswithalex', thumb:'https://i.ytimg.com/vi/VL_twc7KDM8/hqdefault.jpg', published:''},
          {kind:'post', id:'', title:'Read on Medium', url:'https://medium.com/@alex_96450', image:'', published:''}
        ]);
      } else {
        console.log('[PWA] Calling renderOrbit with', items.length, 'items');
        renderOrbit(items);
      }
      console.log('[PWA] loadContent completed successfully');
    }catch(err){
      console.error('[PWA] loadContent FATAL ERROR:', err);
      console.error('[PWA] Error stack:', err.stack);
      // Show fallback even on catastrophic failure
      renderOrbit([
        {kind:'video', id:'', title:'Watch on YouTube', url:'https://www.youtube.com/@politicswithalex', thumb:'https://i.ytimg.com/vi/VL_twc7KDM8/hqdefault.jpg', published:''},
        {kind:'post', id:'', title:'Read on Medium', url:'https://medium.com/@alex_96450', image:'', published:''}
      ]);
    }
  }

  console.log('[PWA] About to call loadContent...');
  loadContent();
  console.log('[PWA] loadContent called (async, will complete later)');

  // Newsletter form
  const subscribeForm = document.getElementById('subscribeForm');
  const subscribeStatus = document.getElementById('subscribeStatus');
  subscribeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    subscribeStatus.textContent = '';
    const fd = new FormData(subscribeForm);
    const email = (fd.get('email')||'').toString().trim();
    const hp = (fd.get('hp')||'').toString();
    if(hp){ return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      subscribeStatus.textContent = 'Please enter a valid email.';
      return;
    }
    try{
      const res = await fetch('/api/subscribe',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({email})
      });
      const json = await res.json();
      if(json.ok){
        subscribeStatus.textContent = 'Thanks — check your inbox!';
        subscribeForm.reset();
      } else {
        subscribeStatus.textContent = json.error || 'Something went wrong.';
      }
    }catch(err){
      subscribeStatus.textContent = 'Network error. Try again shortly.';
    }
  });

  // Submit story form
  const submitForm = document.getElementById('submitForm');
  const submitStatus = document.getElementById('submitStatus');
  submitForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitStatus.textContent = '';
    const fd = new FormData(submitForm);
    const payload = Object.fromEntries(fd.entries());
    if(payload.hp){ return; }
    if(!payload.email || !payload.subject || !payload.message){
      submitStatus.textContent = 'Please fill required fields.';
      return;
    }
    try{
      const res = await fetch('/api/submit',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if(json.ok){
        submitStatus.textContent = 'Sent. I\'ll follow up soon.';
        submitForm.reset();
      } else {
        submitStatus.textContent = json.error || 'Something went wrong.';
      }
    }catch(err){
      submitStatus.textContent = 'Network error. Try again shortly.';
    }
  });
})();
