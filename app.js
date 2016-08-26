/*
 *  app.js - server
 *
 *  made by LeeSangchul , SC_production
 */

///////////////////////////////////////////////////////////////////////////////
//
//  server
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
//app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

var server = http.createServer(app);

app.get('/:roomId', function(req, res) {
  res.sendfile('omok/index.html');
});

var io = socketio.listen(server);

if(!process.env.PORT) { process.env.PORT = 8124}  // this is for localhost test

server.listen(process.env.PORT, function(req, res) {
  console.log('Socket IO server has been started');
});


///////////////////////////////////////////////////////////////////////////////
//  DATA
//
//  black, white, board
//
//  black, white <- socket object
//  socket.user = { userid, nickname, thumbnail_image }
//
//  rooms <- room <- black, white, board
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
//  socket event
//
///////////////////////////////////////////////////////////////////////////////

// first connection
io.sockets.on('connection', function(socket) {

// add user info to server and other users
  socket.on('addme', function(roomId, userid, nickname, thumbnail_image) {

    console.log('\naddme: ');

    // join room
    socket.join(roomId);
    console.log('\tJoin Room Id:', roomId);
    
    // set room info
    socket.set('roomId', roomId, function() {
      if(rooms[roomId] == undefined) {
        var room = rooms[roomId] = new Object();
        room.black = BLACK;
        room.white = WHITE;
        room.board = initBoard();
        console.log('\tcreate new room: ' + roomId);
        console.log('\tblack: ' + room.black.user.nickname);
        console.log('\twhite: ' + room.white.user.nickname);
      }
    });
    socket.roomId = roomId;
    console.log('\tuser join to room: ' + socket.roomId);

    // set value in socket
    var user = {
      userid: userid,
      nickname: nickname,
      thumbnail_image: thumbnail_image
    };
    socket.set('user', user); // save data for redis
    socket.user = user;       // save data for node

    // add user to clients
    socket.broadcast.to(socket.roomId).emit('useradd', userid, nickname, thumbnail_image);
    io.sockets.clients(socket.roomId).forEach(function(client) {
      if(client !== socket) {
        client.get('user', function(err, user) {
          if(!err && user) {
            socket.emit('useradd', user.userid, user.nickname, user.thumbnail_image);
          }
        });
      }
    });
    
    // set player to client
    socket.emit('setplayer', 'black', rooms[socket.roomId].black.user);
    socket.emit('setplayer', 'white', rooms[socket.roomId].white.user);
    
    // server log
    console.log('\tuser added: ' + nickname + ', in room: ' + socket.roomId);

  });
  
  
// get aspiration player
  socket.on('aspiration', function(color) {
    const room = rooms[socket.roomId];
    var black = room.black;
    var white = room.white;
    var player = (color === 'black' ? black : white);
    
    // if already user exist
    if(player.user.userid) {
      socket.send('늦었다냥~');
      return;
    }
    
    // set user in color
    if(color === 'black') { room.black = socket; }
    else { room.white = socket; }
    
    // set player to client
    io.sockets.in(socket.roomId).emit('setplayer', color, socket.user);
    
    // start game when black and white player exist
    if(room.black.user.userid && room.white.user.userid) {
      startGame(socket.roomId);
    }

    console.log('\n' + color + ' set ' + socket.user.nickname + ' in room: ' + socket.roomId);
  });
  
  
// disconnect
  socket.on('disconnect', function() {
    // only works when user login
    if(socket.user) {
      // del user on client side
      io.sockets.in(socket.roomId).emit('userdel', socket.user.userid);
      console.log('\nuser disconnect: ' + socket.user.nickname + ' in room: ' + socket.roomId);

      // 흑백돌 플레이어가 나갔을때
      // 게임 승리 화면 띄우고 게임 초기화 -> 승리 기록 남기기
      if(rooms[socket.roomId].black === socket) {
        rooms[socket.roomId].black = BLACK;
        io.sockets.in(socket.roomId).emit('setplayer', 'black', rooms[socket.roomId].black.user);
      }
      if(rooms[socket.roomId].white === socket) {
        rooms[socket.roomId].white = WHITE;
        io.sockets.in(socket.roomId).emit('setplayer', 'white', rooms[socket.roomId].white.user);
      }
    }
    // room이 비었을때 룸 삭제 해야함 -> 로직 추가
  });
  
});

///////////////////////////////////////////////////////////////////////////////
//
//  functions
//
///////////////////////////////////////////////////////////////////////////////
function startGame(roomId) {
  console.log('start game:', roomId);
  var room = rooms[roomId];
  io.sockets.in(roomId).send('start game!');
  room.gameCount = 1;
  room.black.emit('yourturn', 'black', room.gameCount);
  room.black.on('setrock', function(row, col, win) {
    room.board[row][col] = room.gameCount;
    printBoard(room.board);
    console.log('black ' + row + ' ' + col + ' count: ' + room.gameCount);
    room.black.broadcast.to(roomId).emit('updateboard', 'black', row, col, room.gameCount++);
    if(win) {
      io.sockets.in(roomId).emit('win', 'black');
    } else {
      room.white.emit('yourturn', 'white', room.gameCount);
    }
  });
  room.white.on('setrock', function(row, col, win) {
    room.board[row][col] = room.gameCount;
    printBoard(room.board);
    console.log('white ' + row + ' ' + col + ' count: ' + room.gameCount);
    room.white.broadcast.to(roomId).emit('updateboard', 'white', row, col, room.gameCount++);
    if(win) {
      io.sockets.in(roomId).emit('win', 'white');
    } else {
      room.black.emit('yourturn', 'black', room.gameCount);
    }
  });
  // 승리감지 로직 필요
}

// print board at console
function printBoard(board) {
  board.forEach(function(arr) {
    console.log(arr);
  });
}
///////////////////////////////////////////////////////////////////////////////
//
//  io.configure
//
///////////////////////////////////////////////////////////////////////////////
// set server log level
io.configure('development', function() {
  io.set('log level', 1);
});