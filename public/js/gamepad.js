(function () {
	var server = io.connect('http://localhost');
	var session = {};//session retrieved from server
	server.on('connect', function (data) {
		var dummyData = {
			gameCode: 'AAAA',
			username: 'Jason'
		}
		// server.emit('gamepad join', JSON.stringify(dummyData));
	});

	server.on('session update', function (data) {
		session = JSON.parse(data);
		console.log(session);
	});
	/*************************
		Setup Events
	**************************/
	server.on('bad game code', function () {
		//todo
	})

	server.on('duplicate username', function () {
		//todo
	})
}());