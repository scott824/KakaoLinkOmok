/*
 *  index.js
 *
 *  made by LeeSangchul , SC_production
 */

/*
 *  기능 미추가 목록
 * 1. 시간초 기능 - timeout
 * 2. 턴 표시
 * 3. 흑백 선택시 아래에서 날라가는 에니메이션
 * 4. 33 감지 기능
 * 5. 승리 감지 후 초기화
 * 
 */

/* global io */
/* global Kakao */
/* global $ -> jquery*/

const TABLEROW = 17;
const TABLECOL = 17;

// connect to server socket
var socket = io.connect();

// user info
var userid;
var nickname;
var thumbnail_image;

// check user status
var userStatus = 'audiance';// | 'black' | 'white'

// board
var board = initBoard();

function initBoard() {
  var arr = new Array(TABLEROW);
  for(var i=0; i < TABLEROW; i++) {
    arr[i] = new Array(TABLECOL);
  }
  return arr;
}

var url = window.location.pathname;
var room = url.split('/')[1];
console.log('url: ' + url);
/******************************************************************************/
// onload
window.onload = function() {
  // const
  const BOARDWIDTH = 740;
  const BOARDHEIGHT = 740;
  
  // prevent scroll touch
  document.body.addEventListener('touchmove',function(event){
    event.preventDefault();
  }, false);

  // Login to Kakao
  kakaoLogin(function(userid, nickname, thumbnail_image) {
    socket.emit('addme', room, userid, nickname, thumbnail_image);
    window.userid = userid;
    window.nickname = nickname;
    window.thumbnail_image = thumbnail_image;
    useradd(userid, nickname, thumbnail_image);
    getSocketEvent(); // get socket event after login
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

  // scroll board by user
  main.addEventListener('touchstart', function(event) {
    const touch = event.touches[0];
    main.startXY = {x: touch.clientX, y: touch.clientY};
  }, false);
  main.addEventListener('touchmove', function(event) {
    const touch = event.touches[0];
    const X = touch.clientX - main.startXY.x;
    const Y = touch.clientY - main.startXY.y;
    main.startXY.x = touch.clientX;
    main.startXY.y = touch.clientY;
    scrollBoard(X, Y, 0);
  }, false);
  main.addEventListener('touchend', function(event) {
    main.startXY = null;
  }, false);
  
  // scroll to center
  scrollBoard((document.body.clientWidth - BOARDWIDTH)/2,
              (document.body.clientWidth - BOARDHEIGHT)/2, 'slow');
};

/******************************************************************************/
function useradd(userid, nickname, thumbnail_image) {
  makeFigureWithPOPAnimation({
    userid: userid,
    nickname: nickname,
    thumbnail_image: thumbnail_image
  }, document.getElementById('profiles'));
  console.log('add user -> id: ' + userid + ', name:' + nickname);
}

function userdel(userid) {
  $('#' + userid).animate({
    width: '1px',
    height: '1px',
    fontSize: '1px'
  }, 'slow', 'swing', function() {
    document.getElementById(userid).remove();
  });
  console.log('remove id : ' + userid);
}

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
  console.log('yourturn');
  window.userStatus = color;
  var table = document.getElementById('omoktable');
  var tds = table.getElementsByTagName('td');
  
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
        socket.emit('setrock', row, col);
        window.board[row][col] = count;
        window.userStatus = 'audiance';
      }
    }
    
    function addTouchEvent() {
      td.addEventListener('touchstart', touchstart, false);
      td.addEventListener('touchmove', touchmove, false);
      td.addEventListener('touchend', touchend, false);
      td.onclick = function(event) {
        touchstart(); touchend();
      }
    }
    function removeTouchEvent() {
      td.removeEventListener('touchstart', touchstart);
      td.removeEventListener('touchmove', touchmove);
      td.removeEventListener('touchend', touchend);
      td.onclick = function(){};
    }
    
    if(!td.childNodes[0]) {
      addTouchEvent();
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
    board[row][col] = count;
  }
});

socket.on('message', function(message) {
  alert(message);
});
}// getsocketEvent function end line

/******************************************************************************/
// login to kakao and get id, nickname, thumbnail_image
function kakaoLogin(callback) {
  Kakao.init('5f26fbc306c7d87778b19f6c0837fc20');
  Kakao.Auth.getStatus(function(statusObj) {
    console.log('check login before');
    if(statusObj.status === 'connected') {
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
  }, speed);
  // $('#main').animate({
  //   backgroundPositionX: '+=' + x + 'px',
  //   backgroundPositionY: '+=' + y + 'px'
  // }, speed);
}

function clearBoard() {
  var table = document.getElementById('omoktable');
  var tds = table.getElementsByTagName('td');
  Array.prototype.forEach(tds, function(td) {
    td.innerHTML = '';
    td.removeEventListener();// 안드로이드에서 작동 안됌
  });
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
  figure.style.width = '1px';
  figure.style.height = '1px';
  figure.style.fontSize = '1px';
  parentNode.appendChild(figure);

  $(figure).animate({
    width: '50px',
    height: '73px',
    fontSize: '15px'
  }, 'slow', 'swing');
}