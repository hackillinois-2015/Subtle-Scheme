var socket = io.connect('http://localhost');

var Display = React.createClass({

    createRoom: function(data) {
        socket.emit('display join', JSON.stringify(data));
    },

    getSessionUpdate: function (data) {
        session = JSON.parse(data);

        var state = this.state;
        state.session = session;

        console.log(session);

        this.setState(state);
    },

    getInitialState: function() {
        socket.on('connect', function (data) {
            // socket.emit('display join');
        });

        socket.on('session update', this.getSessionUpdate);

        socket.on('bad question sets', function () {
            console.log('this was called');
        })

        return {
            session: {}
        }
    },

    render: function() {
        var session = this.state.session;
        var listPlayers;
        if(typeof session.players != "undefined") {
            listPlayers = session.players.map(function(player) {
                return (
                    <div>
                        {player.username}
                    </div>
                );
            });
        }

        switch(this.state.session.phase) {
            case "joiningPhase":
                return (
                    <div>
                        <div className="small-header">Waiting for players</div>
                        {listPlayers}
                    </div>
                );
            default:
                return (
                    <div>
                        <div className="small-header">Creating Room</div>
                        <PickQuestions onQuestionPick={this.createRoom} />
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

var PickQuestions = React.createClass({
    getInitialState: function()
    {
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

    handleSubmit: function(e)
    {
        e.preventDefault();

        var selected = [];

        $('form .checkbox:checked').each(function() {
            selected.push($(this).attr('name'));
        });

        this.props.onQuestionPick(selected);

    },

    render: function()
    {
        var rooms = this.state.rooms;

        var roomList = Object.keys(rooms).map(function(index) {
            var room = rooms[index];
            console.log(room);
            return (
                <div className="form-group">
                    <input className="checkbox" type="checkbox" name="questionPack" id={"" + room._id} value={"" + room._id} />
                    <label for={"" + room._id}>{room.name}</label>
                </div>
            );
        });

        return(
            <form onSubmit={this.handleSubmit}>
                {roomList}
                <button type="submit" className="btn">
                    asdf
                </button>
            </form>
        );
    }
});

React.render(<Display />, document.getElementById('display'));