/* FUNADE: visual effects, navigation, schedule status and banner lightbox. */
/* ============================================================
   ヒーロー下端のもや

   最初に下へスクロールしたことを合図に、あとはスクロールと関係なく
   0.7秒で出しきる（依頼主 2026-09-11）。動かし方は style.css の
   .is-smoke-ready / .is-smoked。

   以前は CSS の scroll() の時間軸に繋いでいた。出る速さがスクロール量に
   そのまま連動するので、指を止めるともやも止まり、戻すと引っ込んだ。
   ここでするのはクラスを1つ付けることだけで、合図を受けたら二度と
   外さない ―― 上へ戻ってももやは消えない。
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!document.querySelector('.hero-art')) return;
  /* 動きを減らす設定のときは触らない＝もやが最初から出ている状態 */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  root.classList.add('is-smoke-ready');

  /* 途中まで進んだ位置で開き直したとき（再読み込みなど）は、
     合図を待たずに最初から出しておく。 */
  if (window.pageYOffset > 4) { root.classList.add('is-smoked'); return; }

  var fire = function () {
    if (window.pageYOffset <= 4) return;
    root.classList.add('is-smoked');
    window.removeEventListener('scroll', fire);
  };
  window.addEventListener('scroll', fire, { passive: true });
}());

/* ============================================================
   昼と夜の切り替え
   ============================================================
   ロゴへの約0.85秒の滞留、クリック、タップ、Enter / Spaceで切り替える。
   太陽・月の入れ替えは約2.2秒。背景のクロスフェードは途中から始める。
   動きを減らす設定では演出せず即時切り替え。時刻の自動判定も維持する。 */
(function () {
  'use strict';
  var sw = document.querySelector('[data-nightswitch]');
  if (!sw) return;

  var HOLD = 850;
  var timer = null;

  var root = document.documentElement;
  var requestId = 0;
  var hourFormatter = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'});
  function nightAt(date) { var hour = Number(hourFormatter.format(date)); return hour >= 22 || hour < 5; }
  function updateTheme(night) {
    root.classList.toggle('is-night', night);
    sw.setAttribute('aria-pressed', night ? 'true' : 'false');
  }
  var celestialBusy = false;
  function animateCelestial(night, change) {
    var sun=sw.querySelector('.logo-sun'),moon=sw.querySelector('.logo-moon');
    if(!sun||!moon){change();return;}
    celestialBusy=true;
    sw.classList.add('is-celestial-transition');
    var outgoing=night?sun:moon,incoming=night?moon:sun;
    outgoing.style.animation='funade-celestial-set 1050ms cubic-bezier(.4,0,.6,1) forwards';
    incoming.style.animation='funade-celestial-rise 1200ms cubic-bezier(.2,.6,.3,1) 1000ms both';
    setTimeout(change,950);
    setTimeout(function(){
      sun.style.animation='';moon.style.animation='';
      sw.classList.remove('is-celestial-transition');celestialBusy=false;
    },2250);
  }
  function applyTheme(night, animate) {
    if(celestialBusy)return;
    var id = ++requestId;
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {updateTheme(night);return;}
    if (root.classList.contains('is-night') === night) return;
    var img = new Image();
    img.src = 'assets/img/backgrounds/' + (night ? 'hero-night-navy-paper-v7.jpg' : 'hero-day-no-stars-v2.jpg');
    var ready = img.decode ? img.decode().catch(function(){}) : Promise.resolve();
    ready.then(function(){
      if (id !== requestId) return;
      animateCelestial(night,function(){
      if (document.startViewTransition && !sw.classList.contains('is-celestial-transition')) {
        document.startViewTransition(function(){updateTheme(night);}).finished.catch(function(){});
      } else {
        // Older browsers crossfade the hero artwork without changing its layout.
        var art = document.querySelector('.hero-art');
        if (!art) {updateTheme(night);return;}
        var old = document.createElement('div');
        var computed = getComputedStyle(art);
        ['position','inset','width','height','backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat','backgroundColor','maskImage','maskSize','maskPosition','maskRepeat','webkitMaskImage','webkitMaskSize','webkitMaskPosition','webkitMaskRepeat'].forEach(function(k){old.style[k]=computed[k];});
        var before = getComputedStyle(art,'::before');
        if (before.content !== 'none') {
          var paper=document.createElement('div');
          ['position','inset','backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat','opacity','maskImage','webkitMaskImage'].forEach(function(k){paper.style[k]=before[k];});
          old.appendChild(paper);
        }
        old.className='theme-fade-snapshot';old.setAttribute('aria-hidden','true');old.style.pointerEvents='none';old.style.zIndex='-1';
        art.parentNode.insertBefore(old,art.nextSibling);
        updateTheme(night);
        if(old.animate)old.animate([{opacity:1},{opacity:0}],{duration:1200,easing:'ease-in-out'}).finished.then(function(){old.remove();},function(){old.remove();});
        else old.remove();
      }
      });
    });
  }
  function toggle() { applyTheme(!root.classList.contains('is-night'), true); }
  // Manual choices last until the next 05:00 / 22:00 Japan-time boundary.
  function nextBoundary(date) {
    var japan = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    var hour = japan.getUTCHours();
    var boundary = Date.UTC(japan.getUTCFullYear(), japan.getUTCMonth(), japan.getUTCDate(), hour < 5 ? 5 : hour < 22 ? 22 : 29);
    return boundary - 9 * 60 * 60 * 1000;
  }
  var now = new Date();
  var boundaryTime = nextBoundary(now);
  applyTheme(nightAt(now), false);
  function checkClock() {
    var now = new Date();
    if (now.getTime() >= boundaryTime) {boundaryTime=nextBoundary(now);applyTheme(nightAt(now),true);}
  }
  setInterval(checkClock, 30000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)checkClock();});
  window.addEventListener('pageshow',checkClock);
  function start() {
    if(celestialBusy)return;
    clearTimeout(timer);
    /* 数え始めたことを見せる。指で押さえている間は何の反応も無いと、
       3秒待つ理由が分からない（スマホでは「乗せ続ける」動作自体が
       目に見えないぶん、これが唯一の手がかりになる）。
       光は CSS 側で3秒かけて強まる。 */
    sw.classList.add('is-charging');
    timer = setTimeout(function () {
      sw.classList.remove('is-charging');
      toggle();
    }, HOLD);
  }
  function cancel() {
    clearTimeout(timer);
    timer = null;
    sw.classList.remove('is-charging');
  }

  /* 夜の絵は最初にマウスが乗った時点で読み込んでおく。切り替えの瞬間に
     取りに行くと、一拍おいて絵が差し替わる。ページを開いた時点で読むと、
     使わない人にも300KB余計に読ませることになるので、ここで読む。 */
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    ['hero-night-navy-paper-v7.jpg', 'hero-night-mobile.jpg'].forEach(function (f) {
      new Image().src = 'assets/img/backgrounds/' + f;
    });
  }

  /* pointerenter / pointerleave は入れ子の要素で発火しない。
     mouseover だと画像と文字の境目でいちいち数え直しになる。 */
  sw.addEventListener('pointerenter', function (e) { if(e.pointerType==='touch')return;warm(); start(); });
  sw.addEventListener('pointerleave', cancel);

  /* タップは長押し不要。クリックと共通の入口にする。 */
  sw.addEventListener('click',function(e){if(e.detail===0)return;cancel();warm();toggle();});

  /* キーボード。Enter / Space で切り替える。
     焦点を当てただけで数え始めてはいけない。Tab で辿って読んでいる
     だけの人が、3秒後に勝手にページ全体を夜にされてしまう。
     マウスの「乗せ続ける」は意図的な滞留だが、焦点の滞留は違う。 */
  sw.addEventListener('focus', warm);
  sw.addEventListener('blur', cancel);
  sw.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    e.preventDefault();
    cancel();
    toggle();
  });
})();

