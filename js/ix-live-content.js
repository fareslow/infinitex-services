/* INFINITEX Live Content Loader
   - Fetches content from /api/content (Netlify Function + Netlify Blobs)
   - Applies key texts/images across pages
   - Polls periodically with ETag to reflect updates without redeploy
*/

(function(){
  const CONTENT_URL = '/api/content';
  const FALLBACK_URL = '/content.json';
  // Update frequency for public pages.
  // 5s keeps changes feeling "instant" while staying reasonably light.
  const POLL_MS = 5000;

  let lastEtag = null;
  let inFlight = false;

  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function setText(el, value){
    if(!el) return;
    el.textContent = (value ?? '').toString();
  }

  function setHtml(el, value){
    if(!el) return;
    el.innerHTML = (value ?? '').toString();
  }

  function setAttr(el, attr, value){
    if(!el) return;
    if(value === null || value === undefined || value === '') return;
    el.setAttribute(attr, value);
  }

  function getByPath(obj, path){
    try{
      return path.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, obj);
    } catch { return undefined; }
  }

  function resolveMedia(v){
    if(!v) return v;
    const s = String(v);
    if(s.startsWith('media/')) return '/api/media?key=' + encodeURIComponent(s);
    return s;
  }

  function applyGlobal(c){
    const storeUrl = getByPath(c,'global.links.store');
    const policyUrl = getByPath(c,'global.links.warrantyPolicy');

    // Header chip
    const chip = qs('#ix-afterSalesChip') || qs('header .brand .chip');
    setText(chip, getByPath(c,'global.chipAfterSales'));

    // Desktop nav (by href)
    const mapNav = {
      'index.html': getByPath(c,'global.nav.home'),
      'track.html': getByPath(c,'global.nav.track'),
      'returns.html': getByPath(c,'global.nav.returns'),
      'products.html': getByPath(c,'global.nav.products')
    };
    Object.keys(mapNav).forEach(href=>{
      const val = mapNav[href];
      if(!val) return;
      qsa('nav.navlinks a[href="'+href+'"]').forEach(a=> setText(a, val));
      qsa('.mobileNav a.mnItem[href="'+href+'"]').forEach(a=> setText(a, getByPath(c,'global.mobileNav.' + (href==='index.html'?'services':href.replace('.html','')) ) || val ));
    });

    // Mobile labels explicitly (services = index)
    const m = getByPath(c,'global.mobileNav') || {};
    const mob = {
      'index.html': m.services,
      'track.html': m.track,
      'returns.html': m.returns,
      'products.html': m.products
    };
    Object.keys(mob).forEach(href=>{
      const val = mob[href];
      if(!val) return;
      qsa('.mobileNav a.mnItem[href="'+href+'"]').forEach(a=> setText(a, val));
    });

    // Store buttons
    if(storeUrl){
      qsa('a.btn.primary').forEach(a=>{
        // heuristics: store button is external
        if(a.getAttribute('href') && a.getAttribute('href').startsWith('http')){
          setAttr(a,'href',storeUrl);
        }
      });
      qsa('.mobileNav a.mnItem.store').forEach(a=> setAttr(a,'href',storeUrl));
      const storeText = getByPath(c,'global.nav.store');
      if(storeText){
        qsa('a.btn.primary').forEach(a=>{
          const href = a.getAttribute('href') || '';
          const isExternal = href.startsWith('http');
          const isStore = isExternal && (href.includes('infinitex.sa') || href === storeUrl);
          if(isStore) setText(a, storeText);
        });
      }
      const storeTextMob = getByPath(c,'global.mobileNav.store');
      if(storeTextMob) qsa('.mobileNav a.mnItem.store').forEach(a=> setText(a, storeTextMob));
    }

    // Policy button (desktop)
    if(policyUrl){
      const policyText = getByPath(c,'global.nav.policy');
      qsa('a.btn.ghost').forEach(a=>{
        const href = a.getAttribute('href') || '';
        if(href.includes('gold-warranty') || href.includes('warranty') || a.id==='ix-policyCta'){
          setAttr(a,'href',policyUrl);
          if(policyText) setText(a, policyText);
        }
      });
    }

    // Logos
    const ixLogo = resolveMedia(getByPath(c,'global.media.infinitexLogo'));
    if(ixLogo){
      qsa('img[alt="INFINITEX"]').forEach(img=> setAttr(img,'src',ixLogo));
    }
  }

  function applyReturns(c){
    // Only if page seems to be returns
    if(!document.querySelector('form#returnForm')) return;
    const p = getByPath(c,'pages.returns') || {};
    setText(qs('#ix-returns-badge') || qs('main .heroCard .chip'), p.badge);
    setHtml(qs('#ix-returns-title') || qs('main .heroCard h1'), p.title);
    setText(qs('#ix-returns-desc') || qs('main .heroCard .p'), p.desc);
    setText(qs('#ix-returns-formTitle'), p.formTitle);

    const orderLabel = qs('label[for="orderNumber"]');
    setText(orderLabel, p.orderLabel);
    const orderInput = qs('#orderNumber');
    if(orderInput && p.orderPlaceholder) orderInput.placeholder = p.orderPlaceholder;

    const phoneLabel = qs('label[for="phoneLocal"]');
    setText(phoneLabel, p.phoneLabel);
    const phoneInput = qs('#phoneLocal');
    if(phoneInput && p.phonePlaceholder) phoneInput.placeholder = p.phonePlaceholder;

    setText(qs('#ix-returns-cta') || qs('form#returnForm button[type="submit"]'), p.cta);
    const policyBtn = qsa('a.btn.ghost').find(a=> (a.getAttribute('href')||'').includes('gold') || (a.getAttribute('href')||'').includes('warranty'));
    if(policyBtn){
      const url = getByPath(c,'global.links.warrantyPolicy');
      if(url) policyBtn.href = url;
      if(p.policyCta) setText(policyBtn, p.policyCta);
    }

    setText(qs('#ix-returns-helper'), p.helper);
    setText(qs('#ix-returns-footerTitle'), p.footerTitle);

    // Yamm logo
    const yammLogo = resolveMedia(getByPath(c,'global.media.yammLogo'));
    if(yammLogo){
      qsa('img[alt="Yamm"]').forEach(img=> setAttr(img,'src',yammLogo));
    }
  }

  function applyTrack(c){
    if(!document.title.includes('تتبع') && !qs('#chatLog')) return;
    const p = getByPath(c,'pages.track') || {};
    setText(qs('#ix-track-badge') || qs('main .heroCard .chip'), p.badge);
    setHtml(qs('#ix-track-title') || qs('main .heroCard h1'), p.title);
    setText(qs('#ix-track-desc') || qs('main .heroCard .p'), p.desc);

    const firstBot = qs('#chatLog .msg.bot');
    if(firstBot && p.intro) setText(firstBot, p.intro);

    const order = qs('#order');
    if(order && p.orderPlaceholder) order.placeholder = p.orderPlaceholder;

    setText(qs('#sendBtn'), p.cta);

    // Hint text is the first .hint in the inline chat
    const hint = qsa('.inlineChat .hint')[0];
    if(hint && p.hint) setText(hint, p.hint);

    setText(qs('#openWidgetLink'), p.openChat);
  }

  function applyIndex(c){
    if(!document.title.includes('INFINITEX') || !qs('main')) return;
    // Heuristic: index has both returns & track CTAs sometimes; still apply if keys exist
    const p = getByPath(c,'pages.index') || {};
    const heroChip = qs('#ix-index-badge') || qs('main .heroCard .chip');
    if(heroChip && p.badge) setText(heroChip, p.badge);

    const h1 = qs('#ix-index-title') || qs('main .heroCard h1');
    if(h1 && p.title){
      // allow \n to break lines
      setHtml(h1, String(p.title).replace(/\n/g,'<br/>'));
    }

    const desc = qs('#ix-index-desc') || qs('main .heroCard .p');
    if(desc && p.desc) setText(desc, p.desc);

    // Hero image if present
    const img = qs('#ix-index-heroImage') || qs('main img');
    if(img && p.heroImage) setAttr(img,'src', resolveMedia(p.heroImage));

    // CTAs if present
    const btnTrack = qs('#ix-index-ctaTrack');
    if(btnTrack && p.ctaTrack) setText(btnTrack, p.ctaTrack);
    const btnReturns = qs('#ix-index-ctaReturns');
    if(btnReturns && p.ctaReturns) setText(btnReturns, p.ctaReturns);
  }

  function applyProducts(c){
    if(!document.title.includes('المنتج') && !document.title.includes('منتجات')) return;
    const p = getByPath(c,'pages.products') || {};
    setText(qs('#ix-products-badge') || qs('main .heroCard .chip'), p.badge);
    const h1 = qs('#ix-products-title') || qs('main .heroCard h1');
    if(h1 && p.title) setText(h1, p.title);
    const desc = qs('#ix-products-desc') || qs('main .heroCard .p');
    if(desc && p.desc) setText(desc, p.desc);
  }

  function applyAll(content){
    if(!content || typeof content !== 'object') return;
    window.IX_CONTENT = content;
    applyGlobal(content);
    applyReturns(content);
    applyTrack(content);
    applyIndex(content);
    applyProducts(content);
  }

  async function fetchContent(){
    if(inFlight) return;
    inFlight = true;
    try{
      const headers = {};
      if(lastEtag) headers['If-None-Match'] = lastEtag;

      let res = await fetch(CONTENT_URL, { headers, cache:'no-store' });
      if(res.status === 404){
        // fallback to static file
        res = await fetch(FALLBACK_URL, { cache:'no-store' });
      }
      if(res.status === 304){
        inFlight = false;
        return;
      }
      const etag = res.headers.get('ETag');
      if(etag) lastEtag = etag;

      const json = await res.json();
      applyAll(json);
    } catch(e){
      // silent fail on public pages
    } finally {
      inFlight = false;
    }
  }

  // Start
  fetchContent();

  // Admin-triggered refresh (same-origin tabs)
  try{
    const bc = new BroadcastChannel("ix_content");
    bc.onmessage = (ev)=>{
      if(ev && ev.data && ev.data.type === "refresh") fetchContent();
    };
  }catch(e){}
  // Near-live polling (can be disabled by setting window.IX_DISABLE_LIVE_POLL = true before this script)
  if(!window.IX_DISABLE_LIVE_POLL){
    setInterval(fetchContent, POLL_MS);
  }
})();
