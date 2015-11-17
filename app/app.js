var board,
game = new Chess(),
statusEl = $('#status'),
fenEl = $('#fen'),
pgnEl = $('#pgn');



// for debug only
var __kb;
var __scope;


/**
* The main app
*/
var App = angular.module('Chess', [
  'ngAudio',
  'lumx'
]);

App.config(function($locationProvider) {
  $locationProvider
  .html5Mode({ enabled: true, requireBase: false });
});

App.controller('Main', function($scope, $http, $location, $timeout, ngAudio, LxNotificationService, LxProgressService, LxDialogService) {
  // Namespaces
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
  var TMP   = $rdf.Namespace("urn:tmp:");

  var f,g;

  // INIT
  /**
  * Init app
  */
  $scope.initApp = function() {
    $scope.init();
  };

  /**
  * Set Initial variables
  */
  $scope.init = function() {

    $scope.initStore();
    $scope.initBoard();
    $scope.initUI();

    /*
    $scope.initRDF();
    $scope.initQueryString();
    $scope.initLocalStorage();
    */

    __kb = g;
    __scope = $scope;
  };


  /**
   * Init UI
   */
  $scope.initUI = function() {
    $scope.initialized = true;
    $scope.loggedIn = false;
    $scope.loginTLSButtonText = "Login";
    $scope.audio = ngAudio.load('audio/button-3.mp3');
  };

  /**
   * Init store
   */
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

  /**
   * Init board
   */
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


  /**
  * Get values from localStorage
  */
  $scope.initLocalStorage = function() {
    if (localStorage.getItem('again')) {
      $scope.again = JSON.parse(localStorage.getItem('again'));
    } else {
      $scope.again = [];
    }
    if (localStorage.getItem('good')) {
      $scope.good = JSON.parse(localStorage.getItem('good'));
    } else {
      $scope.good = [];
    }
    if (localStorage.getItem('easy')) {
      $scope.easy = JSON.parse(localStorage.getItem('easy'));
    } else {
      $scope.easy = [];
    }
    if (localStorage.getItem('user')) {
      var user = JSON.parse(localStorage.getItem('user'));
      $scope.loginSuccess(user);
    }
  };

  /**
  * init RDF knowledge base
  */
  $scope.initRDF = function() {
    var PROXY = "https://rww.io/proxy.php?uri={uri}";
    var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
    var TIMEOUT = 90000;
    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

    g = $rdf.graph();
    f = $rdf.fetcher(g, TIMEOUT);
  };

  /**
  * init from query string
  */
  $scope.initQueryString = function() {
    if ($location.search().max) {
      $scope.max = $location.search().max;
    }
    $scope.setMax($scope.max);

    $scope.storageURI = 'https://melvincarvalho.github.io/data/vocab/czech.ttl';
    if ($location.search().storageURI) {
      $scope.storageURI = $location.search().storageURI;
    }
    $scope.setStorageURI($scope.storageURI);

    if ($location.search().lang1) {
      $scope.lang1 = $location.search().lang1;
    }

    if ($location.search().lang2) {
      $scope.lang2 = $location.search().lang2;
    }

  };

  /**
  * setMax set maximum number of words
  * @param  {Number} max number or words
  */
  $scope.setMax = function(max) {
    $scope.max = max;
    $location.search('max', $scope.max);
  };

  /**
  * setStorageURI set the storage URI for words
  * @param  {String} the storage URI for words
  */
  $scope.setStorageURI = function(storageURI) {
    $scope.storageURI = storageURI;
    $location.search('storageURI', $scope.storageURI);
  };


  // AUTH
  /**
  * TLS Login with WebID
  */
  $scope.TLSlogin = function() {
    var AUTHENDPOINT = "https://databox.me/";
    $scope.loginTLSButtonText = 'Logging in...';
    $http({
      method: 'HEAD',
      url: AUTHENDPOINT,
      withCredentials: true
    }).success(function(data, status, headers) {
      var header = 'User';
      var scheme = 'http';
      var user = headers(header);
      if (user && user.length > 0 && user.slice(0,scheme.length) === scheme) {
        $scope.loginSuccess(user);
      } else {
        $scope.notify('WebID-TLS authentication failed.', 'error');
      }
      $scope.loginTLSButtonText = 'Login';
    }).error(function(data, status, headers) {
      $scope.notify('Could not connect to auth server: HTTP '+status);
      $scope.loginTLSButtonText = 'Login';
    });
  };

  /**
  * loginSuccess called after successful login
  * @param  {String} user the logged in user
  */
  $scope.loginSuccess = function(user) {
    $scope.notify('Login Successful!');
    $scope.loggedIn = true;
    $scope.user = user;
    $scope.fetchAll();
    localStorage.setItem('user', JSON.stringify(user));
  };

  /**
  * Logout
  */
  $scope.logout = function() {
    $scope.init();
    $scope.notify('Logout Successful!');
    localStorage.removeItem('user');
  };

  // FETCH functions
  //
  //
  $scope.fetchAll = function() {
    $scope.fetchBoard();
  };

  /**
   * Fetch the board
   * @param  {String} position The URI for the position
   */
  $scope.fetchBoard = function (position) {
    var storageURI = 'https://chess.databox.me/Public/.chess/test';
    if ($location.search().storageURI) {
      storageURI = $location.search().storageURI;
    }
    $scope.storageURI = storageURI;
    connectToSocket($scope.storageURI);


    f.requestURI(storageURI, undefined, true, function(ok, body) {
      var p = g.statementsMatching(undefined, TMP('fen'));
      if (p.length) {
        $scope.position = p[0].object.value;
        $scope.render();
      }
    });
  };

  /**
   * Invalidate a cached URI
   * @param  {String} uri The URI to invalidate
   */
  $scope.invalidate = function(uri) {
    console.log('invalidate : ' + uri);
    f.unload(uri);
    f.refresh($rdf.sym(uri));
  };

  /**
  * fetchSeeAlso fetches the see also
  */
  $scope.fetchSeeAlso = function() {
    var seeAlso = 'https://melvincarvalho.github.io/vocab/data/seeAlso.ttl';
    if ($location.search().seeAlso) {
      seeAlso = $location.search().seeAlso;
    }
    f.nowOrWhenFetched(seeAlso, undefined, function(ok, body) {
      console.log('seeAlso fetched from : ' + seeAlso);
    });

  };

  /**
   * Save the position
   */
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
      data: '<#this> '+ TMP('fen') +' """' + position + '""" .',
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


  // HELPER
  /**
  * Notify
  * @param  {String} message the message to display
  * @param  {String} type the type of notification, error or success
  */
  $scope.notify = function(message, type) {
    console.log(message);
    if (type === 'error') {
      LxNotificationService.error(message);
    } else {
      LxNotificationService.success(message);
    }
  };



  // RENDER
  /**
  * render screen
  */
  $scope.render = function() {
    $scope.renderBoard();
  };

  /**
   * Render the board
   */
  $scope.renderBoard = function () {
    if (!$scope.position) return;

    board.position($scope.position, false);
    game.load($scope.position);
    $scope.fen = game.fen();
  };

  /**
   * Refresh the board
   */
  $scope.refresh = function() {
    $scope.fetchBoard();
    $scope.render();
  };

  /**
  * openDialog opens a dialog box
  * @param  {String} elem  The element to display
  */
  $scope.openDialog = function(elem) {
    LxDialogService.open(elem);
    $(document).keyup(function(e) {
      if (e.keyCode===27) {
        LxDialogService.close(elem);
      }
    });
  };


  // SOCKETS
  //
  //
  /**
   * Get wss from URI
   * @param  {String} uri The URI to use
   */
  function getWss(uri) {
    return 'wss://' + uri.split('/')[2];
  }

  /**
   * Send subscrption
   * @param  {String} message The message
   * @param  {String} socket  The socket to send to
   */
  function sendSub(message, socket) {
    socket.send(message);
  }

  /**
   * Connect to a web socket
   * @param  {String} sub Where to subscribe to
   */
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

/**
 * Escape URIs filter
 */
App.filter('escape', function() {
  return window.encodeURIComponent;
});