/* ============================================================
   見出しの下線 ― 画面の中央に来たら引く
   ============================================================
   きっかけは「見出しの上端が画面の中央より上に来たとき」。
   rootMargin の下側を -50% にすると、見張る範囲が画面の上半分になる。
   見出しがそこへ入った瞬間＝中央を越えた瞬間に一度だけ引く。

   -50% -50%（中央の一本線）にしないのは、開いた時点で中央より少し上に
   止まっている見出し（リンクで途中へ飛んできた場合）が、線に触れないまま
   引かれずに残るため。上半分ぜんぶを見張れば、その場合も拾える。

   画面より上へ完全に外れている見出しは、そのときは引かれない。上へ戻れば
   上半分に入って引かれるので、見えている場所で線が欠けることはない
   （#faq へ直接飛んで実測 2026-09-08）。

   引く動きそのものは CSS の transition（.5s ease-out）。ここでするのは
   クラスを足すことだけで、足したら見張りをやめる（戻しては引き直さない）。

   このファイルが読めなければ .rule-anim が付かず、線は最初から引かれた
   状態で出る。 */
(function () {
  /* :has() は使わない。querySelectorAll に渡すと、対応していないブラウザで
     例外になり、この下の目次まで巻き添えで止まる。線から親を辿る。 */
  var rules = document.querySelectorAll('h2 .h-rule');
  if (!rules.length || !('IntersectionObserver' in window)) return;
  var heads = [];
  Array.prototype.forEach.call(rules, function (r) {
    if (heads.indexOf(r.parentElement) < 0) heads.push(r.parentElement);
  });

  /* 先にクラスを足して「0から引く」状態にする。CSSより後にJSが走るので、
     一瞬引かれた線が見えないよう、描画の前に付けたい。 */
  document.documentElement.classList.add('rule-anim');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-ruled');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -50% 0px' });

  heads.forEach(function (h) { io.observe(h); });
})();

