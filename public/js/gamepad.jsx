var socket = io.connect('http://localhost');

var Display = React.createClass({

    getSessionUpdate: function (data) {
        session = JSON.parse(data);

        var state = this.state;
        state.session = session;

        this.setState(state);
    },

    getInitialState: function() {
        socket.on('connect', function (data) {
            socket.emit('display join');
        });

        socket.on('session update', this.getSessionUpdate);

        return {
            session: {},
            status: "pickrooms"
        }
    },
}