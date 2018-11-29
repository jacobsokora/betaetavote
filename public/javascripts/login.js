function setCookie() {
	var now = new Date();
	var expiry = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
	document.cookie = `password=${$('#password').val()}; path=/`;
	var pattern = /ref=([^&]+)/;
	var redirect = pattern.exec(window.location.search)[1] || '/admin';
	window.location.replace(redirect);
}