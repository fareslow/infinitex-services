/* INFINITEX Services — Content Loader
   الهدف: فصل النصوص (والروابط الأساسية) في ملف واحد content.json لتسهيل تعديلها من داشبورد.
   - يدعم override محلي عبر localStorage key: ix_content_override
   - يستخدم data-ix* attributes داخل الصفحات لتطبيق المحتوى.
*/
(function(){
  'use strict';

  function isObject(v){ return v && typeof v === 'object' && !Array.isArray(v); }
  function getPath(obj, path){
    if(!obj || !path) return undefined;
    var parts = String(path).split('.');
    var cur = obj;
    for(var i=0;i<parts.length;i++){
      if(cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function apply(el, content){
    var key;

    key = el.getAttribute('data-ix');
    if(key){
      var v = getPath(content, key);
      if(v !== undefined && v !== null) el.innerHTML = String(v);
    }

    key = el.getAttribute('data-ix-text');
    if(key){
      var vt = getPath(content, key);
      if(vt !== undefined && vt !== null) el.textContent = String(vt);
    }

    key = el.getAttribute('data-ix-href');
    if(key){
      var vh = getPath(content, key);
      if(vh !== undefined && vh !== null) el.setAttribute('href', String(vh));
    }

    key = el.getAttribute('data-ix-src');
    if(key){
      var vs = getPath(content, key);
      if(vs !== undefined && vs !== null) el.setAttribute('src', String(vs));
    }

    key = el.getAttribute('data-ix-placeholder');
    if(key){
      var vp = getPath(content, key);
      if(vp !== undefined && vp !== null) el.setAttribute('placeholder', String(vp));
    }

    key = el.getAttribute('data-ix-title');
    if(key){
      var vti = getPath(content, key);
      if(vti !== undefined && vti !== null) el.setAttribute('title', String(vti));
    }
  }

  async function load(){
    // 1) Override local (preview)
    var override = null;
    try{
      var raw = localStorage.getItem('ix_content_override');
      if(raw) override = JSON.parse(raw);
    }catch(e){ override = null; }

    // 2) Fetch base content.json
    var base = null;
    try{
      var u = new URL('content.json', window.location.href);
      // avoid caches when previewing
      u.searchParams.set('_', String(Date.now()));
      var res = await fetch(u.toString(), { cache: 'no-store' });
      if(res.ok) base = await res.json();
    }catch(e){ base = null; }

    var content = base || {};
    if(override && isObject(override)){
      // shallow merge for top-level keys; nested keys can be fully replaced from dashboard
      content = Object.assign({}, content, override);
    }

    window.IX_CONTENT = content;

    // Apply to DOM
    var nodes = document.querySelectorAll('[data-ix],[data-ix-text],[data-ix-href],[data-ix-src],[data-ix-placeholder],[data-ix-title]');
    for(var i=0;i<nodes.length;i++) apply(nodes[i], content);

    // Special: document title via meta
    var t = getPath(content, 'meta.title');
    if(t) document.title = String(t);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', load);
  }else{
    load();
  }
})();
