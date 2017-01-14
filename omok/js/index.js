/*
 *  index.js - client
 *
 *  made by LeeSangchul , SC_production
 */

/*
 *  기능 미추가 목록
 * 1. 시간초 기능 - timeout
 * 2. 턴 표시
 * 3. 흑백 선택시 아래에서 날라가는 에니메이션
 * 4. 33 감지 기능
 * 5. 승리 감지 후 초기화 - 완료
 * 
 */

///////////////////////////////////////////////////////////////////////////////
//  DATA (global)
//  
//  USER INFO
//    userid, nickname, thumnail_image, userStatus
//
//  SOCKET
//    socket
//
//  GAME
//    board, gameCount
//
//  ROOM
//    url, roomId
//
///////////////////////////////////////////////////////////////////////////////

/* global $ */
/* global io */
/* global Kakao */
/* global bounce */


// SOCKET
const socket = io.connect();

// USER INFO
var userid;
var nickname;
var thumbnail_image;
var userStatus = 'audiance';// | 'black' | 'white'

// ROOM
const url = window.location.pathname;
const roomId = url.split('/')[1];
console.log('roomId:', roomId);

// GAME
var board = initBoard();
var gameCount = 0;

function initBoard() {
  var arr = new Array(TABLEROW);
  for(var i=0; i < TABLEROW; i++) {
    arr[i] = new Array(TABLECOL);
    for(var j=0; j < TABLECOL; j++) {
      arr[i][j] = 0;
    }
  }
  return arr;
}

///////////////////////////////////////////////////////////////////////////////
//
//  onload
//
///////////////////////////////////////////////////////////////////////////////

window.onload = function() {

  // prevent scroll touch
  document.body.addEventListener('touchmove',function(event){
    event.preventDefault();
  }, false);

  // Login to Kakao
  kakaoLogin(function(userid, nickname, thumbnail_image) {

    // login to omok server
    socket.emit('addme', roomId, userid, nickname, thumbnail_image);

    // set global DATA
    window.userid = userid;
    window.nickname = nickname;
    window.thumbnail_image = thumbnail_image;

    // display me in footer
    useradd(userid, nickname, thumbnail_image);
    
    // get socket event after login
    getSocketEvent();
  });
  
  // create table in main
  var main = document.getElementById('main');
  var table = document.createElement('table');
  table.id = "omoktable";
  for(var i=0; i < TABLEROW; i++) {
    var tr = document.createElement('tr');
    for(var j=0; j < TABLECOL; j++) {
      tr.appendChild(document.createElement('td'));
    }
    table.appendChild(tr);
  }
  main.appendChild(table);

  // scroll board by user touch
  scrollBoardByUserTouch();

  // scroll to center
  scrollBoard((document.body.clientWidth - BOARDWIDTH)/2,
              (document.body.clientWidth - BOARDHEIGHT)/2, 'slow');
};

///////////////////////////////////////////////////////////////////////////////
//
//  socket
//
///////////////////////////////////////////////////////////////////////////////
function getSocketEvent() {
// new user come
socket.on('useradd', useradd);

// exist user out
socket.on('userdel', userdel);

// get exist black-white player
socket.on('setplayer', function(color, user) {
  console.log('setplayer: ' + color + ' ' + user);
  var section = document.getElementById(color);
  if(section.childNodes[0]) {
    section.removeChild(section.childNodes[0]);
  }
  
  // player exist -> unable click
  if(user.userid) {
    section.removeEventListener('click', click, false);
    // footer에서 가져오는 에니메이션
  }
  // player !exist -> able click
  else {
    section.addEventListener('click', click, false);
    // 뿅 나타나는 에니메이션
  }
  function click(event) {
    socket.emit('aspiration', color);
  }
  var figure = document.createElement('figure');
  var img = document.createElement('img');
  var figcaption = document.createElement('figcaption');
  
  img.src = user.thumbnail_image;
  img.className = 'thumbnail_image';
  figcaption.innerHTML = user.nickname;
  
  figure.appendChild(img);
  figure.appendChild(figcaption);
  section.appendChild(figure);
});


socket.on('yourturn', function(color, count) {
  console.log('yourturn, count: ' + count);
  window.userStatus = color;
  window.gameCount = count;
  var table = document.getElementById('omoktable');
  var tds = table.getElementsByTagName('td');
  
  if(count < 3)
  Array.prototype.forEach.call(tds, function(td, index) {
    
    var touchmoved;
    
    function touchstart(event) {
      touchmoved = false;
    }
    
    function touchmove(event) {
      touchmoved = true;
    }
    
    function touchend(event) {
      if(!td.childNodes[0])
      if(touchmoved === false && window.userStatus === color) {
        var img = document.createElement('img');
        img.src = 'img/' + color + '.png';
        td.appendChild(img);
        var row = parseInt(index / TABLECOL);
        var col = parseInt(index % TABLECOL);
        console.log('row: ' + row + ' col: ' + col);
        window.board[row][col] = window.gameCount;
        socket.emit('setrock', row, col, checkwin(window.board, row, col));
        console.log('count: ' + window.gameCount);
        //printBoard(window.board);
        window.userStatus = 'audiance';
      }
    }
    
    td.addTouchEvent = function() {
      if(isMobile()) {
        td.addEventListener('touchstart', touchstart, false);
        td.addEventListener('touchmove', touchmove, false);
        td.addEventListener('touchend', touchend, false);
      } else {
        td.addEventListener('mousedown', touchstart, false);
        td.addEventListener('mousemove', touchmove, false);
        td.addEventListener('mouseup', touchend, false);
      }
    }
    td.removeTouchEvent = function() {
      if(isMobile()) {
        td.removeEventListener('touchstart', touchstart);
        td.removeEventListener('touchmove', touchmove);
        td.removeEventListener('touchend', touchend);
      } else {
        td.removeEventListener('mousedown', touchstart);
        td.removeEventListener('mousemove', touchmove);
        td.removeEventListener('mouseup', touchend);
      }
    }
    
    if(!td.childNodes[0]) {
      td.addTouchEvent();
    }
    
  });
  console.log('my turn');
});

socket.on('updateboard', function(color, row, col, count) {
  var table = document.getElementById('omoktable');
  var tds = table.getElementsByTagName('td');
  var img = document.createElement('img');
  img.src = 'img/' + color + '.png';
  
  var td = tds[row*TABLEROW + col];
  var x = -td.offsetLeft + document.body.clientWidth/2 - parseFloat(table.style.left);
  var y = -td.offsetTop + document.body.clientWidth/2 - parseFloat(table.style.top);
  scrollBoard(x, y);
  if(!td.childNodes[0]) {
    img.style.width = '1px';
    img.style.height = '1px';
    td.appendChild(img);
    $(img).animate({
      width: '40px',
      height: '40px'
    }, 'slow');
    window.board[row][col] = count;
    console.log('updateboard: ', row, col);
    //printBoard(window.board);
  }
  
});

socket.on('win', function(color) {
  alert(color + ' win');
  clearBoard();
});

socket.on('message', function(message) {
  alert(message);
});
}// getsocketEvent function end line

