$(function() {

    var socket = io.connect('http://localhost');

    var Display = React.createClass({
        getInitialState: function() {
            server.on('connect', function (data) {
                server.emit('display join');
            });

            server.on('session update', this.getInitialDisplay);
        },

        getInitialDisplay: function (data) {
            return {

            };
        },
    });

});