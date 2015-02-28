(function () {
	var server = io.connect('http://localhost');
	var session = {};//session retrieved from server
	server.on('connect', function (data) {
		//the id is the question_set's _id
		// var selectedQuestionSets = ['54f16d3a26e7e0117f5dc53b', '54f16e4426e7e0117f5dc53c'];//this should be selected by the user. this is a dummy variable for testing
		// server.emit('display join', JSON.stringify(selectedQuestionSets));
	});

	server.on('session update', function (data) {
		session = JSON.parse(data);
		console.log(session);
	});

	server.on('bad question sets', function () {
		//todo
	})
}());