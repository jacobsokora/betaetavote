$(document).ready(() => {
	console.log('ready');
	$('#submit').click((event) => {
		var candidate1 = $('#candidate1').children('option:selected')[0].label;
		var candidate2 = $('#candidate2').children('option:selected')[0].label;
		if (candidate1 == candidate2) {
			event.preventDefault();
			$('#alert').show();
		}
	});

	$('#alert').hide();
});