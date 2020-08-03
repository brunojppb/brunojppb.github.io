(function(window, document) {

  /** Draw particles animation on website header */
  var drawParticles = function () {
    window.drawParticles = function(canvas) {
      let ctx;
      let circles;
      const numCircles = 10;
    
      const resize = (window.resize = function() {
        canvas.height = document.querySelector('.main-header').clientHeight;
        canvas.width = window.innerWidth;
      });
  
      const Circle = function(x, y) {
        this.pos = [x, y];
        this.r = 1.5 * Math.random() + 1;
        this.c = "#F9F6F7";
        this.v = [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3];
      };
  
      Circle.prototype.getBound = function(i) {
        return i ? canvas.height : canvas.width;
      };
  
      let i;
      Circle.prototype.frame = function() {
        for (i = 0; i < 2; i++) {
          if (this.pos[i] > this.getBound(i) - 5) {
            this.v[i] *= -1;
          } else if (this.pos[i] < 10) {
            this.v[i] *= -1;
          }
          this.pos[i] += this.v[i] * 5;
        }
        this.draw();
      };
  
      Circle.prototype.draw = function() {
        ctx.fillStyle = this.c;
        ctx.beginPath();
        ctx.arc(this.pos[0], this.pos[1], this.r, 0, 2 * Math.PI, false);
        ctx.fill();
      };
  
      ctx = canvas.getContext("2d");
      resize();
  
      circles = [];
  
      for (let i = 0; i < numCircles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const c = new Circle(x, y, canvas.width, canvas.height);
        c.draw();
        circles.push(c);
      }
  
      const loop = function() {
        window.requestAnimFrame(loop);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < circles.length; i++) {
          circles[i].frame();
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
  
      loop();
  
      window.addEventListener("resize", resize);
    };
  
    const canvas = document.querySelector('.particles-canvas');
    if (canvas) {
      window.drawParticles(canvas);
    }
  }

  /**
   * Full-screen overlays on image tags */
  var attachFullScreenEvents = function () {
    var images = document.querySelectorAll('.max-width-wrapper img');
    var overlay = document.querySelector('.fullscreen-overlay');
    var closeButton = document.querySelector('.fullscreen-overlay .close-overlay');

    var showImageOverlay = function(src) {
      overlay.style.display = 'flex';
      var img = document.createElement('img');
      img.src = src;
      img.className = 'overlay-image';
      overlay.appendChild(img);
    };

    var closeImageOverlay = function (event) {
      var shouldClose = overlay === event.target || closeButton === event.target;
      var img = document.querySelector('.overlay-image');
      if(shouldClose && img) {
        overlay.style.display = 'none';
        img.remove();
      }
    }

    closeButton.addEventListener('click', closeImageOverlay);
    overlay.addEventListener('click', closeImageOverlay);

    for (var i = 0; i < images.length; i++) {
      images[i].addEventListener('click', function(event) {
        showImageOverlay(event.srcElement.currentSrc);
      });
    }
  }

  /** Listen to events on the theme switcher button 
   * Switch between Dark and Light mode 
   * Also uses the default theme from the user on the first visit 
   * and persists it on local storage */
  var listenToThemeSwitch = function () {
    var LIGHT_MODE_ON = 'LIGHT_MODE_ON';
    var ON = '1';
    var OFF = '2';
    var LIGHT_MODE_CLASS = 'light-mode';
    var isLightModeOn = function() {
      try {
        var switcherState = localStorage.getItem(LIGHT_MODE_ON);
        if (switcherState === null) {
          return window.matchMedia('(prefers-color-scheme: light)').matches;
        }
        return switcherState === ON
      } catch (e) {
        console.warn('could not get light mode config from local storage', e);
      }
    };

    /** Store light-mode setting */
    var setLightMode = function(isOn) {
      try {
        var switcherState = isOn ? ON : OFF;
        localStorage.setItem(LIGHT_MODE_ON, switcherState);
      } catch (e) {
        console.warn('could not store light mode config', e);
      }
    };

    /** switch light-mode switcher button background image based on current state */
    var setSwitcherBackground = function(isOn) {
      var bgUrl = isOn ? themeSwitcherNode.dataset.moon : themeSwitcherNode.dataset.sun;
      themeSwitcherNode.style.backgroundImage = 'url(' + bgUrl + ')';
    };


    var themeSwitcherNode = document.getElementById("theme-switcher");
    themeSwitcherNode.addEventListener('click', function() {
      document.documentElement.classList.toggle(LIGHT_MODE_CLASS);
      var isOn = document.documentElement.classList.contains(LIGHT_MODE_CLASS);
      setLightMode(isOn);
      setSwitcherBackground(isOn);
    });

    // set initial state
    var isOn = isLightModeOn();
    setSwitcherBackground(isOn);
    if (isOn) {
      document.documentElement.classList.add(LIGHT_MODE_CLASS);
    }
  }

  /** While reading an article, you will see a progres bar
   * on top of the window showing how are you are in the article */
  var maybeShowProgressBar = function() {
    var progressBar = document.getElementById('progress-bar');
    if (!progressBar) return;

    function updateProgress() {
      var windowHeight = window.innerHeight;
      var pageHeight = document.documentElement.scrollHeight;

      var scrollDelta = (document.documentElement.scrollTop || document.body.scrollTop) + windowHeight;
      var windowHeightPercentage = (windowHeight * 100) / pageHeight;

      var scrollPositionInPercentage = (scrollDelta / pageHeight) * 100;
      var windowHeightPart = (windowHeightPercentage / 100) * scrollPositionInPercentage;

      var realScrollPositionPercentage = scrollPositionInPercentage - windowHeightPercentage;
      var width = realScrollPositionPercentage + windowHeightPart;

      progressBar.style.width = Math.max(Math.min(width, 100), 1) + "%";
    }

    window.addEventListener('scroll', updateProgress);
    updateProgress();
  }

  drawParticles();
  listenToThemeSwitch();
  attachFullScreenEvents();
  maybeShowProgressBar();


})(window, document);
