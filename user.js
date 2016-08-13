module.exports = User;

function User(socket, userid, nickname, thumbnail_image) {
  this.socket = socket || {};
  socket = this.socket;
  this.userid = socket.userid || userid || '';
  this.nickname = socket.nickname || nickname || '';
  this.thumbnail_image = socket.thumbnail_image || thumbnail_image || '';
  this.user = {
    userid: this.userid,
    nickname: this.nickname,
    thumbnail_image: this.thumbnail_image
  };
}

User.prototype.init = function(color) {
  this.socket = {};
  this.userid = '';
  this.nickname = 'click';
  this.thumbnail_image = 'img/' + color + '.png';
  return this;
};