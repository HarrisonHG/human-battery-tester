let BATTERY_IMG_THRESHOLDS = [100, 80, 60, 40, 20, 1, 0];

// ----- #justbootstrapthings -----
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

// Bootstrap's alerts
const alertPlaceholder = document.getElementById('liveAlertPlaceholder');
export const alert = (message, type) => {
  const wrapper = document.createElement('div');

  let button_classes = "close alert-close";
  if (type == "success") {
    button_classes += " auto-close";
  }

  wrapper.innerHTML = [
    `<div class="alert alert-${type} alert-dismissible fade show js-alert" role="alert">` +
    `   <div>${message}</div>` +
    '   <button type="button" class="' + button_classes + '" data-dismiss="alert" aria-label="Close">' +
    '       <span aria-hidden="true">&times;</span>' +
    '   </button>' +
    '</div>'
  ].join('');

  alertPlaceholder.append(wrapper);

  if (document.querySelector('.auto-close')) {
    document.querySelectorAll('.auto-close').forEach(function($el) {
      setTimeout(() => {
        $el.click();
      }, 2000);
    });
  }
}

// Bootstrap's range inputs
document.querySelectorAll('input[type=range]').forEach(e => {
    e.setAttribute('data-value', e.value);
    e.addEventListener('input', () => {

      // Set the numerical value
      e.setAttribute('data-value', e.value);

      // // Set the color
      // let color = 'var(--primary-color)';
      // if (e.value < 50) {
      //   color = 'var(--warning-color)';
      // }
      // if (e.value < 25) {
      //   color = 'var(--danger-color)';
      // }
      // e.style.setProperty('color', color);
    });
  });

document.getElementById("batteryLevelStart").addEventListener("input", function() {
  document.getElementById("batteryIconStart").src = get_battery_gauge_picture(this.value, 1);
});
document.getElementById("batteryLevelEnd").addEventListener("input", function() {
  document.getElementById("batteryIconEnd").src = get_battery_gauge_picture(this.value, 1);
});

// Get the next available battery gauge picture, rounding down
export function get_battery_gauge_picture(battery_level, rotation = 0) {

  clamp(battery_level, 0, 100);

  // Get the next available battery gauge picture
  // Matches the pics we have available on the server  
  for (let i = 0; i < BATTERY_IMG_THRESHOLDS.length ; i++) {
    if (battery_level >= BATTERY_IMG_THRESHOLDS[i]) {
      battery_level = BATTERY_IMG_THRESHOLDS[i];
      break;
    }
  }

  let filename = "/img/battery_" + battery_level;

  // Rotate the picture... if we want to
  if (rotation == 1) {
    filename += "_side";
  }

  return filename + ".png";
}

// Clamp a number between a min and max
export function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}