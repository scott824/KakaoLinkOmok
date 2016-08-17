///////////////////////////////////////////////////////////////////////////////
//
// server
//
///////////////////////////////////////////////////////////////////////////////

var express = require('express');
var socketio = require('socket.io');
var http = require('http');
var path = require('path');

var app = express();
app.use(express.bodyParser());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(express.static(path.join(__dirname, 'omok')));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

var server = http.createServer(app);

app.get('/:room', function(req, res) {
  console.log('room name is: ' + req.params.room);
  res.sendfile('omok/index.html');
});

var io = socketio.listen(server);

if(!process.env.PORT) { process.env.PORT = 8124}  // this is for localhost test

server.listen(process.env.PORT, function(req, res) {
  console.log('Socket IO server has been started');
});


///////////////////////////////////////////////////////////////////////////////
// DATA
//
// black, white, board
//
// black, white <- socket object
// socket.user = { userid, nickname, thumbnail_image }
//
// room <- black, white, board
///////////////////////////////////////////////////////////////////////////////
const BLACK_NICKNAME = '검냥이';
const BLACK_THUMBNAILIMAGE = 'img/black.png';
const BLACK = {user: {nickname: BLACK_NICKNAME, thumbnail_image: BLACK_THUMBNAILIMAGE}};

const WHITE_NICKNAME = '흰냥이';
const WHITE_THUMBNAILIMAGE = 'img/white.png';
const WHITE = {user: {nickname: WHITE_NICKNAME, thumbnail_image: WHITE_THUMBNAILIMAGE}};

const BOARD_ROW = 17;
const BOARD_COL = 17;

function initBoard() {
  var arr = new Array(BOARD_ROW);
  for(var i=0; i < BOARD_ROW; i++) {
    arr[i] = new Array(BOARD_COL);
    for(var j=0; j < BOARD_COL; j++) {
      arr[i][j] = 0;
    }
  }
  return arr;
}

var rooms = [];

///////////////////////////////////////////////////////////////////////////////
//
// socket event
//
///////////////////////////////////////////////////////////////////////////////
io.sockets.on('connection', function(socket) {

// add user info to server and other users
  socket.on('addme', function(room, userid, nickname, thumbnail_image) {
    console.log('\naddme: ');
    // join room
    socket.join(room);

    socket.set('room', room, function() {
      if(rooms[room] == undefined) {
        rooms[room] = new Object();
        rooms[room].black = BLACK;
        rooms[room].white = WHITE;
        rooms[room].board = initBoard();
        console.log('\tcreate new room: ' + room);
        console.log('\tblack: ' + rooms[room].black.user.nickname);
      }
    });
    socket.room = room;
    console.log('\tuser join to room: ' + socket.room);

    // set value in socket
    var user = {
      userid: userid,
      nickname: nickname,
      thumbnail_image: thumbnail_image
    };
    socket.set('user', user); // save data for redis
    socket.user = user;       // save data for node

    // add user to clients
    socket.broadcast.to(socket.room).emit('useradd', userid, nickname, thumbnail_image);
    io.sockets.clients(socket.room).forEach(function(client) {
      if(client !== socket) {
        client.get('user', function(err, user) {
          if(!err && user) {
            socket.emit('useradd', user.userid, user.nickname, user.thumbnail_image);
          }
        });
      }
    });
    
    // set player to client
    socket.emit('setplayer', 'black', rooms[socket.room].black.user);
    socket.emit('setplayer', 'white', rooms[socket.room].white.user);
    
    // server log
    console.log('\tuser added: ' + nickname + ', in room: ' + socket.room);

  });
  
  
// get aspiration player
  socket.on('aspiration', function(color) {
    const room = socket.room;
    var black = rooms[room].black;
    var white = rooms[room].white;
    var player = (color === 'black' ? black : white);
    
    // aready user exist
    if(player.user.userid) {
      socket.send('your late!');
      return;
    }
    
    if(color === 'black') { rooms[room].black = socket; }
    else { rooms[room].white = socket; }
    
    io.sockets.in(socket.room).emit('setplayer', color, socket.user);
    
    // start game when black and white player exist
    if(rooms[room].black.user.userid && rooms[room].white.user.userid) {
      startGame(room);
    }
    console.log('\n' + color + ' set ' + socket.user.nickname + ' in room: ' + socket.room);
  });
  
  
// disconnect
  socket.on('disconnect', function() {
    // 로그인을 했을시만 작동
    if(socket.user) {
      io.sockets.in(socket.room).emit('userdel', socket.user.userid);
      console.log('\nuser disconnect: ' + socket.user.nickname + ' in room: ' + socket.room);

      // 흑백돌 플레이어가 나갔을때
      // 게임 승리 화면 띄우고 게임 초기화 -> 승리 기록 남기기
      if(rooms[socket.room].black === socket) {
        rooms[socket.room].black = BLACK;
        io.sockets.in(socket.room).emit('setplayer', 'black', rooms[socket.room].black.user);
      }
      if(rooms[socket.room].white === socket) {
        rooms[socket.room].white = WHITE;
        io.sockets.in(socket.room).emit('setplayer', 'white', rooms[socket.room].white.user);
      }
    }
    // room이 비었을때 룸 삭제 해야함 -> 로직 추가
  });
  
});

///////////////////////////////////////////////////////////////////////////////
//
// functions
//
///////////////////////////////////////////////////////////////////////////////
function startGame(room) {
  io.sockets.in(room).send('start game!');
  rooms[room].gameCount = 0;
  rooms[room].black.emit('yourturn', 'black', rooms[room].gameCount);
  rooms[room].black.on('setrock', function(row, col) {
    rooms[room].gameCount++;
    rooms[room].board[row][col] = rooms[room].gameCount;
    console.log('black ' + row + ' ' + col + ' count: ' + rooms[room].gameCount);
    rooms[room].black.broadcast.to(room).emit('updateboard', 'black', row, col, rooms[room].gameCount);
    rooms[room].white.emit('yourturn', 'white', rooms[room].gameCount);
  });
  rooms[room].white.on('setrock', function(row, col) {
    rooms[room].gameCount++;
    rooms[room].board[row][col] = rooms[room].gameCount;
    console.log('white ' + row + ' ' + col + ' count: ' + rooms[room].gameCount);
    rooms[room].white.broadcast.to(room).emit('updateboard', 'white', row, col, rooms[room].gameCount);
    rooms[room].black.emit('yourturn', 'black', rooms[room].gameCount);
  });
}

///////////////////////////////////////////////////////////////////////////////
//
// io.configure
//
///////////////////////////////////////////////////////////////////////////////
// set server log level
io.configure('development', function() {
  io.set('log level', 1);
});