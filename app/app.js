var board,
game = new Chess(),
statusEl = $('#status'),
fenEl = $('#fen'),
pgnEl = $('#pgn');


var f,g;
var db;

var CHAT  = $rdf.Namespace("https://ns.rww.io/chat#");
var CURR  = $rdf.Namespace("https://w3id.org/cc#");
var DCT   = $rdf.Namespace("http://purl.org/dc/terms/");
var FACE  = $rdf.Namespace("https://graph.facebook.com/schema/~/");
var FOAF  = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
var LIKE  = $rdf.Namespace("http://ontologi.es/like#");
var LDP   = $rdf.Namespace("http://www.w3.org/ns/ldp#");
var MBLOG = $rdf.Namespace("http://www.w3.org/ns/mblog#");
var OWL   = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
var PIM   = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
var RDF   = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var RDFS  = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
var SIOC  = $rdf.Namespace("http://rdfs.org/sioc/ns#");
var SOLID = $rdf.Namespace("http://www.w3.org/ns/solid/app#");
var URN   = $rdf.Namespace("urn:");

var AUTHENDPOINT = "https://databox.me/";
var PROXY = "https://rww.io/proxy.php?uri={uri}";
var TIMEOUT = 5000;
var DEBUG = true;

var scope = {};
var gg;

$rdf.Fetcher.crossSiteProxyTemplate=PROXY;

var App = angular.module('myApp', [
  'lumx',
  'ngAudio',
]);

App.config(function($locationProvider) {
  $locationProvider
  .html5Mode({ enabled: true, requireBase: false });
});

