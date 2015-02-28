var socket = io.connect('http://localhost');

var Gamepad = React.createClass({

    formHandle: function(e) {
        e.preventDefault();
        var username = this.refs.username.getDOMNode().value.trim();
        var gameCode = this.refs.gameCode.getDOMNode().value.trim();

        var sendTo = {
            username: username,
            gameCode: gameCode
        };

        console.log('sendTo', sendTo);

        socket.emit('gamepad join', JSON.stringify(sendTo));
    },

    getInitialState: function() {
        socket.on('connect', function (data) {
        });

        socket.on('session update', function (data) {
            session = JSON.parse(data);
            console.log(session);
        });

        socket.on('alert', function (data) {
            console.log('alert', data);
        });

        socket.on('bad game code', function (data) {
            console.log('badcode', data);
        })

        socket.on('duplicate username', function (data) {
            console.log('duplicate username', data);
        })

        return {
            status: "join room",
            session: {}
        }
    },

    render: function() {
        // var session = this.state.session;
        // var listSessions = Object.keys(session).map(function(index) {
        //     return (
        //         <div>
        //             {index}: {session[index]}
        //         </div>
        //     );
        // });

        switch(this.state.status) {
            case "join room":
                return (
                    <div>
                        <div className="small-header">Join Room</div>
                        <form onSubmit={this.formHandle}>
                            <div className="form-group">
                                <input type="text" className="form-control" ref="username" placeholder="username" />
                            </div>
                            <div className="form-group">
                                <input type="text" className="form-control" ref="gameCode" placeholder="gameCode" maxLength="4" size="4" />
                            </div>
                            <div className="form-group">
                                <button type="submit" className="btn">Enter</button>
                            </div>
                        </form>
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

React.render(<Gamepad />, document.getElementById('gamepad'));