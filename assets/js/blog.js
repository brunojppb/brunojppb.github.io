(function(window, document) {

  /** render a cool particle effect on the website header canvas
   * It renders at all times, but is only noticeable in dark mode.
   * It resembles a very active night sky :) */
  var drawParticles = function () {
    window.drawParticles = function(canvas) {
      let ctx;
      let circles = [];
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
  
      Circle.prototype.frame = function() {
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
  
      Circle.prototype.draw = function() {
        ctx.fillStyle = this.c;
        ctx.beginPath();
        ctx.arc(this.pos[0], this.pos[1], this.r, 0, 2 * Math.PI, false);
        ctx.fill();
      };
  
      ctx = canvas.getContext("2d");
      resize();
  
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
   * on top of the window showing how far you are in the article */
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

  /** Fetch reading list from GoodReads
   * From a custom worker in Cloudflare (GoodReads doesn't allow CORS and that is absolutely understandable) 
   * See: https://www.goodreads.com/api/index#reviews.list */
  var maybeFetchReadingList = function() {
    if (!('fetch' in window)) {
      return;
    }
    
    var readingListContainer = document.getElementById('reading-list');
    var readListContainer = document.getElementById('read-list');
    if (!readingListContainer || !readListContainer) return;

    /** Render each book item individually */
    var renderBook = function(container, book) {
      var div = document.createElement('div');
      div.className = 'book-item';
      
      var img = document.createElement('img');
      img.src = book.imgUrl;
      img.alt = 'book cover from ' + book.title;
      img.className = 'book-img'
      div.appendChild(img);
      
      var bookDataDiv = document.createElement('div');
      bookDataDiv.className = 'book-data'
      
      var bookTitleLink = document.createElement('a');
      bookTitleLink.href = book.url
      bookTitleLink.innerText = book.title
      bookDataDiv.appendChild(bookTitleLink);

      var authorName = document.createElement('span');
      authorName.innerText = 'By ' + book.authorName;
      bookDataDiv.appendChild(authorName);

      div.appendChild(bookDataDiv);
      container.appendChild(div);
    }

    /** Fetch reading list from GoodReads */
    var fetchList = function(listName, containerNode) {
      var currentlyReadingUrl = 'https://reading-list.bpaulino0.workers.dev/?readingList=' + listName;
      fetch(currentlyReadingUrl)
      .then(function(response) {
        return response.text();
      })
      .then(function(xml) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, 'text/xml');
        var reviews = doc.getElementsByTagName('review');
        var getTextContent = function(xmlNode, property) {
          return xmlNode.getElementsByTagName(property)[0].textContent;
        };
        containerNode.innerHTML = '';
        for (var i=0; i < reviews.length; i++) {
          var book = reviews[i].getElementsByTagName('book')[0];
          var title = getTextContent(book, 'title_without_series');
          var url = getTextContent(book, 'link');
          var imgUrl = getTextContent(book, 'image_url');
          var description = getTextContent(book, 'description');
          var author = book.getElementsByTagName('authors')[0].getElementsByTagName('author')[0];
          var authorName = getTextContent(author, 'name');
          var bookData = {title, url, imgUrl, description, authorName}; 
          renderBook(containerNode, bookData);
        }
      }).catch(function(error) {
        console.error('could not load reading list ' + listName, error);
        containerNode.innerHTML = '';
        var errorMessage = document.createElement('span');
        errorMessage.innerText = 'Could not load the books. Please try to refresh the page.';
        containerNode.appendChild(errorMessage);
      })
    };

    fetchList('currently-reading', readingListContainer);
    fetchList('read', readListContainer);

  }

  drawParticles();
  listenToThemeSwitch();
  attachFullScreenEvents();
  maybeShowProgressBar();
  maybeFetchReadingList();


})(window, document);
