/*
 *  checkwin.js - client
 *  
 *  made by LeeSangchul , SC_production
 */

// const TABLEROW, TABLECOL
function checkwin(board, x, y) {
  console.log('checkwin : ', x, y);
  var isEven = board[x][y] % 2;
  const X = x;
  const Y = y;


// check | line
  var count = 0;
  // check 12 O`clock
  for(var i=0; i < TABLEROW; i++) {
    if(x > 0 && board[x - 1][y] !== 0) {
    if(board[x - 1][y] % 2 === isEven) {
      console.log('board[x - 1][y]: ' + board[x - 1][y]);
      count++;
      x -= 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  // check 6 O`clock
  for(var i=0; i < TABLEROW; i++) {
    if(x < TABLEROW-1 && board[x + 1][y] !== 0) {
    if(board[x + 1][y] % 2 === isEven) {
      console.log('board[x + 1][y]: ' + board[x + 1][y]);
      count++;
      x += 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  console.log('| count:', count);
  if(count === 4) {
    return true;
  }


// check -- line
  count = 0;
  // check 3 O`clock
  for(var i=0; i < TABLECOL; i++) {
    if(y < TABLECOL-1 && board[x][y + 1] !== 0) {
    if(board[x][y + 1] % 2 === isEven) {
      count++;
      y += 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  // check 9 O`clock
  for(var i=0; i < TABLECOL; i++) {
    if(y > 0 && board[x][y - 1] !== 0) {
    if(board[x][y - 1] % 2 === isEven) {
      count++;
      y -= 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  console.log('-- count:', count);
  if(count === 4) {
    return true;
  }


// check \ line
  count = 0;
  // check 11 O`clock
  for(var i=0; i < TABLEROW; i++) {
    if(x > 0 && y > 0 && board[x - 1][y - 1] !== 0) {
    if(board[x - 1][y - 1] % 2 === isEven) {
      count++;
      x -= 1; y -= 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  // check 5 O`clock
  for(var i=0; i < TABLEROW; i++) {
    if(x < TABLEROW-1 && y < TABLECOL-1 && board[x + 1][y + 1] !== 0) {
    if(board[x + 1][y + 1] % 2 === isEven) {
      count++;
      x += 1; y += 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  console.log('\\ count:', count);
  if(count === 4) {
    return true;
  }


// check / line
  count = 0;
  // ckeck 1 O`clock
  for(var i=0; i < TABLEROW; i++) {
    if(x > 0 && y < TABLECOL-1 && board[x - 1][y + 1] !== 0) {
    if(board[x - 1][y + 1] % 2 === isEven) {
      count++;
      x -= 1; y += 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  // check 7 O`clock
  for(var i=0; i < TABLEROW; i++) {
    if(x < TABLEROW-1 && y > 0 && board[x + 1][y - 1] !== 0) {
    if(board[x + 1][y - 1] % 2 === isEven) {
      count++;
      x += 1; y -= 1;
    } else { break; }
    } else { break; }
  }
  x = X; y = Y;
  console.log('/ count:', count);
  if(count === 4) {
    return true;
  }

  // not win
  return false;
}