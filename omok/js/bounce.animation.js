/*
 *  bounce.animation.js - client
 *
 *  made by LeeSangchul , SC_production
 */

///////////////////////////////////////////////////////////////////////////////
//
//  bounce animation
//
///////////////////////////////////////////////////////////////////////////////
function setBounceAnimation(element, animationName, callback) {
  if(!callback) { callback = function(){}; }
  bounceAnimation[animationName].applyTo(element).then(callback);
}

var bounceAnimation = new Object();

// appear
bounceAnimation.appear = new Bounce();
bounceAnimation.appear.scale({

  from: { x: 0, y: 1 },
  to: { x: 1, y: 1 },
  duration: 1500,
  easing: 'bounce'

}).scale({

  from: { x: 1, y: 0 },
  to: { x: 1, y: 1 },
  duration: 1500,
  eading: 'bounce'

});

// disappear
bounceAnimation.disappear = new Bounce();
bounceAnimation.disappear.scale({

  from: { x: 1, y: 1 },
  to: { x: 0.001, y: 1 },
  duration: 1000,
  easing: 'bounce',
  bounces: 0

}).scale({

  from: { x: 1, y: 1 },
  to: { x: 1, y: 0.001 },
  duration: 1000,
  easing: 'bounce',
  bounces: 0

});