/* ============================================================
   スマホの目次 ― 上乗せぶんだけ
   ============================================================
   開閉そのものは <details> が持っている。ここで足すのは2つだけ:

   - リンクを押したら閉じる。閉じないと、飛んだ先が目次の面に隠れたまま
     になる（面は position:fixed で画面を覆っている）。
   - Esc で閉じる。<details> は Esc を見ないので、自分で拾う。

   このファイルが読めなくてもメニューは開いて閉じられる。 */
(function () {
  var menu = document.getElementById('menu');
  if (!menu) return;

  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) menu.open = false;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    /* 閉じたあとの居場所を、開いたときのボタンへ戻す。
       戻さないと、次の Tab がページの先頭からやり直しになる。 */
    var btn = menu.querySelector('summary');
    if (btn) btn.focus();
  });
})();

/* ============================================================
   日付で変わる表示（依頼主 2026-10-14）

   1. スケジュールの各工程に、終わったもの is-done（灰色）と
      いま進んでいるもの is-now（強調）を付ける。日付は各 <li> の
      data-start / data-end（日本時間の日付）。
   2. 応募受付のワッペンは、data-until を過ぎたら外す。
      締切後も「受付中」と出ていると誤った案内になるため。

   どちらもHTMLには公開時点（2026年10月・募集中）の状態を書いてあるので、
   JSが動かなくても表示は成立する。日付は利用者の端末の時計ではなく
   日本時間で比べる（海外から見ても締切は日本の 10/31 で切れる）。

   動作確認用：URL に ?today=2026-11-20 を付けると、その日として表示する。
   ============================================================ */
(function () {
  'use strict';

  var override = (location.search.match(/[?&]today=(\d{4}-\d{2}-\d{2})/) || [])[1];
  /* 「日本時間の今日」を YYYY-MM-DD で得る。文字列で比べれば時差の計算が要らない */
  var now = override ? new Date(override + 'T12:00:00+09:00') : new Date();
  var jst = new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

  var rows = document.querySelectorAll('.timeline > li[data-start][data-end]');
  Array.prototype.forEach.call(rows, function (li) {
    var a = li.getAttribute('data-start'), b = li.getAttribute('data-end');
    li.classList.toggle('is-done', jst > b);
    li.classList.toggle('is-now', jst >= a && jst <= b);
  });

  var badge = document.querySelector('.hero-badge[data-until]');
  if (badge) {
    var until = new Date(badge.getAttribute('data-until'));
    if (!isNaN(until) && now > until) badge.remove();
  }
}());

/* Reviewed navigation, next-step marker, and accessible banner enlargement. */
(function () {
  'use strict';
  var links = Array.from(document.querySelectorAll('.global-nav a,.menu-panel a,.foot-nav a'));
  var sections = ['about','events','themes','flow','faq','entry'].map(function(id){return document.getElementById(id);}).filter(Boolean);
  function syncNav(){
    var active = sections[0];
    sections.forEach(function(s){if(s.getBoundingClientRect().top <= 150) active=s;});
    links.forEach(function(a){if(active && a.getAttribute('href')==='#'+active.id) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');});
  }
  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(syncNav,{rootMargin:'-80px 0px -65% 0px',threshold:[0,1]});
    sections.forEach(function(s){navObserver.observe(s);});
  }
  var scheduled=false;
  function onScroll(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;syncNav();var top=document.querySelector('.back-to-top');if(top)top.classList.toggle('is-visible',window.scrollY>600);});}
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);onScroll();
  var today=(location.search.match(/[?&]today=(\d{4}-\d{2}-\d{2})/)||[])[1]||new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  var next=Array.from(document.querySelectorAll('.timeline>li[data-start]')).find(function(li){return li.dataset.start>today;});
  document.querySelectorAll('.timeline>li').forEach(function(li){li.classList.toggle('is-next',li===next);});
  var dialog=document.getElementById('banner-lightbox'),opener=null;
  if(dialog && typeof dialog.showModal==='function'){
    var image=dialog.querySelector('img'),close=dialog.querySelector('button');
    document.querySelectorAll('.event-banner').forEach(function(a){
      a.setAttribute('aria-label',a.querySelector('img').alt+'：バナーを拡大');a.removeAttribute('target');
      a.addEventListener('click',function(e){e.preventDefault();opener=a;image.src=a.href;image.alt=a.querySelector('img').alt;dialog.showModal();close.focus();});
    });
    close.addEventListener('click',function(){dialog.close();});
    dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();});
    dialog.addEventListener('close',function(){image.removeAttribute('src');if(opener)opener.focus();});
  }
}());