///////////////////////////////////////////////////////////////////////////////
//
//  functions
//
///////////////////////////////////////////////////////////////////////////////
// login to kakao and get id, nickname, thumbnail_image
function kakaoLogin(callback) {
  Kakao.init('5f26fbc306c7d87778b19f6c0837fc20');
  Kakao.Auth.getStatus(function(statusObj) {
    if(statusObj.status === 'connected') {
      console.log('auto login success');
      loginSuccess(statusObj.user);
    } else {
      Kakao.Auth.createLoginButton({
        container: '#kakao-login-btn',
        success: function(authObj) {
          Kakao.API.request({
            url: '/v1/user/me',
            success: loginSuccess,
            fail: function(error) {
              alert(JSON.stringify(error));
            }
          });
        },
        fail: function(err) {
          alert(JSON.stringify(err));
        },
        persistAccessToken: true,
        persistRefreshToken: true
      });
    }
  });
  
  function loginSuccess(res) {
    document.getElementById('kakao-login').remove();
    callback(res.id, 
              res.properties.nickname, 
              res.properties.thumbnail_image);
  }
}

// scroll main
function scrollBoard(x, y, speed) {
  if(speed === undefined) { speed = 'slow'; }
  $('#omoktable').animate({
    left: '+=' + x + 'px',
    top: '+=' + y + 'px'
  }, speed, 'swing');
}
function scrollBoardByUserTouch() {
  var main = document.getElementById('main');
  if(isMobile()) {
    console.log('Device Mode: Mobile');
    main.addEventListener('touchstart', mainTouchStart, false);
    main.addEventListener('touchmove', mainTouchMove, false);
    main.addEventListener('touchend', mainTouchEnd, false);
  }
  else {
    console.log('Device Mode: Desktop');
    main.addEventListener('mousedown', mainTouchStart, false);
    main.addEventListener('mousemove', mainTouchMove, false);
    main.addEventListener('mouseup', mainTouchEnd, false);
  }
  
  function mainTouchStart(event) {
    const touch = event.touches ? event.touches[0] : event;
    main.startXY = {x: touch.clientX, y: touch.clientY};
  }
  function mainTouchMove(event) {
    if(main.startXY) {
      const touch = event.touches ? event.touches[0] : event;
      const X = touch.clientX - main.startXY.x;
      const Y = touch.clientY - main.startXY.y;
      main.startXY.x = touch.clientX;
      main.startXY.y = touch.clientY;
      scrollBoard(X, Y, 0);
    }
  }
  function mainTouchEnd(event) {
    main.startXY = null;
  }
}

// clear board
function clearBoard() {
  var table = document.getElementById('omoktable');
  var tds = table.getElementsByTagName('td');
  Array.prototype.forEach.call(tds, function(td) {
    if(td.childNodes[0]) {
      td.removeChild(td.childNodes[0]);
    }
    td.removeTouchEvent();
  });
}

// add user to footer
function useradd(userid, nickname, thumbnail_image) {
  makeFigureWithPOPAnimation({
    userid: userid,
    nickname: nickname,
    thumbnail_image: thumbnail_image
  }, document.getElementById('profiles'));
  console.log('add user -> id: ' + userid + ', name:' + nickname);
}
function makeFigureWithPOPAnimation(user, parentNode) {
  var figure = document.createElement('figure');
  if(user.userid) {
    figure.id = user.userid;
  }

  var img = document.createElement('img');
  img.src = user.thumbnail_image;
  img.className = 'thumbnail_image';

  var figcaption = document.createElement('figcaption');
  figcaption.innerHTML = user.nickname;

  figure.appendChild(img);
  figure.appendChild(figcaption);
  parentNode.appendChild(figure);

  setBounceAnimation($(figure), 'appear');
}

// del user from footer
function userdel(userid) {
  setBounceAnimation( $('#' + userid), 'disappear', function() {
    document.getElementById(userid).remove();
  });
  console.log('remove id : ' + userid);
}

// check device
isMobile.save = null;
function isMobile() {
  if(this.save) { return this.save; }
  if( navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)){
      return true;
  } 
  else {
    return false;
  }
}

// print board at console
function printBoard(board) {
  board.forEach(function(arr) {
    console.log(arr);
  });
}

function commitTest() {
  console.log('test');
}