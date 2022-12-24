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
      e.setAttribute('data-value', e.value);
    });
  });