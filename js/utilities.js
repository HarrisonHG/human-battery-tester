let BATTERY_IMG_THRESHOLDS = [100, 80, 60, 40, 20, 1, 0];

// ----- #justbootstrapthings -----
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

// Bootstrap's alerts
const alertPlaceholder = document.getElementById('liveAlertPlaceholder');
export const alert = (message, type) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('position-absolute');
  wrapper.classList.add('top-15');
  wrapper.classList.add('start-50');
  wrapper.classList.add('translate-middle-x');

  let button_classes = "close btn-close alert-close";
  if (type == "success") {
    button_classes += " auto-close";
  }

  let alert_icon = "";
  if (type == "success") {
    alert_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">' +
      '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>' +
      '</svg>';
  } else if (type == "danger" || type == "warning") {
    alert_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">' +
      '<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>' +
      '</svg>';
  } else { // info or default
    alert_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-info-circle-fill" viewBox="0 0 16 16">' +
      '<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>' +
      '</svg>';
  }

  wrapper.innerHTML = [
    `<div class="alert alert-${type} alert-dismissible fade show row" role="alert">` +
    "   <div class=\"col-auto\">" + alert_icon + `</div> <div class="col">${message}</div>` +
    '   <button type="button" class="' + button_classes + '" data-bs-dismiss="alert" aria-label="Close">' +
    '   </button>' +
    '</div>'
  ].join('');

  alertPlaceholder.append(wrapper);

  if (document.querySelector('.auto-close')) {
    document.querySelectorAll('.auto-close').forEach(function($el) {
      setTimeout(() => {
        $el.click();
      }, 5000);
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

// Set the battery gauges on page load
document.getElementById("batteryIconStart").src = 
  get_battery_gauge_picture(document.getElementById("batteryLevelStart").value, 1);
document.getElementById("batteryIconEnd").src = 
  get_battery_gauge_picture(document.getElementById("batteryLevelEnd").value, 1);