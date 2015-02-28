(function () {
	var server = io.connect('http://localhost');

	server.on('connect', function (data) {
		server.emit('displayJoin');
	});
}());