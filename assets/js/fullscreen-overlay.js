(function() {
  
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

})();