// start server
// crash
var express = require('express');
var socketio = require('socket.io');
var http = require('http');

var app = express();

var server = http.createServer(app);
app.use(express.static(__dirname + '/omok'));
app.use(app.router);

app.get('/', function(req, res) {
  res.send('hello');
});

var io = socketio.listen(server);

server.listen(process.env.PORT);


/******************************************************************************/
/*
 * black and white will get socket object
 * socket.user = { userid, nickname, thumbnail_image }
 */
const BLACK_NICKNAME = '검냥이';
const BLACK_THUMBNAILIMAGE = 'img/black.png';
const BLACK = {user: {nickname: BLACK_NICKNAME, thumbnail_image: BLACK_THUMBNAILIMAGE}};
var black = BLACK;

const WHITE_NICKNAME = '흰냥이';
const WHITE_THUMBNAILIMAGE = 'img/white.png';
const WHITE = {user: {nickname: WHITE_NICKNAME, thumbnail_image: WHITE_THUMBNAILIMAGE}};
var white = WHITE;

const BOARD_ROW = 17;
const BOARD_COL = 17;
var board = initBoard();

function initBoard() {
  var arr = new Array(BOARD_ROW);
  for(var i=0; i < BOARD_ROW; i++) {
    arr[i] = new Array(BOARD_COL);
  }
  return arr;
}

console.log('clients: ' + io.sockets.clients());
io.sockets.on('connection', function(socket) {
  
// add user info to server and other users
  socket.on('addme', function(userid, nickname, thumbnail_image) {
    
    // set value in socket
    var user = {
      userid: userid,
      nickname: nickname,
      thumbnail_image: thumbnail_image
    };
    socket.set('user', user); // redis
    socket.user = user;
    
    // add user to clients
    socket.broadcast.emit('useradd', userid, nickname, thumbnail_image);
    io.sockets.clients().forEach(function(client) {
      if(client !== socket) {
        client.get('user', function(err, user) {
          if(!err && user) {
            socket.emit('useradd', user.userid, user.nickname, user.thumbnail_image);
          }
        });
      }
    });
    
    // set player to client
    socket.emit('setplayer', 'black', black.user);
    socket.emit('setplayer', 'white', white.user);
    
    // server log
    console.log('user added: ' + nickname);
  });
  
  
// get aspiration player
  socket.on('aspiration', function(color) {
    
    var player = (color === 'black' ? black : white);
    
    // aready user exist
    if(player.user.userid) {
      socket.send('your late!');
      return;
    }
    
    if(color === 'black') { black = socket; }
    else { white = socket; }
    
    io.sockets.emit('setplayer', color, socket.user);
    
    // 흑백 다 찼을때 게임 시작
    if(black.user.userid && white.user.userid) {
      startGame();
    }
    console.log(color + ' set ' + socket.user.nickname);
  });
  
  
// disconnect
  socket.on('disconnect', function() {
    if(socket.user) { // 로그인을 했을경우
      io.sockets.emit('userdel', socket.user.userid);
      console.log('user disconnect: ' + socket.user.nickname);
    }
    // 흑백돌 플레이어가 나갔을때
    if(black === socket) {
      black = BLACK;
      io.sockets.emit('setplayer', 'black', black.user);
    }
    if(white === socket) {
      white = WHITE;
      io.sockets.emit('setplayer', 'white', white.user);
    }
  });
  
  
});

startGame.count = 0;
function startGame() {
  io.sockets.send('start game!');
  black.emit('yourturn', 'black', startGame.count);
  black.on('setrock', function(row, col) {
    console.log('black ' + row + ' ' + col + ' count: ' + startGame.count);
    startGame.count++;
    board[row][col] = startGame.count;
    black.broadcast.emit('updateboard', 'black', row, col, startGame.count);
    white.emit('yourturn', 'white', startGame.count);
  });
  white.on('setrock', function(row, col) {
    console.log('white ' + row + ' ' + col + ' count: ' + startGame.count);
    startGame.count++;
    board[row][col] = startGame.count;
    white.broadcast.emit('updateboard', 'white', row, col, startGame.count);
    black.emit('yourturn', 'black', startGame.count);
  })
}

io.configure('development', function() {
  io.set('log level', 1);
});