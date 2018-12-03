$(document).ready(() => {

	$('.add-candidate-field').keypress((event) => {
		if (event.which != 13) {
			return;
		}
		var name = $('.add-candidate-field').val();
		if (!name || name.length == 0 ) {
			return;
		}
		$('.candidates').append(`
			<div class="form-group row" data-candidate="${name.replace(' ', '')}">
				<div class="col-sm-10">
					<input class="form-control form-control-lg name" value="${name}" />
				</div>
				<div class="col-sm-2">
					<button class="btn btn-lg btn-danger delete-candidate" data-candidate="${name.replace(' ', '')}">Delete</button>
				</div>
			</div>
		`);
		$('.delete-candidate').click((event) => {
			var name = $(event.target).attr('data-candidate');
			console.log(`delete ${name}`);
			$(`.form-group[data-candidate=${name}]`).remove();
		});
		$('.add-candidate-field').val('');
		event.preventDefault();	
		return false;
	});

	$('.delete-candidate').click((event) => {
		var name = $(event.target).attr('data-candidate');
		console.log(`delete ${name}`);
		$(`.form-group[data-candidate=${name}]`).remove();
	});

	$('.start-poll').click((event) => {
		var name = $('#poll-name').val();
		var winners = $('#poll-winners').val();
		var candidates = [];
		$('.name').each((index, field) => {
			var candidate = $(field).val();
			if (!candidate || candidate.length == 0) {
				return true;
			}
			candidates.push(candidate);
		});
		if (!name || candidates.length < 2) {
			event.preventDefault();
			alert('Please fill out all fields!');
			return;
		}
		var time = $('#poll-time').val() || 30;
		$.post('/admin', {
			'name': name,
			'winners': winners,
			'candidates[]': candidates,
			'time': time
		}, 'json');
		alert(`Voting for ${name} will close in ${time} seconds!`);
		location = '/history';
	});

});