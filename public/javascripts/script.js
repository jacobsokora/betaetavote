$(document).ready(() => {
	console.log('ready');
	$('#submit').click((event) => {
		var candidate1 = $('#candidate1').children('option:selected')[0].label;
		var candidate2 = '';
		if ($('#candidate2').children('option:selected')[0]) {
			candidate2 = $('#candidate2').children('option:selected')[0].label;
		}
		console.log(candidate2);
		console.log(candidate1);

		if (candidate1 == candidate2 || candidate1 == 'Select a candidate' || candidate2 == 'Select a candidate') {
			event.preventDefault();
			$('#alert').show();
		}

	});

	$('#alert').hide();
});