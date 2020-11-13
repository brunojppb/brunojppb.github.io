(function(window, document) {

  /** render a cool particle effect on the website header canvas
   * It renders at all times, but is only noticeable in dark mode.
   * It resembles a very active night sky :) */
  const drawParticles = function () {
    const drawParticlesImpl = function(canvas) {

      const particles = [];
      let ctx = canvas.getContext("2d");
      const numParticles = 10; // a not-so-crowed night sky
    
      const resize = (window.resize = function() {
        canvas.height = document.querySelector('.main-header').clientHeight;
        canvas.width = window.innerWidth;
      });
  
      const Particle = function(x, y) {
        this.pos = [x, y];
        this.r = 1.5 * Math.random() + 1;
        this.c = "#F9F6F7";
        // The vector data where we want to point the particle to
        this.v = [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3];
      };
  
      Particle.prototype.getBound = function(i) {
        return i ? canvas.height : canvas.width;
      };
  
      /** Taking in consideration the vector velocity and direction
       * bounce the particle back and forth */
      Particle.prototype.updateFrame = function() {
        for (let i = 0; i < 2; i++) {
          if (this.pos[i] > this.getBound(i) - 5) {
            this.v[i] *= -1;
          } else if (this.pos[i] < 10) {
            this.v[i] *= -1;
          }
          this.pos[i] += this.v[i] * 5;
        }
        this.draw();
      };
  
      Particle.prototype.draw = function() {
        ctx.fillStyle = this.c;
        ctx.beginPath();
        ctx.arc(this.pos[0], this.pos[1], this.r, 0, 2 * Math.PI, false);
        ctx.fill();
      };

      const cacheParticles = function() {
        for (let i = 0; i < numParticles; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const particle = new Particle(x, y, canvas.width, canvas.height);
          particle.draw();
          particles.push(particle);
        }
      };
  
      const runAnimationLoop = function() {
        window.requestAnimFrame(runAnimationLoop);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
          particles[i].updateFrame();
        }
      };
  
      window.requestAnimFrame = (function() {
        return (
          window.requestAnimationFrame        ||
          window.webkitRequestAnimationFrame  ||
          window.mozRequestAnimationFrame     ||
          window.oRequestAnimationFrame       ||
          window.msRequestAnimationFrame      ||
          function(a) {
            window.setTimeout(a, 1e3 / 60);
          }
        );
      })();

      resize();
      cacheParticles();
      runAnimationLoop();
      
      // make sure we render the canvas in the right size
      // in case of client window resizing
      window.addEventListener("resize", resize);
  
    };
  
    const canvas = document.querySelector('.particles-canvas');
    if (canvas) {
      drawParticlesImpl(canvas);
    }
  }

  /**
   * Full-screen overlays on image tags */
  const attachFullScreenEvents = function () {
    const images = document.querySelectorAll('.max-width-wrapper img');
    const overlay = document.querySelector('.fullscreen-overlay');
    const closeButton = document.querySelector('.fullscreen-overlay .close-overlay');

    const showImageOverlay = function(src) {
      overlay.style.display = 'flex';
      const img = document.createElement('img');
      img.src = src;
      img.className = 'overlay-image';
      overlay.appendChild(img);
    };

    const closeImageOverlay = function (event) {
      const shouldClose = overlay === event.target || closeButton === event.target;
      const img = document.querySelector('.overlay-image');
      if(shouldClose && img) {
        overlay.style.display = 'none';
        img.remove();
      }
    }

    closeButton.addEventListener('click', closeImageOverlay);
    overlay.addEventListener('click', closeImageOverlay);

    for (let i = 0; i < images.length; i++) {
      images[i].addEventListener('click', function(event) {
        showImageOverlay(event.srcElement.currentSrc);
      });
    }
  }

  /** Listen to events on the theme switcher button 
   * Switch between Dark and Light mode 
   * Also uses the default theme from the user on the first visit 
   * and persists it on local storage */
  const listenToThemeSwitch = function () {
    const LIGHT_MODE_ON = 'LIGHT_MODE_ON';
    const ON = '1';
    const OFF = '2';
    const LIGHT_MODE_CLASS = 'light-mode';
    const isLightModeOn = function() {
      try {
        const switcherState = localStorage.getItem(LIGHT_MODE_ON);
        if (switcherState === null) {
          return window.matchMedia('(prefers-color-scheme: light)').matches;
        }
        return switcherState === ON
      } catch (e) {
        console.warn('could not get light mode config from local storage', e);
      }
    };

    /** Store light-mode setting */
    const setLightMode = function(isOn) {
      try {
        const switcherState = isOn ? ON : OFF;
        localStorage.setItem(LIGHT_MODE_ON, switcherState);
      } catch (e) {
        console.warn('could not store light mode config', e);
      }
    };

    /** switch light-mode switcher button background image based on current state */
    const setSwitcherBackground = function(isOn) {
      const bgUrl = isOn ? themeSwitcherNode.dataset.moon : themeSwitcherNode.dataset.sun;
      themeSwitcherNode.style.backgroundImage = 'url(' + bgUrl + ')';
    };


    const themeSwitcherNode = document.getElementById("theme-switcher");
    themeSwitcherNode.addEventListener('click', function() {
      document.documentElement.classList.toggle(LIGHT_MODE_CLASS);
      const isOn = document.documentElement.classList.contains(LIGHT_MODE_CLASS);
      setLightMode(isOn);
      setSwitcherBackground(isOn);
    });

    // set initial state
    const isOn = isLightModeOn();
    setSwitcherBackground(isOn);
    if (isOn) {
      document.documentElement.classList.add(LIGHT_MODE_CLASS);
    }
  }

  /** While reading an article, you will see a progres bar
   * on top of the window showing how far you are in the article */
  const maybeShowProgressBar = function() {
    const progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;

    function updateProgress() {
      const windowHeight = window.innerHeight;
      const pageHeight = document.documentElement.scrollHeight;

      const scrollDelta = (document.documentElement.scrollTop || document.body.scrollTop) + windowHeight;
      const windowHeightPercentage = (windowHeight * 100) / pageHeight;

      const scrollPositionInPercentage = (scrollDelta / pageHeight) * 100;
      const windowHeightPart = (windowHeightPercentage / 100) * scrollPositionInPercentage;

      const realScrollPositionPercentage = scrollPositionInPercentage - windowHeightPercentage;
      const width = realScrollPositionPercentage + windowHeightPart;

      progressBar.style.width = Math.max(Math.min(width, 100), 1) + "%";
    }

    window.addEventListener('scroll', updateProgress);
    updateProgress();
  }

  /** Fetch reading list from GoodReads
   * From a custom worker in Cloudflare (GoodReads doesn't allow CORS and that is absolutely understandable) 
   * See: https://www.goodreads.com/api/index#reviews.list */
   const maybeFetchReadingList = function() {
    if (!('fetch' in window)) {
      return;
    }
    
    const readingListContainer = document.getElementById('reading-list');
    const readListContainer = document.getElementById('read-list');
    if (!readingListContainer || !readListContainer) return;

    /** Render each book item individually */
    const renderBook = function(container, book) {
      const div = document.createElement('div');
      div.className = 'book-item';
      
      const img = document.createElement('img');
      img.src = book.imgUrl;
      img.alt = 'book cover from ' + book.title;
      img.className = 'book-img'
      div.appendChild(img);
      
      const bookDataDiv = document.createElement('div');
      bookDataDiv.className = 'book-data'
      
      const bookTitleLink = document.createElement('a');
      bookTitleLink.href = book.url
      bookTitleLink.innerText = book.title
      bookDataDiv.appendChild(bookTitleLink);

      const authorName = document.createElement('span');
      authorName.innerText = 'By ' + book.authorName;
      bookDataDiv.appendChild(authorName);

      div.appendChild(bookDataDiv);
      container.appendChild(div);
    }

    /** Fetch reading list from GoodReads */
    const fetchList = function(listName, containerNode) {
      const currentlyReadingUrl = 'https://reading-list.bpaulino0.workers.dev/?readingList=' + listName;
      fetch(currentlyReadingUrl)
      .then(function(response) {
        return response.text();
      })
      .then(function(xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const reviews = doc.getElementsByTagName('review');
        const getTextContent = function(xmlNode, property) {
          return xmlNode.getElementsByTagName(property)[0].textContent;
        };
        containerNode.innerHTML = '';
        for (let i=0; i < reviews.length; i++) {
          const book = reviews[i].getElementsByTagName('book')[0];
          const title = getTextContent(book, 'title_without_series');
          const url = getTextContent(book, 'link');
          const imgUrl = getTextContent(book, 'image_url');
          const description = getTextContent(book, 'description');
          const author = book.getElementsByTagName('authors')[0].getElementsByTagName('author')[0];
          const authorName = getTextContent(author, 'name');
          const bookData = {title, url, imgUrl, description, authorName}; 
          renderBook(containerNode, bookData);
        }
      }).catch(function(error) {
        console.error('could not load reading list ' + listName, error);
        containerNode.innerHTML = '';
        const errorMessage = document.createElement('span');
        errorMessage.innerText = 'Could not load the books. Please try to refresh the page.';
        containerNode.appendChild(errorMessage);
      })
    };

    fetchList('currently-reading', readingListContainer);
    fetchList('read', readListContainer);

  }

  function bindThemeSwitcher() {
    const moonSvg = document.getElementById('moon-svg')
    const sat = document.getElementById("satellite");
    const moon = document.getElementById("moon");

    /** Change the satellite and moon origins so they can orbit
     * around the right center point */
    TweenMax.set(sat, {
      svgOrigin:"299, 299", 
    });

    TweenMax.set(moon, {
      svgOrigin:"299, 299", 
    });

    function orbitMoon() {
      const satDuration = 30;
      const moonDuration = 240;
      const tl = new TimelineMax();
      
      tl.add("sat")
      tl.to(sat, satDuration, {
        rotation:"+=360",
        repeat:-1,
        ease: Power0.easeNone,
      }, "sat");
      
      // start together with the satellite animation
      tl.to(moon, moonDuration, {
        rotation: "-=360",
        repeat: -1,
        ease: Power0.easeNone,
      }, "sat")
      
      return tl;
    }

    function bounceOut(el) {
      const tl = new TimelineMax();
      const duration = 0.12;
      tl.add('bounceOut')
      tl.staggerTo(el, duration, {
        scaleX:1.1,
        scaleY: 1.3, 
      }, "bounceOut");
      tl.to(el, duration, {
        x: "-=20%",
        y: "-=20%",
      }, "bounceOut");
      tl.staggerTo(el, duration, {
        scaleX:0.5,
        scaleY: 0.7,
        opacity: 0, 
        x: "+=50%",
        y: "+=100%",
      }, "+=bounceOut");
      
    }

    const orbitTl = orbitMoon();

    // TODO: Make this function generic enough
    // so we can bounce back the light svg as well
    moonSvg.addEventListener('click', function() {
      bounceOut(moonSvg);
      orbitTl.pause();
    })

  }

  drawParticles();
  listenToThemeSwitch();
  attachFullScreenEvents();
  maybeShowProgressBar();
  maybeFetchReadingList();
  bindThemeSwitcher();


})(window, document);