App.controller('Main', function($scope, $http, $location, $timeout, $sce, ngAudio, LxNotificationService, LxProgressService, LxDialogService) {


  // INIT functions
  //
  // save app configuration if it's the first time the app runs
  $scope.initApp = function() {
    $scope.init();
  };

  // set init variables
  $scope.init = function() {

    $scope.initStore();
    $scope.initBoard();
    $scope.fetchBoard();
    $scope.initUI();

  };

  $scope.initUI = function() {
    $scope.initialized = true;
    $scope.loggedIn = false;
    $scope.loginTLSButtonText = "Login";
    $scope.audio = ngAudio.load('audio/button-3.mp3');
  };

  $scope.initStore = function() {
    // start in memory DB
    g = $rdf.graph();
    f = $rdf.fetcher(g);
    // add CORS proxy
    var PROXY      = "https://data.fm/proxy?uri={uri}";
    var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
    //$rdf.Fetcher.crossSiteProxyTemplate=PROXY;
    var kb         = $rdf.graph();
    var fetcher    = $rdf.fetcher(kb);
  };

  $scope.initBoard = function() {

    // do not pick up pieces if the game is over
    // only pick up pieces for the side to move
    var onDragStart = function(source, piece, position, orientation) {
      if (game.game_over() === true ||
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
      }
    };

    var onDrop = function(source, target) {
      // see if the move is legal
      var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
      });

      // illegal move
      if (move === null) return 'snapback';

      updateStatus();
    };

    // update the board position after the piece snap
    // for castling, en passant, pawn promotion
    var onSnapEnd = function() {
      board.position(game.fen());
      $scope.position = game.fen();
      $scope.save();
      //$scope.audio.play();
    };

    var updateStatus = function() {
      var status = '';

      var moveColor = 'White';
      if (game.turn() === 'b') {
        moveColor = 'Black';
      }

      // checkmate?
      if (game.in_checkmate() === true) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
      }

      // draw?
      else if (game.in_draw() === true) {
        status = 'Game over, drawn position';
      }

      // game still on
      else {
        status = moveColor + ' to move';

        // check?
        if (game.in_check() === true) {
          status += ', ' + moveColor + ' is in check';
        }
      }


      $scope.status = status;
      $scope.fen = game.fen();
      $scope.pgn = game.pgn();
    };

    var cfg = {
      draggable: true,
      position: 'start',
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd
    };
    board = new ChessBoard('board', cfg);

    updateStatus();
  };



  // RENDER functions
  //
  //
  $scope.render = function() {
    $scope.renderBoard();
  };

  $scope.renderBoard = function () {
    if (!$scope.position) return;

    board.position($scope.position, false);
    game.load($scope.position);
    $scope.fen = game.fen();
  };

  $scope.refresh = function() {
    $scope.fetchBoard();
    $scope.render();
  };


  // QUEUE functions
  //
  //

  // FETCH functions
  //
  //
  $scope.fetchBoard = function (position) {
    var storageURI = 'https://chess.databox.me/Public/.chess/test';
    if ($location.search().storageURI) {
      storageURI = $location.search().storageURI;
    }
    $scope.storageURI = storageURI;
    connectToSocket($scope.storageURI);


    f.requestURI(storageURI, undefined, true, function(ok, body) {
      var p = g.statementsMatching(undefined, URN('fen'));
      if (p.length) {
        $scope.position = p[0].object.value;
        $scope.render();
      }
    });
  };

  $scope.invalidate = function(uri) {
    console.log('invalidate : ' + uri);
    f.unload(uri);
    f.refresh($rdf.sym(uri));
  };

  // HELPER functions
  //
  //
  $scope.openDialog = function(elem, reset) {
    if (reset) {
      $scope.resetContact();
    }
    LxDialogService.open(elem);
    $(document).keyup(function(e) {
      if (e.keyCode===27) {
        LxDialogService.close(elem);
      }
    });
  };

  $scope.save = function() {
    var position = $scope.position;
    if (!position) {
      LxNotificationService.error('position is empty');
      return;
    }
    console.log(position);

    $http({
      method: 'PUT',
      url: $scope.storageURI,
      withCredentials: true,
      headers: {
        "Content-Type": "text/turtle"
      },
      data: '<#this> '+ URN('fen') +' """' + position + '""" .',
    }).
    success(function(data, status, headers) {
      LxNotificationService.success('Position saved');
      $location.search('storageURI', $scope.storageURI);
      $scope.renderBoard(position);
    }).
    error(function(data, status, headers) {
      LxNotificationService.error('could not save position');
    });

  };

  $scope.TLSlogin = function() {
    $scope.loginTLSButtonText = 'Logging in...';
    $http({
      method: 'HEAD',
      url: AUTHENDPOINT,
      withCredentials: true
    }).success(function(data, status, headers) {
      // add dir to local list
      var user = headers('User');
      if (user && user.length > 0 && user.slice(0,4) == 'http') {
        LxNotificationService.success('Login Successful!');
        $scope.loggedIn = true;
        $scope.user = user;
      } else {
        LxNotificationService.error('WebID-TLS authentication failed.');
        console.log('WebID-TLS authentication failed.');
      }
      $scope.loginTLSButtonText = 'Login';
    }).error(function(data, status, headers) {
      LxNotificationService.error('Could not connect to auth server: HTTP '+status);
      console.log('Could not connect to auth server: HTTP '+status);
      $scope.loginTLSButtonText = 'Login';
    });
  };



  $scope.logout = function() {
    $scope.init();
    LxNotificationService.success('Logout Successful!');
  };

  // SOCKETS
  //
  //
  function getWss(uri) {
    return 'wss://' + uri.split('/')[2];
  }

  function sendSub(message, socket) {
    socket.send(message);
  }

  function connectToSocket(sub) {
    if ($scope.socket) return;

    var socket;

    var wss = getWss(sub);
    console.log('connecting to : ' + wss);

    socket = new WebSocket(wss);

    socket.onopen = function(){
      console.log(sub);
      $scope.socket = socket;
    };

    socket.onmessage = function(msg) {
      console.log('Incoming message : ');
      var a = msg.data.split(' ');
      console.log(a[1]);

      $scope.invalidate(a[1]);
      $scope.fetchBoard();
      $scope.audio.play();

      Notification.requestPermission(function (permission) {
        // If the user is okay, let's create a notification
        if (permission === "granted") {
          notify = true;
        }
      });

    };

    // delay in case socket is still opening
    var DELAY = 1000;
    setTimeout(function(){
      sendSub('sub ' + sub, socket);
    }, DELAY);


  }


  $scope.initApp();

});

// escape uris
App.filter('escape', function() {
  return window.encodeURIComponent;
});
