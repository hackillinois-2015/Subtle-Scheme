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

    render: function() {
        var session = this.state.session;
        var listSessions = Object.keys(session).map(function(index) {
            return (
                <div>
                    {index}: {session[index]}
                </div>
            );
        });

        switch(this.state.status) {
            case "pickrooms":
                return (
                    <div>
                        <div className="small-header">Creating Room</div>
                        <PickRooms />
                    </div>
                );
        }

        return (
            <div>
                <div className="small-header">{this.state.status}</div>
            </div>
        );
    }
});

var PickRooms = React.createClass({
    getInitialState: function() {
        $.ajax({
            url: '/questionSets',
            dataType: 'json',
            success: function(data) {
                var state = this.state;
                state.rooms = data;
                this.setState(state);
            }.bind(this)
        });

        return {
            rooms: {}
        }
    },

    render: function() {
        var rooms = this.state.rooms;

        var roomList = Object.keys(rooms).map(function(index) {
            var room = rooms[index];
            console.log(room);
            return (
                <div className="form-group">
                    <input type="checkbox" htmlFor="{room._id}" />
                    {index}: {rooms[index]}
                </div>
            );
        });

        return(
            <form>
                {roomList}
                <button className="btn">
                    asdf
                </button>
            </form>
        );
    }
});

React.render(<Display />, document.getElementById('display'));