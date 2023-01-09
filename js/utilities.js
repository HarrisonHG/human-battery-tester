let BATTERY_IMG_THRESHOLDS = [100, 80, 60, 40, 20, 1, 0];

// Phrases to describe the battery level in human terms. Doesn't have to match the thresholds above.
let BATTERY_DESCRIPTOR_THRESHOLDS = {
  "100": "bouncing off the walls",
  "90": "hyped",
  "80": "energetic",
  "70": "eager",
  "60": "ready",
  "50": "doing okay",
  "40": "surviving",
  "30": "wavering",
  "20": "breaking",
  "10": "so tired",
  "1": "nearing collapse",
  "0": "an empty husk"
};

// Please keep these comments at the same threshold as the above
let BATTERY_COMMENT_THRESHOLDS = {
  "100": "LET'S FUCKEN GOOOOOOO",
  "90": "This is a damn good day.",
  "80": "Sportsball, anyone?",
  "70": "Give me a challenge",
  "60": "Let's do the thing.",
  "50": "What's next?",
  "40": "I can do this.",
  "30": "5 minute break?",
  "20": "Digging into my reserves.",
  "10": "I really need to rest.",
  "1": "Can't continue like this...",
  "0": "Save me from this void."
};

// ----- #justbootstrapthings -----
const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
const tooltipList = [...tooltipTriggerList].map(
  tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl)
  );

// Bootstrap's alerts
const alertPlaceholder = document.getElementById('liveAlertPlaceholder');
export const alert = (message, type) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('position-absolute');
  wrapper.classList.add('top-15');
  wrapper.classList.add('start-50');
  wrapper.classList.add('translate-middle-x');
  wrapper.classList.add('stay-ontop');

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

// Range input data-values
document.querySelectorAll('input[type=range]').forEach(e => {
  e.setAttribute('data-value', e.value + "%");
  e.addEventListener('input', () => {
    e.setAttribute('data-value', e.value + "%");
  });
});

// Batter gauge pictures
document.getElementById("batteryLevelStart").addEventListener("input", function() {
  document.getElementById("batteryIconStart").src = get_battery_gauge_picture(this.value, 1);
  
  let words = get_battery_gauge_descriptor(parseInt(this.value));
  document.getElementById("batteryLevelStartDescriptor").innerHTML = words.descriptor;
  document.getElementById("batteryLevelStartComment").innerHTML = words.comment;
});
document.getElementById("batteryLevelEnd").addEventListener("input", function() {
  document.getElementById("batteryIconEnd").src = get_battery_gauge_picture(this.value, 1);

  let words = get_battery_gauge_descriptor(parseInt(this.value));
  document.getElementById("batteryLevelEndDescriptor").innerHTML = words.descriptor;
  document.getElementById("batteryLevelEndComment").innerHTML = words.comment;
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

export function get_battery_gauge_descriptor(battery_level) {
  clamp(battery_level, 0, 100);

  // Descriptors may or may not match the picture's thresholds.
  let highest_level = 0;
  let descriptor = "";
  let comment = "";

  for (let level in BATTERY_DESCRIPTOR_THRESHOLDS) { 
    if (battery_level >= parseInt(level)) {
      highest_level = level;
      descriptor = BATTERY_DESCRIPTOR_THRESHOLDS[level];
      comment = BATTERY_COMMENT_THRESHOLDS[level];
    }
    else {
      break;
    }
  }

  return {
    "level": highest_level,
    "descriptor": descriptor,
    "comment": comment
  };
}

// Clamp a number between a min and max
export function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

// Set the battery gauges on page load
// document.getElementById("batteryIconStart").src = 
//   get_battery_gauge_picture(document.getElementById("batteryLevelStart").value, 1);
// document.getElementById("batteryIconEnd").src = 
//   get_battery_gauge_picture(document.getElementById("batteryLevelEnd").value, 1);