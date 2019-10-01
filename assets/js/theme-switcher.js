(function() {

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


})();
