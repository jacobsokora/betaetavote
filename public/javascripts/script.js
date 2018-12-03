$(document).ready(() => {
	console.log('ready');
	$('#submit').click((event) => {
		$('.alert').css('visibility', 'hidden');
		var selections = [];
		$('select').each((index, obj) => {
			selections.push($(obj).children('option:selected')[0].label);
			console.log($(obj).children('option:selected')[0].label);
		});
		if (selections.includes('Select a candidate')) {
			$('.alert').css('visibility', 'visible');
			$('.alert').text('You must select a candidate/candidates');
		} else if ((new Set(selections)).size != selections.length) {
			$('.alert').css('visibility', 'visible');
			$('.alert').text('You must select two different candidates');
		} else {
			console.log(selections)
			$.post('/vote', {
				'votes': selections.join()
			}, 'json')
			.done(() => {
				location.reload();
			})
			.fail(() => {
				alert('Failed to cast your vote, please try again!');
			});
		}
	});
});