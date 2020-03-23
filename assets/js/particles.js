(function(window, document) {
  window.drawParticles = function(canvas) {
    let ctx;
    let circles;
    const numCircles = 10;
  
    const resize = (window.resize = function() {
      canvas.height = canvas.parentNode.parentElement.clientHeight * 0.8;
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
  };

  const canvas = document.querySelector('.particles-canvas');
  if (canvas) {
    window.drawParticles(canvas);
  }

  
})(window, document);
