(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // Smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      });
    });
  }

  // Split a word into chars for the display moments
  const splitChars = (el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    return [...text].map((c) => {
      const s = document.createElement('span');
      s.className = 'char';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
  };


  if (hasGsap) {
    if (!reduce) {
      // Hero: the greeting rises out of its masks, then the rest follows
      gsap.from('.hero-title .line > span', { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.1 });
      gsap.from('.hero-photo img', { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.out', delay: 0.2 });
      gsap.from(['.hero-lead', '.starts-title', '.starts-list .reply', '.hero-photo figcaption', '.nav'], { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.5 });
      gsap.from('.dash-bars span', { scaleY: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.dash-bars', start: 'top 85%' } });
    }

    if (!reduce) {
      const footerChars = splitChars(document.querySelector('.footer-name'));
      gsap.from(footerChars, { yPercent: 100, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
      gsap.from('.contact-number', { x: -40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 60%' } });
    }
  } else {
    // Without GSAP every part stays visible and the page stays readable
    document.documentElement.classList.remove('js');
  }

  // Chapters play like a chat: the question lands, Douglas types, the answer appears
  if (!reduce && 'IntersectionObserver' in window) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const chats = [...document.querySelectorAll('.chat')].filter((c) => c.getBoundingClientRect().top > window.innerHeight * 0.8);
    chats.forEach((chat) => {
      [...chat.children].forEach((el) => el.classList.add('seq-pre'));
      chat.querySelectorAll('.msg-out .bubble').forEach((b) => b.insertAdjacentHTML('afterbegin', '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>'));
    });
    const finish = (chat) => {
      chat.dataset.done = '1';
      [...chat.children].forEach((el) => el.classList.remove('seq-pre', 'is-typing'));
    };
    const play = async (chat) => {
      for (const el of chat.children) {
        if (chat.dataset.done) return;
        const typing = el.classList.contains('msg-out');
        if (typing) el.classList.add('is-typing');
        el.classList.remove('seq-pre');
        if (typing) { await wait(480); el.classList.remove('is-typing'); }
        await wait(160);
      }
      chat.dataset.done = '1';
    };
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const chat = e.target;
        if (e.isIntersecting && !chat.dataset.started) { chat.dataset.started = '1'; play(chat); }
        // Scrolled past before it finished: show everything at once, no holes
        if (!e.isIntersecting && e.boundingClientRect.top < 0) { finish(chat); cio.unobserve(chat); }
      });
    }, { rootMargin: '0px 0px -15% 0px' });
    chats.forEach((c) => cio.observe(c));
  }

  // Section parts enter in order: heading, text, picture
  if (!reduce && 'IntersectionObserver' in window) {
    const items = [...document.querySelectorAll('.reveal')];
    items.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) el.classList.add('pre');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const siblings = [...e.target.parentElement.querySelectorAll(':scope > .reveal')];
        e.target.style.transitionDelay = `${Math.max(0, siblings.indexOf(e.target)) * 75}ms`;
        e.target.classList.remove('pre');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px 0px 0px' });
    items.forEach((el) => io.observe(el));
  }

  // Screen strips: drag with the mouse, swipe on touch
  document.querySelectorAll('.strip').forEach((strip) => {
    let down = false, startX = 0, startLeft = 0, moved = false;
    strip.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startLeft = strip.scrollLeft;
      strip.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      strip.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false; strip.classList.remove('is-dragging');
    });
    strip.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);
    strip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') strip.scrollBy({ left: 320, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') strip.scrollBy({ left: -320, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.strip-nav button').forEach((btn) => {
    const strip = btn.closest('.strip-wrap').querySelector('.strip');
    btn.addEventListener('click', () => {
      const step = strip.firstElementChild.getBoundingClientRect().width + 24;
      strip.scrollBy({ left: step * Number(btn.dataset.dir), behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // Services: the real screen follows the cursor where one exists
  const peek = document.querySelector('.service-peek');
  if (peek && window.matchMedia('(hover: hover)').matches) {
    const qx = hasGsap ? gsap.quickTo(peek, 'x', { duration: 0.5, ease: 'expo.out' }) : (v) => (peek.style.left = `${v}px`);
    const qy = hasGsap ? gsap.quickTo(peek, 'y', { duration: 0.5, ease: 'expo.out' }) : (v) => (peek.style.top = `${v}px`);
    document.querySelectorAll('.service').forEach((row) => {
      row.addEventListener('mouseenter', () => {
        const src = row.dataset.img;
        if (!src) { peek.classList.remove('is-on'); return; }
        peek.src = src;
        peek.classList.toggle('is-tall', src.includes('-m-'));
        peek.classList.add('is-on');
      });
      row.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
    });
    window.addEventListener('mousemove', (e) => { qx(e.clientX + 40); qy(e.clientY); });
  }

  // Contact: the choice writes the WhatsApp message
  const link = document.getElementById('wa-link');
  const hint = document.getElementById('wa-hint');
  const write = () => {
    const want = document.querySelector('input[name="want"]:checked').value;
    const msg = `Oi Douglas, quero ${want}. Podemos conversar?`;
    link.href = `https://wa.me/5511948992593?text=${encodeURIComponent(msg)}`;
    hint.textContent = `A mensagem já vai pronta: “${msg}”`;
  };
  document.querySelectorAll('input[name="want"]').forEach((r) => r.addEventListener('change', write));

  // Footer name runs exactly margin to margin at any width
  const footerName = document.querySelector('.footer-name');
  const fitName = () => {
    const box = footerName.parentElement;
    const cs = getComputedStyle(box);
    const room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    footerName.style.fontSize = '';
    const base = parseFloat(getComputedStyle(footerName).fontSize);
    footerName.style.fontSize = `${base * (room / footerName.scrollWidth)}px`;
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitName);
  window.addEventListener('resize', fitName);

  // Nav ink follows the field beneath it
  const nav = document.querySelector('.nav');
  const under = (sel) => [...document.querySelectorAll(sel)].some((s) => { const r = s.getBoundingClientRect(); const y = nav.offsetHeight / 2; return r.top <= y && r.bottom >= y; });
  const checkNav = () => {
    nav.classList.toggle('is-light', under('.about, .contact'));
    nav.classList.toggle('is-lime', under('.contact'));
    nav.classList.toggle('is-solid', !under('.hero'));
  };
  if (lenis) lenis.on('scroll', checkNav); else window.addEventListener('scroll', checkNav, { passive: true });
  checkNav();
})();
