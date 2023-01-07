/* 
	Range design by Brandon McConnell: https://codepen.io/brandonmcconnell/pen/oJBVQW 
	Modified for use by me.
*/

function calculate_hue(value) {
	var hue = 220 - value * 1.8;
	return hue;
}

$(function() {
	var rangePercent = $('#batteryLevelStart').val();
	$('#batteryLevelStart').on('change input', function() {
		rangePercent = $('#batteryLevelStart').val();
		$('#batteryLevelStartPercentage').text(rangePercent);
		$('#batteryLevelStart').css('filter', 'hue-rotate(-' + 
			calculate_hue(rangePercent) + 'deg)');
	});
});

$(function() {
	var rangePercent = $('#batteryLevelEnd').val();
	$('#batteryLevelEnd').on('change input', function() {
		rangePercent = $('#batteryLevelEnd').val();
		$('#batteryLevelEndPercentage').text(rangePercent);
		
		$('#batteryLevelEnd').css('filter', 'hue-rotate(-' + 
			calculate_hue(rangePercent) + 'deg)');
	});
});
