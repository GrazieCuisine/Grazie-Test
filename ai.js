/* GRAZIE AI admin prototype. Provider requests go through the optional server; no API key belongs in this file. */
(() => {
  const $ = id => document.getElementById(id);
  // Local development uses the separate FastAPI port. Deployed sites default to their own origin
  // (configure a reverse proxy for /api, or set window.GRAZIE_AI_API before this script).
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API = (window.GRAZIE_AI_API || (isLocal ? 'http://127.0.0.1:8000' : window.location.origin)).replace(/\/$/,'');
  const read = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (err) { console.warn('GRAZIE AI could not save local data:', err); return false; } };
  const safeText = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  async function api(path, opts={}) {
    const r = await fetch(API + path, opts);
    const data = await r.json().catch(()=>({detail:'Server returned an unreadable response.'}));
    if (!r.ok) throw new Error(data.detail || `Request failed (${r.status})`);
    return data;
  }
  function localContext() {
    const orders=read('dahiOrders'), reservations=read('dahiReservations');
    return {orders:orders.length,reservations:reservations.length,orderSample:orders.slice(-20).map(o=>({id:o.id,type:o.type,total:o.total,status:o.status})),reservationSample:reservations.slice(-10).map(r=>({date:r.date,time:r.time,guests:r.guests,status:r.status}))};
  }
  function addMessage(role, text) {
    const log=$('aiChatLog'); if(!log)return;
    const el=document.createElement('div'); el.className=`ai-message ${role}`; el.textContent=text; log.appendChild(el); log.scrollTop=log.scrollHeight;
  }
  document.querySelectorAll('[data-ai-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-ai-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('[data-ai-pane]').forEach(p=>p.classList.toggle('hidden',p.dataset.aiPane!==btn.dataset.aiTab));
  }));
  $('aiChatForm')?.addEventListener('submit', async e=>{
    e.preventDefault(); const input=$('aiChatInput'), message=input.value.trim(); if(!message)return;
    addMessage('user',message); input.value='';
    const btn=e.submitter; if(btn)btn.disabled=true;
    try {
      const data=await api('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,context:localContext()})});
      addMessage('assistant',data.answer || 'No answer returned.');
    } catch(err) {
      const detail = err instanceof TypeError
        ? 'Could not reach the AI API. For local testing, start FastAPI on 127.0.0.1:8000. For deployment, proxy /api to the backend or set window.GRAZIE_AI_API to its HTTPS URL.'
        : err.message;
      addMessage('assistant',`GRAZIE AI request failed: ${detail}\n\nCheck that the backend is running and OPENAI_API_KEY is configured in the server-side .env file. Your message was not processed.`);
    } finally {if(btn)btn.disabled=false;}
  });
  $('aiKnowledgeForm')?.addEventListener('submit',async e=>{
    e.preventDefault(); const file=$('aiKnowledgeFile').files[0]; if(!file)return;
    const status=$('aiKnowledgeStatus');status.textContent='Uploading and indexing…';
    try{const fd=new FormData();fd.append('file',file);fd.append('title',$('aiKnowledgeTitle').value.trim()||file.name);
      const d=await api('/api/knowledge',{method:'POST',body:fd});status.textContent=`Added “${d.title}” (${d.chars} characters).`;loadKnowledge();
    }catch(err){status.textContent=`Could not index document: ${err.message}. Start backend; supported files: TXT, MD, CSV, text-based PDF.`;}
  });
  async function loadKnowledge(){try{const d=await api('/api/knowledge');$('aiKnowledgeList').innerHTML=d.documents.map(x=>`<div class="ai-list-item"><span><strong>${safeText(x.title)}</strong><br><small>${x.chars} characters · ${safeText(x.created_at||'')}</small></span><button class="btn secondary small-btn" data-kb-delete="${safeText(x.id)}">Delete</button></div>`).join('')||'<p class="muted">No indexed documents yet.</p>';document.querySelectorAll('[data-kb-delete]').forEach(b=>b.onclick=async()=>{try{await api('/api/knowledge/'+encodeURIComponent(b.dataset.kbDelete),{method:'DELETE'});loadKnowledge()}catch(e){alert(e.message)}})}catch{$('aiKnowledgeList').innerHTML='<p class="muted">Connect the backend to view indexed documents.</p>';}}
  loadKnowledge();
  let recognition=null, lastAnswer='';
  $('aiVoiceStart')?.addEventListener('click',()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){$('aiVoiceStatus').textContent='Speech recognition is not supported in this browser. Try a supported browser or type into Chat.';return;}
    recognition=new SR();recognition.lang='en-US';recognition.interimResults=true;recognition.continuous=false;
    recognition.onresult=e=>{$('aiVoiceText').value=Array.from(e.results).map(r=>r[0].transcript).join(' ');};
    recognition.onerror=e=>$('aiVoiceStatus').textContent='Voice input: '+e.error;
    recognition.onend=()=>$('aiVoiceStatus').textContent='Listening stopped. Copy recognized text into Chat to ask GRAZIE AI.';
    recognition.start();$('aiVoiceStatus').textContent='Listening…';
  });
  $('aiVoiceStop')?.addEventListener('click',()=>recognition?.stop());
  $('aiVoiceText')?.addEventListener('change',()=>{const v=$('aiVoiceText').value.trim();if(v){$('aiChatInput').value=v;document.querySelector('[data-ai-tab="chat"]').click();}});
  $('aiVoiceSpeak')?.addEventListener('click',()=>{if(!('speechSynthesis'in window)){ $('aiVoiceStatus').textContent='Speech synthesis is not supported in this browser.';return;}const log=$('aiChatLog');lastAnswer=[...log.querySelectorAll('.ai-message.assistant')].at(-1)?.textContent||'';if(lastAnswer){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(lastAnswer));}});
  $('aiAnalyzeImage')?.addEventListener('click',async()=>{
    const file=$('aiImageFile').files[0],status=$('aiImageStatus');if(!file){status.textContent='Choose an image first.';return;}status.textContent='Analyzing image…';
    try{const fd=new FormData();fd.append('file',file);const d=await api('/api/image/analyze',{method:'POST',body:fd});status.textContent=d.analysis||'Analysis complete.';}
    catch(e){status.textContent=`Image analysis unavailable: ${e.message}. Configure the backend and a vision-capable model.`;}
  });
  $('aiGenerateImage')?.addEventListener('click',async()=>{
    const prompt=$('aiImagePrompt').value.trim(),status=$('aiImageStatus');if(!prompt){status.textContent='Describe the image you want to generate.';return;}status.textContent='Generating image…';
    try{const d=await api('/api/image/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});$('aiImageResult').innerHTML=d.url?`<img alt="AI generated image" src="${safeText(d.url)}">`:'';status.textContent=d.message||'Image generated.';}
    catch(e){status.textContent=`Image generation unavailable: ${e.message}. Configure a provider that supports image generation.`;}
  });
  function renderAutomations(){const items=read('grazieAiAutomations');$('aiAutomationList').innerHTML=items.map((a,i)=>`<div class="ai-list-item"><span><strong>${safeText(a.name)}</strong><br><small>${safeText(a.trigger)} · ${safeText(a.instruction)}</small></span><button class="btn secondary small-btn" data-auto-run="${i}">Run</button> <button class="btn secondary small-btn" data-auto-delete="${i}">Delete</button></div>`).join('')||'<p class="muted">No automation rules saved.</p>';
    document.querySelectorAll('[data-auto-run]').forEach(b=>b.onclick=()=>{const a=items[+b.dataset.autoRun],ctx=localContext();$('aiAutomationStatus').textContent=`Manual run preview for “${a.name}”: ${ctx.orders} orders and ${ctx.reservations} reservations found. Instruction: ${a.instruction}. External actions are not executed by this prototype.`;});
    document.querySelectorAll('[data-auto-delete]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.autoDelete,1);write('grazieAiAutomations',items);renderAutomations();});}
  $('aiAutomationForm')?.addEventListener('submit',e=>{e.preventDefault();const items=read('grazieAiAutomations');items.push({name:$('aiAutomationName').value.trim(),trigger:$('aiAutomationTrigger').value,instruction:$('aiAutomationInstruction').value.trim(),createdAt:new Date().toISOString()});write('grazieAiAutomations',items);$('aiAutomationStatus').textContent='Automation saved locally. Scheduled and event-based triggers need a server scheduler/integration.';e.target.reset();renderAutomations();});
  renderAutomations();
  $('aiRefreshData')?.addEventListener('click',()=>{
    const orders=read('dahiOrders'),reservations=read('dahiReservations'),currency=(read('dahiSettings',{}).currency||'$');
    const total=orders.reduce((s,o)=>s+(Number(o.total)||0),0),statuses={};orders.forEach(o=>statuses[o.status||'Unknown']=(statuses[o.status||'Unknown']||0)+1);
    $('aiDataResult').innerHTML=`<div class="ai-metric-grid"><div class="ai-metric">Orders<strong>${orders.length}</strong></div><div class="ai-metric">Reservations<strong>${reservations.length}</strong></div><div class="ai-metric">Gross order total<strong>${safeText(currency)}${total.toFixed(2)}</strong></div></div><p><strong>Order status breakdown</strong></p><p>${Object.entries(statuses).map(([k,v])=>`${safeText(k)}: ${v}`).join(' · ')||'No order data available.'}</p><p class="muted small">This summary is calculated locally from browser demo data; it is not a financial/accounting report.</p>`;
  });
  $('aiExportData')?.addEventListener('click',()=>{
    const orders=read('dahiOrders');const cols=['id','customer','type','total','status','createdAt'];
    const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv=[cols.join(','),...orders.map(o=>cols.map(k=>esc(o[k])).join(','))].join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='grazie-orders-report.csv';a.click();URL.revokeObjectURL(url);
  });
  // Restrict visibility to the existing admin role. Backend deployment still needs real server-side authorization.
  const session=read('dahiStaff',null);
  if(session?.role!=='admin') { const panel=$('grazieAiPanel'); if(panel)panel.remove(); }
})();
