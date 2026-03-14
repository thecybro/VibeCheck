var e=new Set,t=0;function n(e){if(e.dataset.vcId)return e.dataset.vcId;let n=`vc-${t++}`;return e.dataset.vcId=n,n}function r(e,t,n){let r=document.querySelector(`[data-vc-id="${e}"]`);if(!r)return;r.classList.add(`vibecheck-blurred`),r.style.position=`relative`;let i=document.createElement(`div`);i.className=`vibecheck-overlay`,i.innerHTML=`
        <div class="vibecheck-overlay">
        <div class="vibecheck-overlay-inner">
        <div class="vibecheck-icon">🛡️</div>
        <div class="vibecheck-title">VibeCheck</div>
        <div class="vibecheck-reason">Potentially Negative Content Detected</div>
        <div class="vibecheck-emotion-tag">${t}</div>
        <div class="vibecheck-bar-wrap">
          <div class="vibecheck-bar" style="width:${n}%"></div>
        </div>
        <div class="vibecheck-score">${n}% ${t}</div>
        <button class="vibecheck-reveal-btn">Reveal Anyway</button>
      </div>
      </div>
    `,i.querySelector(`.vibecheck-reveal-btn`)?.addEventListener(`click`,e=>{e.stopPropagation(),i.classList.add(`vibecheck-revealed`);let t=i.parentElement;t&&t.classList.remove(`vibecheck-blurred`),setTimeout(()=>i.remove(),400),chrome.storage.local.get(`vibecheck_stats`,e=>{let t=e.vibecheck_stats??{blocked:0,analyzed:0,revealed:0},n={...t,revealed:t.revealed+1};chrome.storage.local.set({vibecheck_stats:n})})}),r.appendChild(i)}chrome.runtime.onMessage.addListener(e=>{if(e.type===`CLASSIFICATION_RESULT`&&e.shouldBlock){let t=e.threshold,n=e.confidence;console.log(`[VibeCheck] Blocking post (${e.postId}): \n${e.text.slice(0,30)} \n Emotion: "${e.emotion}"\nThreshold: ${t}\nConfidence: ${n}%`),r(e.postId,e.emotion,e.confidence),chrome.storage.local.get(`vibecheck_stats`,e=>{let t=e.vibecheck_stats??{blocked:0,analyzed:0,revealed:0},n={...t,blocked:t.blocked+1};chrome.storage.local.set({vibecheck_stats:n})})}});function i(t,r,i){let a=n(t);e.has(a)||(e.add(a),chrome.storage.sync.get(`vibecheck_settings`,e=>{let t=e.vibecheck_settings;t?.enabled&&(i&&t.whitelist?.includes(i)||chrome.runtime.sendMessage({type:`CLASSIFY_POST`,postId:a,text:r}))}))}export{i as t};