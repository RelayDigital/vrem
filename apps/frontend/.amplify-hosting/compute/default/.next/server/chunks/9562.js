"use strict";exports.id=9562,exports.ids=[9562],exports.modules={39562:(a,b,c)=>{c.d(b,{A:()=>n,C:()=>j,a:()=>m,b:()=>o,c:()=>i,g:()=>l,u:()=>k});var d=c(38301),e=c(87560);let f=new Set(["children","ref","style","className"]),g=new WeakMap,h=({node:a,nameProp:b,valueProp:c,prevValueProp:d,event:e})=>{if(void 0!==e){if(c!==d){let b=(a=>{let b=g.get(a);return void 0===b&&(b=new Map,g.set(a,b)),b})(a),d=b.has(e),f=b.get(e);void 0!==c?d?f.handleEvent=c:(f={handleEvent:c},b.set(e,f),a.addEventListener(e,a=>f.handleEvent(a.detail))):d&&(b.delete(e),a.removeEventListener(e,f))}return}a[b]=c,null==c&&b in HTMLElement.prototype&&a.removeAttribute(b)},i=({react:a,tag:b,elClass:c,schemaEvents:d})=>{let e=((a={})=>null==Object?void 0:Object.keys(a).reduce((b,c)=>{var d,e;let f=null==a?void 0:a[c];return b[`on${null==(e=null==(d=null==f?void 0:f.split("-"))?void 0:d.map(a=>a.charAt(0).toUpperCase()+a.slice(1)))?void 0:e.join("")}`]=f,b},{}))(d),g=new Set(Object.keys(e??{})),i=a.forwardRef((d,i)=>{let j=a.useRef(new Map),k=a.useRef(null),{reactProps:l,customElProps:m}=((a,b,c)=>{let d={},e={};return Object.entries(a).forEach(([a,g])=>{f.has(a)?d["className"===a?"class":a]=g:b.has(a)||a in c.prototype?e[a]=g:d[a]=g}),{reactProps:d,customElProps:e}})(d,g,c);return a.useLayoutEffect(()=>{if(null===k.current)return;let a=new Map;for(let b in m)h({node:k.current,nameProp:b,valueProp:m[b],prevValueProp:j.current.get(b),event:e[b]}),j.current.delete(b),a.set(b,d[b]);for(let[a,b]of j.current)h({node:k.current,nameProp:a,valueProp:void 0,prevValueProp:b,event:e[a]});j.current=a}),a.createElement(b??c.__tag,{...l,ref:a.useCallback(a=>{k.current=a,"function"==typeof i?i(a):null!==i&&(i.current=a)},[i])})});return i.displayName=c.name,i},j=({children:a})=>a,k=()=>{let[a,b]=(0,d.useState)(!1);return(0,d.useEffect)(()=>{"u">typeof window&&b(!0)},[]),a},l=a=>{let b={},c={},d={};for(let[e,f]of Object.entries(a)){if(e.startsWith("on")){b[e]=f;continue}if("headless"===e){d[e]=f;continue}c[e]=f}return{eventHandlers:b,uploader:d,config:c}},m=()=>"React-Uploader/1.11.0",n=i({react:d,tag:"uc-config",elClass:e.Config}),o=i({react:d,tag:"uc-upload-ctx-provider",elClass:e.UploadCtxProvider,schemaEvents:e.UploadCtxProvider.EventType})},87560:(a,b,c)=>{c.r(b),c.d(b,{ActivityBlock:()=>d,ActivityHeader:()=>e,BaseComponent:()=>f,Block:()=>g,BtnUi:()=>h,CameraSource:()=>i,CloudImageEditor:()=>j,CloudImageEditorActivity:()=>k,CloudImageEditorBlock:()=>l,Config:()=>m,Copyright:()=>n,CropFrame:()=>o,Data:()=>p,DropArea:()=>q,EditorAspectRatioButtonControl:()=>r,EditorCropButtonControl:()=>s,EditorFilterControl:()=>t,EditorFreeformButtonControl:()=>u,EditorImageCropper:()=>v,EditorImageFader:()=>w,EditorOperationControl:()=>x,EditorScroller:()=>y,EditorSlider:()=>z,EditorToolbar:()=>A,ExternalSource:()=>B,ExternalUploadSource:()=>C,FileItem:()=>D,FileUploaderInline:()=>E,FileUploaderMinimal:()=>F,FileUploaderRegular:()=>G,FormInput:()=>H,IS_SSR_STUBS:()=>aj,Icon:()=>I,Img:()=>J,LineLoaderUi:()=>K,Modal:()=>L,ModalEvents:()=>M,PACKAGE_NAME:()=>N,PACKAGE_VERSION:()=>O,PresenceToggle:()=>P,ProgressBar:()=>Q,ProgressBarCommon:()=>R,Select:()=>S,SimpleBtn:()=>T,SliderUi:()=>U,SolutionBlock:()=>V,SourceBtn:()=>W,SourceList:()=>X,Spinner:()=>Y,StartFrom:()=>Z,Thumb:()=>$,UID:()=>_,UploadCtxProvider:()=>aa,UploadList:()=>ab,UploadSource:()=>ac,UploaderBlock:()=>ad,UrlSource:()=>ae,defineComponents:()=>af,defineLocale:()=>ag,loadFileUploaderFrom:()=>ah,toKebabCase:()=>ai});let d=class{static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},e=class{static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},f=class{static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},g=class{static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},h=class{static observedAttributes=["text","icon","reverse","theme"];static template=`
  <button
    type="button"
    set="@role:aria-role; @aria-controls: aria-controls; @aria-label:title-prop"
    l10n="@title:title-prop;"
  >
    <uc-icon set="className: iconCss; @name: icon; @hidden: !icon"></uc-icon>
    <div class="uc-text">{{text}}</div>
  </button>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},i=class{static template=`
  <uc-activity-header>
    <button
      type="button"
      class="uc-mini-btn"
      set="onclick: *historyBack"
      l10n="@title:back"
    >
      <uc-icon name="back"></uc-icon>
    </button>
    <div set="@hidden: !cameraSelectHidden">
      <uc-icon name="camera"></uc-icon>
      <span l10n="caption-camera"></span>
    </div>
    <uc-select
      class="uc-camera-select"
      set="$.options: cameraSelectOptions; @hidden: cameraSelectHidden; onchange: onCameraSelectChange"
    >
    </uc-select>
    <button
      type="button"
      class="uc-mini-btn uc-close-btn"
      set="onclick: *closeModal"
      l10n="@title:a11y-activity-header-button-close;@aria-label:a11y-activity-header-button-close"
    >
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>
  <div class="uc-content">
    <video
      muted
      autoplay
      playsinline
      set="srcObject: video; style.transform: videoTransformCss; @hidden: videoHidden"
      ref="video"
    ></video>
    <div class="uc-message-box" set="@hidden: messageHidden">
      <span l10n="l10nMessage"></span>
      <button
        type="button"
        set="onclick: onRequestPermissions; @hidden: requestBtnHidden"
        l10n="camera-permissions-request"
      ></button>
    </div>
  </div>

  <div class="uc-controls">
    <div ref="switcher" class="uc-switcher" set="@hidden:!timerHidden">
      <button
        data-id="photo"
        type="button"
        class="uc-switch uc-mini-btn"
        set="onclick: onClickTab;  @hidden: tabCameraHidden"
      >
        <uc-icon name="camera"></uc-icon>
      </button>
      <button
        data-id="video"
        type="button"
        class="uc-switch uc-mini-btn"
        set="onclick: onClickTab; @hidden: tabVideoHidden"
      >
        <uc-icon name="video-camera"></uc-icon>
      </button>
    </div>

    <button
      class="uc-secondary-btn uc-recording-timer"
      set="@hidden:timerHidden; onclick: onToggleRecording"
    >
      <uc-icon set="@name: currentTimelineIcon"></uc-icon>
      <span ref="timer"> 00:00 </span>
      <span ref="line" class="uc-line"></span>
    </button>

    <div
      class="uc-camera-actions uc-camera-action"
      set="@hidden: cameraActionsHidden"
    >
      <button type="button" class="uc-secondary-btn" set="onclick: onRetake">
        Retake
      </button>
      <button
        type="button"
        class="uc-primary-btn"
        set="onclick: onAccept"
        data-testid="accept"
      >
        Accept
      </button>
    </div>

    <button
      type="button"
      class="uc-shot-btn uc-camera-action"
      data-testid="shot"
      set="onclick: onStartCamera; @class: mutableClassButton; @hidden: cameraHidden;"
    >
      <uc-icon set="@name: currentIcon"></uc-icon>
    </button>

    <div class="uc-select">
      <button
        class="uc-mini-btn uc-btn-microphone"
        set="onclick: onToggleAudio; @hidden: audioToggleMicrophoneHidden;"
      >
        <uc-icon set="@name:toggleMicrophoneIcon"></uc-icon>
      </button>

      <uc-select
        class="uc-audio-select"
        set="$.options: audioSelectOptions; onchange: onAudioSelectChange; @hidden: audioSelectHidden; @disabled: audioSelectDisabled"
      >
      </uc-select>
    </div>
  </div>
`;static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},j=class{static styleAttrs=[];static template=`
  <svg width='0' height='0' style='position:absolute'><symbol fill='none' viewBox='0 0 9 6' id='uc-icon-arrow-dropdown' xmlns='http://www.w3.org/2000/svg'><path stroke='currentColor' d='m1.5 1.667 3 2.666 3-2.666' opacity='.5'/></symbol><symbol viewBox='0 0 24 24' id='uc-icon-aspect-ratio' xmlns='http://www.w3.org/2000/svg'/><symbol viewBox='0 0 20 20' id='uc-icon-brightness' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M15 10a5 5 0 0 1-5 5m5-5a5 5 0 0 0-5-5m5 5h-5m0 5a5 5 0 0 1 0-10m0 10V5m0 15v-3M2.93 2.929 5.05 5.05M0 10h3m-.07 7.071 2.12-2.121M10 0v3m7.07 14.071-2.12-2.121M20 10h-3m.07-7.071L14.95 5.05m-.626 2.45H10m4.324 5H10'/></symbol><symbol fill='currentColor' viewBox='0 0 20 20' id='uc-icon-closeMax' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M8.232 10 3.585 5.353l1.768-1.768L10 8.232l4.648-4.647 1.767 1.768L11.768 10l4.647 4.648-1.767 1.767L10 11.768l-4.647 4.647-1.768-1.767L8.232 10Z' clip-rule='evenodd'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-contrast' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M2 10a8 8 0 1 0 16 0 8 8 0 1 0-16 0m8-8v16m8-8h-8m7.598 2.5H10m6.24 2.5H10m7.6-7.5H10M16.242 5H10'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-crop' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M20 14H7.005C6.45 14 6 13.55 6 12.995V0M0 6h13.067c.515 0 .933.418.933.933V20M14.5.4 13 2l1.5 1.6M13 2h2a3 3 0 0 1 3 3v2M5.5 19.6 7 18l-1.5-1.6M7 18H5a3 3 0 0 1-3-3v-2'/></symbol><symbol fill='currentColor' viewBox='0 0 20 20' id='uc-icon-done' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='m18.057 6.333-9.365 9.125a1.25 1.25 0 0 1-1.768-.023L1.92 10.296l1.791-1.744 4.132 4.243 8.47-8.253 1.744 1.79Z' clip-rule='evenodd'/></symbol><symbol fill='currentColor' viewBox='0 0 25 24' id='uc-icon-edit-file' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M18.558 2.804a.78.78 0 0 0-.557.235l-.008.007-2.472 2.46 3.847 3.848 2.46-2.473.004-.003a.78.78 0 0 0 0-1.108l-.004-.003-2.712-2.728a.78.78 0 0 0-.558-.235Zm-.248 7.613-3.852-3.852-8.93 8.887-1.516 5.41 5.41-1.515 8.888-8.93Zm-.636-8.934a2.28 2.28 0 0 1 2.512.505l2.702 2.717.002.002a2.278 2.278 0 0 1 0 3.234l-.002.002-12.541 12.602a.75.75 0 0 1-.33.193l-6.884 1.928a.75.75 0 0 1-.925-.924l1.928-6.885a.75.75 0 0 1 .193-.33l12.603-12.54a2.28 2.28 0 0 1 .742-.504Z' clip-rule='evenodd'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-enhance' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M19 13h-2m0 0a4 4 0 0 1-4-4m4 4a4 4 0 0 0-4 4m0-8V7m0 2a4 4 0 0 1-4 4m-2 0h2m0 0a4 4 0 0 1 4 4m0 0v2M8 8.5H6.5m0 0a2 2 0 0 1-2-2m2 2a2 2 0 0 0-2 2m0-4V5m0 1.5a2 2 0 0 1-2 2M1 8.5h1.5m0 0a2 2 0 0 1 2 2m0 0V12M12 3h-1m0 0a1 1 0 0 1-1-1m1 1a1 1 0 0 0-1 1m0-2V1m0 1a1 1 0 0 1-1 1M8 3h1m0 0a1 1 0 0 1 1 1m0 0v1'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-exposure' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M10 20v-3M2.93 2.929 5.05 5.05M0 10h3m-.07 7.071 2.12-2.121M10 0v3m7.07 14.071-2.12-2.121M20 10h-3m.07-7.071L14.95 5.05M5 10a5 5 0 1 0 10 0 5 5 0 1 0-10 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-filters' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M4.5 6.5a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0m-3.5 6a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0m7 0a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-flip' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M19.6 5 18 3.5 16.4 5m3.2 10L18 16.5 16.4 15M18 3.523v12.954M3.3 8.5h10.654c.301 0 .415-.395.159-.554L3.459 1.286A.3.3 0 0 0 3 1.542V8.2a.3.3 0 0 0 .3.3zm0 3h10.654c.301 0 .415.395.159.554l-10.654 6.66A.3.3 0 0 1 3 18.458v-6.66a.3.3 0 0 1 .3-.3z'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-gamma' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M17 3C9 6 2.5 11.5 2.5 17.5m0 0h1m-1 0v-1m14 1h1m-3 0h1m-3 0h1m-3 0h1m-3 0h1m-3 0h1m-3 0h1m-3-14v-1m0 3v-1m0 3v-1m0 3v-1m0 3v-1m0 3v-1m0 3v-1'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-mirror' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M5 .4 3.5 2 5 3.6M15 .4 16.5 2 15 3.6M3.52 2h12.957M8.5 16.7V6.046c0-.301-.394-.415-.554-.159L1.287 16.541a.3.3 0 0 0 .255.459H8.2a.3.3 0 0 0 .3-.3zm3 0V6.046c0-.301.395-.415.555-.159l6.659 10.654a.3.3 0 0 1-.255.459H11.8a.3.3 0 0 1-.3-.3z'/></symbol><symbol viewBox='0 0 40 40' id='uc-icon-original' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.5' d='M0 40 40 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-rotate' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M13.5.4 12 2l1.5 1.6M12.023 2H14.4A3.6 3.6 0 0 1 18 5.6V8M4 17h9a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1z'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-sad' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M2 17c4.418-4 11.582-4 16 0M16.5 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-11 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-saturation' xmlns='http://www.w3.org/2000/svg'><defs><linearGradient id='ruc-icon-id__a' x1='10.001' y1='1' x2='10.001' y2='19' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient></defs><circle cx='10.001' cy='10' r='9' transform='rotate(90 10 10)' fill='url(#ruc-icon-id__a)'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-slider' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M0 10h11m0 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m0 0h5'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-tuning' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M8 10h11M1 10h4M1 4.5h11m3 0h4m-18 11h11m3 0h4m-7-11a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M5 10a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0m7 5.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-vibrance' xmlns='http://www.w3.org/2000/svg'><path d='M2.125 5.64A8.96 8.96 0 0 0 1.001 10a8.96 8.96 0 0 0 1.124 4.36V5.64z' fill='url(#uuc-icon-id__a)'/><path d='M2.875 15.499V4.502a9.053 9.053 0 0 1 1.75-1.72v14.437a9.05 9.05 0 0 1-1.75-1.72z' fill='url(#uuc-icon-id__b)'/><path d='M5.375 17.722c.548.33 1.134.601 1.75.809V1.469a8.956 8.956 0 0 0-1.75.81v15.443z' fill='url(#uuc-icon-id__c)'/><path d='M7.875 1.253v17.495c.564.136 1.15.22 1.75.244V1.008a9 9 0 0 0-1.75.245z' fill='url(#uuc-icon-id__d)'/><path d='M10.375 1.008v17.984a9 9 0 0 0 1.75-.244V1.252a9 9 0 0 0-1.75-.244z' fill='url(#uuc-icon-id__e)'/><path d='M12.875 1.469V18.53a8.957 8.957 0 0 0 1.75-.808V2.277a8.957 8.957 0 0 0-1.75-.808z' fill='url(#uuc-icon-id__f)'/><path d='M15.375 2.78v14.44a9.053 9.053 0 0 0 1.75-1.72v-11a9.054 9.054 0 0 0-1.75-1.72z' fill='url(#uuc-icon-id__g)'/><path d='M17.875 5.638v8.724A8.959 8.959 0 0 0 19.001 10a8.96 8.96 0 0 0-1.126-4.362z' fill='url(#uuc-icon-id__h)'/><defs><linearGradient id='uuc-icon-id__a' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__b' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__c' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__d' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__e' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__f' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__g' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__h' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient></defs></symbol><symbol viewBox='0 0 20 20' id='uc-icon-warmth' xmlns='http://www.w3.org/2000/svg'><path d='m7.5 13.05.429.42.171-.175v-.244h-.6zm5 0h-.6v.245l.172.175.428-.42zM8.1 3.5c0-1.05.85-1.9 1.9-1.9V.4a3.1 3.1 0 0 0-3.1 3.1h1.2zm0 9.55V3.5H6.9v9.55h1.2zm-1 2.45c0-.79.315-1.506.829-2.03l-.858-.84A4.088 4.088 0 0 0 5.9 15.5h1.2zm2.9 2.9a2.9 2.9 0 0 1-2.9-2.9H5.9a4.1 4.1 0 0 0 4.1 4.1v-1.2zm2.9-2.9a2.9 2.9 0 0 1-2.9 2.9v1.2a4.1 4.1 0 0 0 4.1-4.1h-1.2zm-.829-2.03c.514.524.829 1.24.829 2.03h1.2c0-1.117-.447-2.13-1.171-2.87l-.858.84zM11.9 3.5v9.55h1.2V3.5h-1.2zM10 1.6c1.05 0 1.9.85 1.9 1.9h1.2A3.1 3.1 0 0 0 10 .4v1.2z' fill='currentColor'/><path d='M10 14V8' stroke='currentColor' stroke-width='1.2' stroke-linecap='round'/><path d='M14 3h3m-3 3h3m-3 3h3m-8 6.5a1 1 0 1 0 2 0 1 1 0 1 0-2 0' stroke='currentColor' stroke-width='1.2'/></symbol></svg>
  <div class="uc-wrapper uc-wrapper_desktop">
    <uc-presence-toggle class="uc-network_problems_splash" set="visible: presence.networkProblems;">
      <div class="uc-network_problems_content">
        <div class="uc-network_problems_icon">
          <uc-icon name="sad"></uc-icon>
        </div>
        <div class="uc-network_problems_text">Network error</div>
      </div>
      <div class="uc-network_problems_footer">
        <uc-btn-ui theme="primary" text="Retry" set="onclick: *on.retryNetwork"></uc-btn-ui>
      </div>
    </uc-presence-toggle>
    <div class="uc-viewport">
      <div class="uc-file_type_outer">
        <div class="uc-file_type">{{fileType}}</div>
      </div>
      <div class="uc-image_container" ref="img-container-el">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" class="uc-image uc-image_visible_from_editor" ref="img-el" />
        <uc-editor-image-cropper ref="cropper-el"></uc-editor-image-cropper>
        <uc-editor-image-fader ref="fader-el"></uc-editor-image-fader>
      </div>
      <div class="uc-info_pan">{{msg}}</div>
    </div>
    <div class="uc-toolbar">
      <uc-line-loader-ui set="active: showLoader"></uc-line-loader-ui>
      <div class="uc-toolbar_content uc-toolbar_content__editor">
        <uc-editor-toolbar></uc-editor-toolbar>
      </div>
    </div>
  </div>
`;static observedAttributes=["uuid","cdn-url","crop-preset","tabs"];static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},k=class{static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},l=class{static styleAttrs=[];static template=`
  <svg width='0' height='0' style='position:absolute'><symbol fill='none' viewBox='0 0 9 6' id='uc-icon-arrow-dropdown' xmlns='http://www.w3.org/2000/svg'><path stroke='currentColor' d='m1.5 1.667 3 2.666 3-2.666' opacity='.5'/></symbol><symbol viewBox='0 0 24 24' id='uc-icon-aspect-ratio' xmlns='http://www.w3.org/2000/svg'/><symbol viewBox='0 0 20 20' id='uc-icon-brightness' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M15 10a5 5 0 0 1-5 5m5-5a5 5 0 0 0-5-5m5 5h-5m0 5a5 5 0 0 1 0-10m0 10V5m0 15v-3M2.93 2.929 5.05 5.05M0 10h3m-.07 7.071 2.12-2.121M10 0v3m7.07 14.071-2.12-2.121M20 10h-3m.07-7.071L14.95 5.05m-.626 2.45H10m4.324 5H10'/></symbol><symbol fill='currentColor' viewBox='0 0 20 20' id='uc-icon-closeMax' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M8.232 10 3.585 5.353l1.768-1.768L10 8.232l4.648-4.647 1.767 1.768L11.768 10l4.647 4.648-1.767 1.767L10 11.768l-4.647 4.647-1.768-1.767L8.232 10Z' clip-rule='evenodd'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-contrast' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M2 10a8 8 0 1 0 16 0 8 8 0 1 0-16 0m8-8v16m8-8h-8m7.598 2.5H10m6.24 2.5H10m7.6-7.5H10M16.242 5H10'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-crop' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M20 14H7.005C6.45 14 6 13.55 6 12.995V0M0 6h13.067c.515 0 .933.418.933.933V20M14.5.4 13 2l1.5 1.6M13 2h2a3 3 0 0 1 3 3v2M5.5 19.6 7 18l-1.5-1.6M7 18H5a3 3 0 0 1-3-3v-2'/></symbol><symbol fill='currentColor' viewBox='0 0 20 20' id='uc-icon-done' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='m18.057 6.333-9.365 9.125a1.25 1.25 0 0 1-1.768-.023L1.92 10.296l1.791-1.744 4.132 4.243 8.47-8.253 1.744 1.79Z' clip-rule='evenodd'/></symbol><symbol fill='currentColor' viewBox='0 0 25 24' id='uc-icon-edit-file' xmlns='http://www.w3.org/2000/svg'><path fill-rule='evenodd' d='M18.558 2.804a.78.78 0 0 0-.557.235l-.008.007-2.472 2.46 3.847 3.848 2.46-2.473.004-.003a.78.78 0 0 0 0-1.108l-.004-.003-2.712-2.728a.78.78 0 0 0-.558-.235Zm-.248 7.613-3.852-3.852-8.93 8.887-1.516 5.41 5.41-1.515 8.888-8.93Zm-.636-8.934a2.28 2.28 0 0 1 2.512.505l2.702 2.717.002.002a2.278 2.278 0 0 1 0 3.234l-.002.002-12.541 12.602a.75.75 0 0 1-.33.193l-6.884 1.928a.75.75 0 0 1-.925-.924l1.928-6.885a.75.75 0 0 1 .193-.33l12.603-12.54a2.28 2.28 0 0 1 .742-.504Z' clip-rule='evenodd'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-enhance' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M19 13h-2m0 0a4 4 0 0 1-4-4m4 4a4 4 0 0 0-4 4m0-8V7m0 2a4 4 0 0 1-4 4m-2 0h2m0 0a4 4 0 0 1 4 4m0 0v2M8 8.5H6.5m0 0a2 2 0 0 1-2-2m2 2a2 2 0 0 0-2 2m0-4V5m0 1.5a2 2 0 0 1-2 2M1 8.5h1.5m0 0a2 2 0 0 1 2 2m0 0V12M12 3h-1m0 0a1 1 0 0 1-1-1m1 1a1 1 0 0 0-1 1m0-2V1m0 1a1 1 0 0 1-1 1M8 3h1m0 0a1 1 0 0 1 1 1m0 0v1'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-exposure' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M10 20v-3M2.93 2.929 5.05 5.05M0 10h3m-.07 7.071 2.12-2.121M10 0v3m7.07 14.071-2.12-2.121M20 10h-3m.07-7.071L14.95 5.05M5 10a5 5 0 1 0 10 0 5 5 0 1 0-10 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-filters' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M4.5 6.5a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0m-3.5 6a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0m7 0a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-flip' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M19.6 5 18 3.5 16.4 5m3.2 10L18 16.5 16.4 15M18 3.523v12.954M3.3 8.5h10.654c.301 0 .415-.395.159-.554L3.459 1.286A.3.3 0 0 0 3 1.542V8.2a.3.3 0 0 0 .3.3zm0 3h10.654c.301 0 .415.395.159.554l-10.654 6.66A.3.3 0 0 1 3 18.458v-6.66a.3.3 0 0 1 .3-.3z'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-gamma' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M17 3C9 6 2.5 11.5 2.5 17.5m0 0h1m-1 0v-1m14 1h1m-3 0h1m-3 0h1m-3 0h1m-3 0h1m-3 0h1m-3 0h1m-3-14v-1m0 3v-1m0 3v-1m0 3v-1m0 3v-1m0 3v-1m0 3v-1'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-mirror' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M5 .4 3.5 2 5 3.6M15 .4 16.5 2 15 3.6M3.52 2h12.957M8.5 16.7V6.046c0-.301-.394-.415-.554-.159L1.287 16.541a.3.3 0 0 0 .255.459H8.2a.3.3 0 0 0 .3-.3zm3 0V6.046c0-.301.395-.415.555-.159l6.659 10.654a.3.3 0 0 1-.255.459H11.8a.3.3 0 0 1-.3-.3z'/></symbol><symbol viewBox='0 0 40 40' id='uc-icon-original' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.5' d='M0 40 40 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-rotate' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M13.5.4 12 2l1.5 1.6M12.023 2H14.4A3.6 3.6 0 0 1 18 5.6V8M4 17h9a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1z'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-sad' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M2 17c4.418-4 11.582-4 16 0M16.5 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-11 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-saturation' xmlns='http://www.w3.org/2000/svg'><defs><linearGradient id='ruc-icon-id__a' x1='10.001' y1='1' x2='10.001' y2='19' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient></defs><circle cx='10.001' cy='10' r='9' transform='rotate(90 10 10)' fill='url(#ruc-icon-id__a)'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-slider' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M0 10h11m0 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m0 0h5'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-tuning' xmlns='http://www.w3.org/2000/svg'><path stroke-linejoin='round' fill='none' stroke='currentColor' stroke-width='1.2' d='M8 10h11M1 10h4M1 4.5h11m3 0h4m-18 11h11m3 0h4m-7-11a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M5 10a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0m7 5.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0'/></symbol><symbol viewBox='0 0 20 20' id='uc-icon-vibrance' xmlns='http://www.w3.org/2000/svg'><path d='M2.125 5.64A8.96 8.96 0 0 0 1.001 10a8.96 8.96 0 0 0 1.124 4.36V5.64z' fill='url(#uuc-icon-id__a)'/><path d='M2.875 15.499V4.502a9.053 9.053 0 0 1 1.75-1.72v14.437a9.05 9.05 0 0 1-1.75-1.72z' fill='url(#uuc-icon-id__b)'/><path d='M5.375 17.722c.548.33 1.134.601 1.75.809V1.469a8.956 8.956 0 0 0-1.75.81v15.443z' fill='url(#uuc-icon-id__c)'/><path d='M7.875 1.253v17.495c.564.136 1.15.22 1.75.244V1.008a9 9 0 0 0-1.75.245z' fill='url(#uuc-icon-id__d)'/><path d='M10.375 1.008v17.984a9 9 0 0 0 1.75-.244V1.252a9 9 0 0 0-1.75-.244z' fill='url(#uuc-icon-id__e)'/><path d='M12.875 1.469V18.53a8.957 8.957 0 0 0 1.75-.808V2.277a8.957 8.957 0 0 0-1.75-.808z' fill='url(#uuc-icon-id__f)'/><path d='M15.375 2.78v14.44a9.053 9.053 0 0 0 1.75-1.72v-11a9.054 9.054 0 0 0-1.75-1.72z' fill='url(#uuc-icon-id__g)'/><path d='M17.875 5.638v8.724A8.959 8.959 0 0 0 19.001 10a8.96 8.96 0 0 0-1.126-4.362z' fill='url(#uuc-icon-id__h)'/><defs><linearGradient id='uuc-icon-id__a' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__b' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__c' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__d' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__e' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__f' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__g' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient><linearGradient id='uuc-icon-id__h' x1='19.001' y1='10' x2='1.001' y2='10' gradientUnits='userSpaceOnUse'><stop stop-color='#DE15FF'/><stop offset='.203' stop-color='#0029FF'/><stop offset='.479' stop-color='#2AE4F0'/><stop offset='.604' stop-color='#15EF11'/><stop offset='.75' stop-color='#FAE528'/><stop offset='1' stop-color='#EB2A2A'/></linearGradient></defs></symbol><symbol viewBox='0 0 20 20' id='uc-icon-warmth' xmlns='http://www.w3.org/2000/svg'><path d='m7.5 13.05.429.42.171-.175v-.244h-.6zm5 0h-.6v.245l.172.175.428-.42zM8.1 3.5c0-1.05.85-1.9 1.9-1.9V.4a3.1 3.1 0 0 0-3.1 3.1h1.2zm0 9.55V3.5H6.9v9.55h1.2zm-1 2.45c0-.79.315-1.506.829-2.03l-.858-.84A4.088 4.088 0 0 0 5.9 15.5h1.2zm2.9 2.9a2.9 2.9 0 0 1-2.9-2.9H5.9a4.1 4.1 0 0 0 4.1 4.1v-1.2zm2.9-2.9a2.9 2.9 0 0 1-2.9 2.9v1.2a4.1 4.1 0 0 0 4.1-4.1h-1.2zm-.829-2.03c.514.524.829 1.24.829 2.03h1.2c0-1.117-.447-2.13-1.171-2.87l-.858.84zM11.9 3.5v9.55h1.2V3.5h-1.2zM10 1.6c1.05 0 1.9.85 1.9 1.9h1.2A3.1 3.1 0 0 0 10 .4v1.2z' fill='currentColor'/><path d='M10 14V8' stroke='currentColor' stroke-width='1.2' stroke-linecap='round'/><path d='M14 3h3m-3 3h3m-3 3h3m-8 6.5a1 1 0 1 0 2 0 1 1 0 1 0-2 0' stroke='currentColor' stroke-width='1.2'/></symbol></svg>
  <div class="uc-wrapper uc-wrapper_desktop">
    <uc-presence-toggle class="uc-network_problems_splash" set="visible: presence.networkProblems;">
      <div class="uc-network_problems_content">
        <div class="uc-network_problems_icon">
          <uc-icon name="sad"></uc-icon>
        </div>
        <div class="uc-network_problems_text">Network error</div>
      </div>
      <div class="uc-network_problems_footer">
        <uc-btn-ui theme="primary" text="Retry" set="onclick: *on.retryNetwork"></uc-btn-ui>
      </div>
    </uc-presence-toggle>
    <div class="uc-viewport">
      <div class="uc-file_type_outer">
        <div class="uc-file_type">{{fileType}}</div>
      </div>
      <div class="uc-image_container" ref="img-container-el">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" class="uc-image uc-image_visible_from_editor" ref="img-el" />
        <uc-editor-image-cropper ref="cropper-el"></uc-editor-image-cropper>
        <uc-editor-image-fader ref="fader-el"></uc-editor-image-fader>
      </div>
      <div class="uc-info_pan">{{msg}}</div>
    </div>
    <div class="uc-toolbar">
      <uc-line-loader-ui set="active: showLoader"></uc-line-loader-ui>
      <div class="uc-toolbar_content uc-toolbar_content__editor">
        <uc-editor-toolbar></uc-editor-toolbar>
      </div>
    </div>
  </div>
`;static observedAttributes=["uuid","cdn-url","crop-preset","tabs"];static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},m=class{static observedAttributes=["debug","pubkey","multiple","multiple-min","multiple-max","confirm-upload","img-only","accept","external-sources-preferred-types","external-sources-embed-css","store","camera-mirror","camera-capture","source-list","top-level-origin","cloud-image-editor-tabs","max-local-file-size-bytes","thumb-size","show-empty-list","use-local-image-editor","use-cloud-image-editor","remove-copyright","crop-preset","image-shrink","modal-scroll-lock","modal-backdrop-strokes","source-list-wrap","remote-tab-session-key","cdn-cname","cdn-cname-prefixed","base-url","social-base-url","secure-signature","secure-expire","secure-delivery-proxy","retry-throttled-request-max-times","retry-network-error-max-times","multipart-min-file-size","multipart-chunk-size","max-concurrent-requests","multipart-max-concurrent-requests","multipart-max-attempts","check-for-url-duplicates","save-url-for-recurrent-uploads","group-output","user-agent-integration","locale-name","secure-uploads-expire-threshold","validation-timeout","validation-concurrency","camera-modes","default-camera-mode","enable-audio-recording","enable-video-recording","max-video-recording-duration","files-view-mode","grid-show-file-names","cloud-image-editor-auto-open","cloud-image-editor-mask-href","test-mode","quality-insights","multiplemin","multiplemax","confirmupload","imgonly","externalsourcespreferredtypes","externalsourcesembedcss","cameramirror","cameracapture","sourcelist","toplevelorigin","cloudimageeditortabs","maxlocalfilesizebytes","thumbsize","showemptylist","uselocalimageeditor","usecloudimageeditor","removecopyright","croppreset","imageshrink","modalscrolllock","modalbackdropstrokes","sourcelistwrap","remotetabsessionkey","cdncname","cdncnameprefixed","baseurl","socialbaseurl","securesignature","secureexpire","securedeliveryproxy","retrythrottledrequestmaxtimes","retrynetworkerrormaxtimes","multipartminfilesize","multipartchunksize","maxconcurrentrequests","multipartmaxconcurrentrequests","multipartmaxattempts","checkforurlduplicates","saveurlforrecurrentuploads","groupoutput","useragentintegration","localename","secureuploadsexpirethreshold","validationtimeout","validationconcurrency","cameramodes","defaultcameramode","enableaudiorecording","enablevideorecording","maxvideorecordingduration","filesviewmode","gridshowfilenames","cloudimageeditorautoopen","cloudimageeditormaskhref","testmode","qualityinsights"];static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},n=class{static template=`
    <a
      href="https://uploadcare.com/?utm_source=copyright&utm_medium=referral&utm_campaign=v4"
      target="_blank noopener"
      class="uc-credits"
      >Powered by Uploadcare</a
    >
  `;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},o=class{static template=' <svg class="uc-svg" ref="svg-el" xmlns="http://www.w3.org/2000/svg"></svg> ';static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},p=class{static warn=()=>{};static registerCtx=()=>{};static deleteCtx=()=>{};static getCtx=()=>{};static globalStore={};static apply=()=>{};static bind=()=>{};static call=()=>{};static toString=()=>{};static hasOwnProperty=()=>{};static isPrototypeOf=()=>{};static propertyIsEnumerable=()=>{};static valueOf=()=>{};static toLocaleString=()=>{}},q=class{static styleAttrs=[];static template=`
  <slot>
    <div data-default-slot hidden></div>
    <div ref="content-wrapper" class="uc-content-wrapper" set="@hidden: !isVisible">
      <div class="uc-icon-container" set="@hidden: !withIcon">
        <uc-icon name="default"></uc-icon>
        <uc-icon name="arrow-down"></uc-icon>
      </div>
      <span class="uc-text">{{text}}</span>
    </div>
  </slot>
`;static observedAttributes=["with-icon","clickable","text","fullscreen","disabled","initflow"];static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},r=class{static template=`
  <button role="option" type="button" set="@aria-label:title-prop;" l10n="@title:title-prop;">
    <uc-icon ref="icon-el" set="@name: icon;"></uc-icon>
    <div class="uc-title" ref="title-el">{{title}}</div>
  </button>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},s=class{static template=`
  <button role="option" type="button" set="@aria-label:title-prop;" l10n="@title:title-prop;">
    <uc-icon ref="icon-el" set="@name: icon;"></uc-icon>
    <div class="uc-title" ref="title-el">{{title}}</div>
  </button>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},t=class{static template=`
  <button role="option" type="button" set="@aria-label:title-prop;" l10n="@title:title-prop;">
    <uc-icon ref="icon-el" set="@name: icon;"></uc-icon>
    <div class="uc-title" ref="title-el">{{title}}</div>
  </button>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},u=class{static template=`
  <button role="option" type="button" set="@aria-label:title-prop;" l10n="@title:title-prop;">
    <uc-icon ref="icon-el" set="@name: icon;"></uc-icon>
    <div class="uc-title" ref="title-el">{{title}}</div>
  </button>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},v=class{static template=`
  <canvas class="uc-canvas" ref="canvas-el"></canvas>
  <uc-crop-frame ref="frame-el"></uc-crop-frame>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},w=class{static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},x=class{static template=`
  <button role="option" type="button" set="@aria-label:title-prop;" l10n="@title:title-prop;">
    <uc-icon ref="icon-el" set="@name: icon;"></uc-icon>
    <div class="uc-title" ref="title-el">{{title}}</div>
  </button>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},y=class{static template=" <slot></slot> ";static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},z=class{static template=`
  <uc-slider-ui
    ref="slider-el"
    set="disabled: disabled; min: min; max: max; defaultValue: defaultValue; zero: zero; onInput: on.input;"
  ></uc-slider-ui>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},A=class{static template=`
  <uc-line-loader-ui set="active: showLoader"></uc-line-loader-ui>
  <div class="uc-info-tooltip_container">
    <div class="uc-info-tooltip_wrapper">
      <div ref="tooltip-el" class="uc-info-tooltip uc-info-tooltip_hidden">{{*operationTooltip}}</div>
    </div>
  </div>
  <div class="uc-toolbar-container">
    <uc-presence-toggle
      role="tablist"
      class="uc-sub-toolbar"
      set="visible: presence.mainToolbar; styles: presence.subTopToolbarStyles"
    >
      <div class="uc-tab-content-row">
    <uc-presence-toggle
      id="tab_crop"
      class="uc-tab-content"
      set="visible: presence.tabContent.crop; styles: presence.tabContentStyles"
    >
      <uc-editor-scroller hidden-scrollbar>
        <div class="uc-controls-list_align">
          <div
            role="listbox"
            aria-orientation="horizontal"
            class="uc-controls-list_inner"
            ref="controls-list-crop"
          ></div>
        </div>
      </uc-editor-scroller>
    </uc-presence-toggle>
  
    <uc-presence-toggle
      id="tab_tuning"
      class="uc-tab-content"
      set="visible: presence.tabContent.tuning; styles: presence.tabContentStyles"
    >
      <uc-editor-scroller hidden-scrollbar>
        <div class="uc-controls-list_align">
          <div
            role="listbox"
            aria-orientation="horizontal"
            class="uc-controls-list_inner"
            ref="controls-list-tuning"
          ></div>
        </div>
      </uc-editor-scroller>
    </uc-presence-toggle>
  
    <uc-presence-toggle
      id="tab_filters"
      class="uc-tab-content"
      set="visible: presence.tabContent.filters; styles: presence.tabContentStyles"
    >
      <uc-editor-scroller hidden-scrollbar>
        <div class="uc-controls-list_align">
          <div
            role="listbox"
            aria-orientation="horizontal"
            class="uc-controls-list_inner"
            ref="controls-list-filters"
          ></div>
        </div>
      </uc-editor-scroller>
    </uc-presence-toggle>
  </div>
      <div class="uc-controls-row">
        <uc-presence-toggle
          class="uc-tab-toggles"
          set="visible: presence.tabToggles; styles: presence.tabTogglesStyles"
        >
          <div ref="tabs-indicator" class="uc-tab-toggles_indicator"></div>
          
    <uc-presence-toggle
      class="uc-tab-toggle"
      set="visible: presence.tabToggle.crop; styles: presence.tabToggleStyles;"
    >
      <uc-btn-ui
        theme="tab"
        ref="tab-toggle-crop"
        data-id="crop"
        icon="crop"
        set="onclick: on.clickTab; aria-role:tab_role; aria-controls:tab_crop; title-prop: a11y-editor-tab-crop"
      >
      </uc-btn-ui>
    </uc-presence-toggle>
  
    <uc-presence-toggle
      class="uc-tab-toggle"
      set="visible: presence.tabToggle.tuning; styles: presence.tabToggleStyles;"
    >
      <uc-btn-ui
        theme="tab"
        ref="tab-toggle-tuning"
        data-id="tuning"
        icon="tuning"
        set="onclick: on.clickTab; aria-role:tab_role; aria-controls:tab_tuning; title-prop: a11y-editor-tab-tuning"
      >
      </uc-btn-ui>
    </uc-presence-toggle>
  
    <uc-presence-toggle
      class="uc-tab-toggle"
      set="visible: presence.tabToggle.filters; styles: presence.tabToggleStyles;"
    >
      <uc-btn-ui
        theme="tab"
        ref="tab-toggle-filters"
        data-id="filters"
        icon="filters"
        set="onclick: on.clickTab; aria-role:tab_role; aria-controls:tab_filters; title-prop: a11y-editor-tab-filters"
      >
      </uc-btn-ui>
    </uc-presence-toggle>
  
        </uc-presence-toggle>
        <uc-btn-ui style="order: -1" theme="secondary-icon" icon="closeMax" set="onclick: on.cancel; title-prop:cancel">
        </uc-btn-ui>
        <uc-btn-ui theme="primary-icon" icon="done" set="onclick: on.apply; title-prop:apply"> </uc-btn-ui>
      </div>
    </uc-presence-toggle>
    <uc-presence-toggle
      class="uc-sub-toolbar"
      set="visible: presence.subToolbar; styles: presence.subBottomToolbarStyles"
    >
      <div class="uc-slider" set="@hidden:!hideSliderOrList">
        <uc-editor-slider ref="slider-el"></uc-editor-slider>
      </div>

      <div set="@hidden:hideSliderOrList" class="uc-list-aspect-ratio-container">
        <div class="uc-list-aspect-ratio" ref="list-el"></div>
      </div>
      <div class="uc-controls-row">
        <uc-btn-ui theme="secondary" set="onclick: on.cancelSlider" l10n="@text:cancel"> </uc-btn-ui>
        <uc-btn-ui theme="primary" set="onclick: on.applySlider" l10n="@text:apply"> </uc-btn-ui>
      </div>
    </uc-presence-toggle>
  </div>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},B=class{static template=`
  <uc-activity-header>
    <button
      type="button"
      class="uc-mini-btn uc-close-btn"
      set="onclick: *historyBack"
      l10n="@title:a11y-activity-header-button-close;@aria-label:a11y-activity-header-button-close"
    >
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>
  <div class="uc-content">
    <div ref="iframeWrapper" class="uc-iframe-wrapper"></div>
    <div class="uc-toolbar" set="@hidden: !toolbarVisible">
      <button type="button" class="uc-cancel-btn uc-secondary-btn" set="onclick: onCancel" l10n="cancel"></button>
      <div set="@hidden: !showSelectionStatus" class="uc-selection-status-box">
        <span>{{counterText}}</span>
        <button type="button" set="onclick: onSelectAll; @hidden: !couldSelectAll" l10n="select-all"></button>
        <button type="button" set="onclick: onDeselectAll; @hidden: !couldDeselectAll" l10n="deselect-all"></button>
      </div>
      <button
        type="button"
        class="uc-done-btn uc-primary-btn"
        set="onclick: onDone; @disabled: !isDoneBtnEnabled; @hidden: !showDoneBtn"
      >
        <uc-spinner set="@hidden: isSelectionReady"></uc-spinner>
        <span l10n="done" set="@class: doneBtnTextClass"></span>
      </button>
    </div>
  </div>
`;static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},C={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"},D=class{static template=`
  <div class="uc-inner" set="@finished: isFinished; @uploading: isUploading; @failed: isFailed; @focused: isFocused">
    <uc-thumb set="uid:uid;badgeIcon:badgeIcon"></uc-thumb>

    <div aria-atomic="true" aria-live="polite" class="uc-file-name-wrapper" set="@aria-label:ariaLabelStatusFile;">
      <span class="uc-file-name" set="@hidden: !showFileNames">{{itemName}}</span>
      <span class="uc-file-error" set="@hidden: !errorText;">{{errorText}}</span>
      <span class="uc-file-hint" set="@hidden: !hint">{{hint}}</span>
    </div>
    <div class="uc-file-actions">
      <button
        type="button"
        l10n="@title:file-item-edit-button;@aria-label:file-item-edit-button"
        class="uc-edit-btn uc-mini-btn"
        set="onclick: onEdit; @hidden: !isEditable"
      >
        <uc-icon name="edit-file"></uc-icon>
      </button>
      <button
        type="button"
        l10n="@title:file-item-remove-button;@aria-label:file-item-remove-button"
        class="uc-remove-btn uc-mini-btn"
        set="onclick: onRemove;"
      >
        <uc-icon name="remove-file"></uc-icon>
      </button>
      <button type="button" class="uc-upload-btn uc-mini-btn" set="onclick: onUpload;">
        <uc-icon name="upload"></uc-icon>
      </button>
    </div>
    <uc-progress-bar
      class="uc-progress-bar"
      set="value: progressValue; visible: progressVisible; @hasFileName: showFileNames;"
    >
    </uc-progress-bar>
  </div>
`;static activeInstances={};static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},E=class{static styleAttrs=[];static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},F=class{static styleAttrs=[];static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},G=class{static styleAttrs=[];static observedAttributes=["headless"];static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},H=class{static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},I=class{static template=`
  <svg ref="svg" xmlns="http://www.w3.org/2000/svg">
    <use set="@href: href;"></use>
  </svg>
`;static observedAttributes=["name"];static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},J=class{static observedAttributes=["dev-mode","pubkey","uuid","src","lazy","intersection","breakpoints","cdn-cname","proxy-cname","secure-delivery-proxy","hi-res-support","ultra-res-support","format","cdn-operations","progressive","quality","is-background-for","is-preview-blur"];static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},K=class{static template=`
  <div class="uc-inner">
    <div class="uc-line" ref="line-el"></div>
  </div>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},L=class{static styleAttrs=[];static StateConsumerScope="modal";static template=`
  <dialog ref="dialog">
    <slot></slot>
  </dialog>
`;static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},M={ADD:"modal:add",DELETE:"modal:delete",OPEN:"modal:open",CLOSE:"modal:close",CLOSE_ALL:"modal:closeAll",DESTROY:"modal:destroy"},N="blocks",O="1.24.4",P=class{static template="<slot></slot> ";static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},Q=class{static template=`
  <div ref="fakeProgressLine" class="uc-fake-progress"></div>
  <div ref="realProgressLine" class="uc-progress"></div>
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},R=class{static template=' <uc-progress-bar set="visible: visible; value: value"></uc-progress-bar> ';static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},S=class{static template=' <select ref="select" set="innerHTML: selectHtml; onchange: onSelect"></select> ';static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},T=class{static styleAttrs=[];static template=`
  <uc-drop-area set="@disabled: !withDropZone">
    <button type="button" set="onclick: onClick">
      <uc-icon name="upload"></uc-icon>
      <span l10n="button-text"></span>
      <slot></slot>
      <div class="uc-visual-drop-area" l10n="drop-files-here"></div>
    </button>
  </uc-drop-area>
`;static observedAttributes=["dropzone"];static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},U=class{static template=`
  <div class="uc-steps" ref="steps-el"></div>
  <div ref="thumb-el" class="uc-thumb"></div>
  <input
    class="uc-input"
    type="range"
    ref="input-el"
    set="oninput: on.sliderInput; onchange: on.sliderChange; @min: min; @max: max; @value: defaultValue;"
  />
`;static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},V=class{static styleAttrs=[];static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},W=class{static template=`
  <button type="button">
    <uc-icon set="@name: iconName"></uc-icon>
    <div class="uc-txt" l10n="src-type"></div>
  </button>
`;static observedAttributes=["type"];static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},X=class{static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},Y=class{static template=' <div class="uc-spinner"></div> ';static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},Z=class{static template=' <div class="uc-content"><slot></slot></div> ';static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},$=class{static template=`
  <div class="uc-thumb" set="style.backgroundImage: thumbUrl">
    <div class="uc-badge">
      <uc-icon set="@name: badgeIcon"></uc-icon>
    </div>
  </div>
`;static observedAttributes=["badgeIcon","uid"];static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},_=class{static generate=()=>{};static apply=()=>{};static bind=()=>{};static call=()=>{};static toString=()=>{};static hasOwnProperty=()=>{};static isPrototypeOf=()=>{};static propertyIsEnumerable=()=>{};static valueOf=()=>{};static toLocaleString=()=>{}},aa=class{static styleAttrs=[];static EventType={FILE_ADDED:"file-added",FILE_REMOVED:"file-removed",FILE_UPLOAD_START:"file-upload-start",FILE_UPLOAD_PROGRESS:"file-upload-progress",FILE_UPLOAD_SUCCESS:"file-upload-success",FILE_UPLOAD_FAILED:"file-upload-failed",FILE_URL_CHANGED:"file-url-changed",MODAL_OPEN:"modal-open",MODAL_CLOSE:"modal-close",DONE_CLICK:"done-click",UPLOAD_CLICK:"upload-click",ACTIVITY_CHANGE:"activity-change",COMMON_UPLOAD_START:"common-upload-start",COMMON_UPLOAD_PROGRESS:"common-upload-progress",COMMON_UPLOAD_SUCCESS:"common-upload-success",COMMON_UPLOAD_FAILED:"common-upload-failed",CHANGE:"change",GROUP_CREATED:"group-created"};static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static is="sym-1";static bindAttributes=()=>{}},ab=class{static template=`
  <uc-activity-header>
    <span aria-live="polite" class="uc-header-text">{{headerText}}</span>
    <button
      type="button"
      class="uc-mini-btn uc-close-btn"
      set="onclick: *closeModal"
      l10n="@title:a11y-activity-header-button-close;@aria-label:a11y-activity-header-button-close"
    >
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>

  <div class="uc-no-files" set="@hidden: hasFiles">
    <slot name="empty"><span l10n="no-files"></span></slot>
  </div>

  <div class="uc-files">
    <div class="uc-files-wrapper" repeat="*uploadList" repeat-item-tag="uc-file-item"></div>
    <button
      type="button"
      class="uc-add-more-btn uc-secondary-btn"
      set="onclick: onAdd; @disabled: !addMoreBtnEnabled; @hidden: !addMoreBtnVisible"
    >
      <uc-icon name="add"></uc-icon><span l10n="add-more"></span>
    </button>
  </div>

  <div class="uc-common-error" set="@hidden: !commonErrorMessage; textContent: commonErrorMessage;"></div>

  <div class="uc-toolbar">
    <button type="button" class="uc-cancel-btn uc-secondary-btn" set="onclick: onCancel;" l10n="clear"></button>
    <div class="uc-toolbar-spacer"></div>
    <button
      type="button"
      class="uc-add-more-btn uc-secondary-btn"
      set="onclick: onAdd; @disabled: !addMoreBtnEnabled; @hidden: !addMoreBtnVisible"
    >
      <uc-icon name="add"></uc-icon><span l10n="add-more"></span>
    </button>
    <button
      type="button"
      class="uc-upload-btn uc-primary-btn"
      set="@hidden: !uploadBtnVisible; onclick: onUpload;"
      l10n="upload"
    ></button>
    <button
      type="button"
      class="uc-done-btn uc-primary-btn"
      set="@hidden: !doneBtnVisible; onclick: onDone;  @disabled: !doneBtnEnabled"
      l10n="done"
    ></button>
  </div>

  <uc-drop-area ghost></uc-drop-area>
`;static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},ac={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"},ad=class{static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},ae=class{static template=`
  <uc-activity-header>
    <button type="button" class="uc-mini-btn" set="onclick: *historyBack" l10n="@title:back;@aria-label:back">
      <uc-icon name="back"></uc-icon>
    </button>
    <div>
      <uc-icon name="url"></uc-icon>
      <span l10n="caption-from-url"></span>
    </div>
    <button
      type="button"
      class="uc-mini-btn uc-close-btn"
      set="onclick: *closeModal"
      l10n="@title:a11y-activity-header-button-close;@aria-label:a11y-activity-header-button-close"
    >
      <uc-icon name="close"></uc-icon>
    </button>
  </uc-activity-header>
  <form class="uc-content">
    <label>
      <input placeholder="https://" class="uc-url-input" type="text" ref="input" set="oninput: onInput" />
    </label>
    <button
      type="submit"
      class="uc-url-upload-btn uc-primary-btn"
      set="onclick: onUpload; @disabled: importDisabled"
      l10n="upload-url"
    ></button>
  </form>
`;static extSrcList={FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static sourceTypes={LOCAL:"local",DROP_AREA:"drop-area",CAMERA:"camera",EXTERNAL:"external",API:"js-api",URL:"url",DRAW:"draw",MOBILE_VIDEO_CAMERA:"mobile-video-camera",MOBILE_PHOTO_CAMERA:"mobile-photo-camera",FACEBOOK:"facebook",DROPBOX:"dropbox",GDRIVE:"gdrive",GPHOTOS:"gphotos",FLICKR:"flickr",VK:"vk",EVERNOTE:"evernote",BOX:"box",ONEDRIVE:"onedrive",HUDDLE:"huddle"};static activities={START_FROM:"start-from",CAMERA:"camera",DRAW:"draw",UPLOAD_LIST:"upload-list",URL:"url",CLOUD_IMG_EDIT:"cloud-image-edit",EXTERNAL:"external"};static reg=()=>{};static styleAttrs=[];static is="sym-1";static bindAttributes=()=>{}},af=()=>{},ag=()=>{},ah=()=>{},ai=()=>{},aj=!0}};