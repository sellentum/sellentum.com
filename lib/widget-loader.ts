export const widgetLoaderHeaders = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "X-Content-Type-Options": "nosniff",
};

export function buildWidgetLoaderScript(origin: string) {
  const appOrigin = origin.replace(/\/+$/, "");

  return `
(function(){
  var appOrigin=${JSON.stringify(appOrigin)};
  var script=document.currentScript;
  if(!script){console.error('[Sellentum] Widget loader could not find the current script tag');return;}
  var experience=(script.getAttribute('data-experience')||'finder').toLowerCase();
  var id=script.getAttribute('data-id')||script.getAttribute('data-quiz')||script.getAttribute('data-configurator');
  if(!id){console.error('[Sellentum] Missing data-id, data-quiz, or data-configurator attribute');return;}
  var path=experience==='assistant'?'assistant':experience==='configurator'?'configurator':experience==='search'?'search':'finder';
  var mode=(script.getAttribute('data-mode')||'modal').toLowerCase();
  var color=script.getAttribute('data-color')||'#22352a';
  var label=script.getAttribute('data-label')||'Find my match';
  var rawPosition=(script.getAttribute('data-position')||'right').toLowerCase();
  var position=rawPosition==='bottom-left'||rawPosition==='left'?'left':'right';
  var width=script.getAttribute('data-width')||'1120px';
  var height=script.getAttribute('data-height')||'780px';
  var z='2147483000';
  var src=appOrigin+'/'+path+'/'+encodeURIComponent(id)+'?embed=1';
  var attribution=new URLSearchParams();
  function addAttribution(key,value){if(value){attribution.set(key,String(value).slice(0,500))}}
  addAttribution('sellentum_source',script.getAttribute('data-source')||script.getAttribute('data-utm-source')||window.location.hostname||'storefront');
  addAttribution('sellentum_medium',script.getAttribute('data-medium')||script.getAttribute('data-utm-medium')||'embed');
  addAttribution('sellentum_campaign',script.getAttribute('data-campaign')||script.getAttribute('data-utm-campaign'));
  addAttribution('sellentum_content',script.getAttribute('data-content')||script.getAttribute('data-utm-content'));
  addAttribution('sellentum_term',script.getAttribute('data-term')||script.getAttribute('data-utm-term'));
  addAttribution('sellentum_placement',script.getAttribute('data-placement')||position);
  addAttribution('sellentum_embed_mode',mode);
  addAttribution('sellentum_widget_experience',experience);
  addAttribution('sellentum_launcher_position',position);
  addAttribution('sellentum_page_url',window.location.href.split('#')[0]);
  addAttribution('sellentum_page_title',document.title);
  addAttribution('sellentum_referrer',document.referrer);
  if(script.getAttribute('data-utm-source'))addAttribution('utm_source',script.getAttribute('data-utm-source'));
  if(script.getAttribute('data-utm-medium'))addAttribution('utm_medium',script.getAttribute('data-utm-medium'));
  if(script.getAttribute('data-utm-campaign'))addAttribution('utm_campaign',script.getAttribute('data-utm-campaign'));
  if(script.getAttribute('data-utm-content'))addAttribution('utm_content',script.getAttribute('data-utm-content'));
  if(script.getAttribute('data-utm-term'))addAttribution('utm_term',script.getAttribute('data-utm-term'));
  var attributionQuery=attribution.toString(); if(attributionQuery){src+='&'+attributionQuery}
  function makeFrame(){
    var frame=document.createElement('iframe');
    frame.title='Sellentum '+path;
    frame.src=src;
    frame.allow='clipboard-write';
    frame.loading='lazy';
    frame.style.cssText='width:min('+width+',100%);height:min('+height+',94vh);border:0;border-radius:24px;background:white;box-shadow:0 30px 90px rgba(0,0,0,.3)';
    return frame;
  }
  if(mode==='inline'){
    var inlineWrap=document.createElement('div');
    inlineWrap.setAttribute('data-sellentum-inline','true');
    inlineWrap.style.cssText='width:100%;max-width:'+width+';margin:0 auto';
    var inlineFrame=makeFrame();
    inlineFrame.style.cssText='width:100%;height:'+height+';min-height:560px;border:0;border-radius:24px;background:white;box-shadow:0 18px 55px rgba(20,33,25,.14)';
    inlineWrap.appendChild(inlineFrame);
    if(script.parentNode){script.parentNode.insertBefore(inlineWrap,script.nextSibling)}else{document.body.appendChild(inlineWrap)}
    return;
  }
  var button=document.createElement('button');
  button.type='button'; button.setAttribute('aria-label',label); button.innerHTML='<span style="font-size:18px">✦</span>'+label;
  button.setAttribute('aria-expanded','false');
  button.style.cssText='position:fixed;bottom:22px;'+position+':22px;z-index:'+z+';border:0;border-radius:999px;padding:14px 20px;background:'+color+';color:white;font:700 14px/1.2 system-ui,-apple-system,sans-serif;box-shadow:0 12px 35px rgba(0,0,0,.22);cursor:pointer;display:flex;align-items:center;gap:9px';
  var overlay=document.createElement('div');
  overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-modal','true'); overlay.setAttribute('aria-label','Sellentum product discovery');
  overlay.style.cssText='position:fixed;inset:0;z-index:'+(Number(z)+1)+';background:rgba(16,25,20,.54);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:16px';
  var close=document.createElement('button'); close.type='button'; close.setAttribute('aria-label','Close Sellentum experience'); close.innerHTML='×'; close.style.cssText='position:absolute;top:18px;right:20px;width:38px;height:38px;border:0;border-radius:50%;background:white;color:#17211b;font:400 26px/1 system-ui;box-shadow:0 5px 20px rgba(0,0,0,.15);cursor:pointer';
  var frame=null;
  overlay.appendChild(close); document.body.appendChild(button); document.body.appendChild(overlay);
  function ensureFrame(){if(!frame){frame=makeFrame();overlay.insertBefore(frame,close)}return frame}
  function open(){ensureFrame();overlay.style.display='flex';document.body.style.overflow='hidden';button.setAttribute('aria-expanded','true');close.focus()}
  function shut(){overlay.style.display='none';document.body.style.overflow='';button.setAttribute('aria-expanded','false');button.focus()}
  button.onclick=open; close.onclick=shut; overlay.onclick=function(e){if(e.target===overlay)shut()}; document.addEventListener('keydown',function(e){if(e.key==='Escape')shut()});
})();`;
}

export function widgetLoaderResponse(request: Request) {
  const origin = new URL(request.url).origin;
  return new Response(buildWidgetLoaderScript(origin), { headers: widgetLoaderHeaders });
}
