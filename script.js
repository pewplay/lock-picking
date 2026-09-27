// Get current rotation angle of an element (from its computed transform matrix)
function rotationDegrees(el) {
  var matrix = getComputedStyle(el).transform;
  if (typeof matrix === 'string' && matrix !== 'none') {
    var values = matrix.split('(')[1].split(')')[0].split(',');
    var a = values[0];
    var b = values[1];
    var angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
  } else {
    var angle = 0;
  }
  return angle;
}

function rotate(el, degrees) {
  el.style.transform = 'rotate(' + degrees + 'deg)';
}

var circle = document.getElementById('circle');
var circle2 = document.getElementById('circle2');
var label = document.querySelector('#container > p');
var retry = document.getElementById('retry');
var retry2 = document.getElementById('retry2');

// Initialize random points on the circle, update # of digits
function init(param) {
  var angle = Math.floor((Math.random() * 720) - 360);
  rotate(circle2, angle);
  label.textContent = param;
  label.appendChild(document.createElement('br'));
  var h4 = document.createElement('h4');
  h4.textContent = param != 1 ? 'digits left' : 'digit left';
  label.appendChild(h4);
}

document.addEventListener('DOMContentLoaded', function() {
  // %2 == 0 is clockwise, else counter-clockwise
  var counter = 0;
  // # of digits, reach 0 => win
  var digits = 5;
  // display
  init(digits);
  // store the randomly generated angle of the point
  var angle = rotationDegrees(circle2);
  // Initial circle spin on page load
  rotate(circle, 2880);

  circle.addEventListener('click', function() {
    // Current rotation stored in a variable
    var unghi = rotationDegrees(circle);
    // If current rotation matches the random point rotation by a margin of +- 25 degrees, the player "hit" it and continues
    if (unghi > angle - 25 && unghi < angle + 25) {
      digits--;
      // If game over, hide the game, display end of game options
      if (!digits) {
        circle.classList.add('hidden');
        circle2.classList.add('hidden');
        label.classList.add('hidden');
        retry2.classList.remove('hidden');
      }
      // Else, add another point and remember its new angle of rotation
      else init(digits);
      angle = rotationDegrees(circle2);
    }
    // Else, the player "missed" and is brought to end of game options
    else {
      circle.classList.add('hidden');
      circle2.classList.add('hidden');
      label.classList.add('hidden');
      retry.classList.remove('hidden');
    }
    // No of clicks ++
    counter++;
    // spin based on click parity
    if (counter % 2) {
      rotate(circle, -2880);
    } else rotate(circle, 2160);
  });

  function restart() {
    circle.classList.remove('hidden');
    circle2.classList.remove('hidden');
    label.classList.remove('hidden');
    digits = 5;
    init(digits);
    angle = rotationDegrees(circle2);
    rotate(circle, 2440);
    counter = 0;
  }

  retry.addEventListener('click', function() {
    retry.classList.add('hidden');
    restart();
  });

  retry2.addEventListener('click', function() {
    retry2.classList.add('hidden');
    restart();
  });
});
