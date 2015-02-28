(function () {
	var server = io.connect('http://localhost');
	var session = {};//session retrieved from server
	server.on('connect', function (data) {
		server.emit('display join');
	});

	server.on('session update', function (data) {
		session = JSON.parse(data);
		console.log(session);
	});
}());