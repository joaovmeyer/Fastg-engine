	class Game {

		static moveflagEPC = 0x2 << 16;
		static moveflagCastleKing = 0x4 << 16;
		static moveflagCastleQueen = 0x8 << 16;
		static moveflagPromotion = 0x10 << 16;
		static moveflagPromoteKnight = 0x20 << 16;
		static moveflagPromoteQueen = 0x40 << 16;
		static moveflagPromoteBishop = 0x80 << 16;

		static cols = {0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f", 6: "g", 7: "h"};


		static squareToCoord = function(square) {
			return [square[0].charCodeAt() - 97, square[1] - 1]
		}
		static readMove = function(move) {
			return [move & 0xFF, (move >> 8) & 0xFF, move & 0xFF0000]
		}

		static getCoordinatesFromIndex = function(index) {
			return [7 - (index >> 4), index & 15]
		}
		static moveToNotation = function(move) {
			var move = Game.readMove(move);
			var start = Game.getCoordinatesFromIndex(move[0]);
			var end = Game.getCoordinatesFromIndex(move[1]);

			if (move[2] & Game.moveflagPromotion) {
			    if (move[2] & Game.moveflagPromoteKnight) 
			        newPiece = "=N";
			    else if (move[2] & Game.moveflagPromoteQueen) 
			        newPiece = "=Q";
			    else if (move[2] & Game.moveflagPromoteBishop) 
			        newPiece = "=B";
			    else 
			        newPiece ="=R";

			} else {
				var newPiece = "";
			}

			return Game.cols[start[1]] + (start[0] + 1) + Game.cols[end[1]] + (end[0] + 1) + newPiece;
		}


		static FENreader = function(FEN, humanPlayer) {
			var parts = FEN.split(" ");
			var pieceList = parts[0];
			var row = 0, col = 0;

			var pieces = [];
			var pieceMap = [[],[],[],[],[],[],[],[]]

			for (var i = 0; i < pieceList.length; i++) {
				var piece = pieceList[i];
				if (piece == "/") {
					row++;
					col = 0;
				} else {
					if (piece >= "0" && piece <= "9") {
						for (var j = 0; j < parseInt(piece); j++) {
							col++;
						}
					} else {
						var color = (piece >= 'a' && piece <= 'z') ? "black" : "white";
		                if (color == "white") {
							piece = pieceList.toLowerCase()[i];
		                }
		                switch (piece) {
		                    case 'p':
		                    	var piece = new Piece("pawn", Game.cols[col] + (8 - row), color);
		                        pieces.push(piece);
		                        pieceMap[col][row] = piece;
		                        break;
		                    case 'b':
		                    	var piece = new Piece("bishop", Game.cols[col] + (8 - row), color);
		                        pieces.push(piece);
		                        pieceMap[col][row] = piece;
		                        break;
		                    case 'n':
		                    	var piece = new Piece("knight", Game.cols[col] + (8 - row), color);
		                        pieces.push(piece);
		                        pieceMap[col][row] = piece;
		                        break;
		                    case 'r':
		                    	var piece = new Piece("rook", Game.cols[col] + (8 - row), color);
		                        pieces.push(piece);
		                        pieceMap[col][row] = piece;
		                        break;
		                    case 'q':
		                    	var piece = new Piece("queen", Game.cols[col] + (8 - row), color);
		                        pieces.push(piece);
		                        pieceMap[col][row] = piece;
		                        break;
		                    case 'k':
		                    	var piece = new Piece("king", Game.cols[col] + (8 - row), color);
		                        pieces.push(piece);
		                        pieceMap[col][row] = piece;
	                        	break;
		                }
		                col++;
					}
				}
			}

			if (parts[1] == "w") {
				var sideToMove = "white";
			} else {
				var sideToMove = "black"
			}

			return [pieces, pieceMap, sideToMove];
		}

		static createBoardElem = function () {
			var container = document.createElement("div");
			container.classList.add("game-container");

			var engineTimeContainer = document.createElement("div");
			var humanPlayerTimeContainer = document.createElement("div");
			engineTimeContainer.classList.add("time-container");
			humanPlayerTimeContainer.classList.add("time-container");

			container.append(engineTimeContainer);

			var boardContainer = document.createElement("div");
			boardContainer.classList.add("board-container");
			var table = document.createElement("table");
			table.className = "board";

			for (var i = 1; i < 9; i++) {
				var tr = document.createElement('tr');
				tr.dataset.line = i
				for (var j = 1; j < 9; j++) {
					var td = document.createElement('td');
					td.dataset.col = Game.cols[j - 1];
					td.dataset.line = i;
					td.dataset.index = ((8 - i) * 8) + j - 1
					td.className = (i % 2 == j % 2) ? "black square" : "white square";
					td.id = Game.cols[j - 1] + i;
					tr.appendChild(td);
				}
				table.insertBefore(tr, table.firstChild);
			}
			boardContainer.appendChild(table);
			container.appendChild(boardContainer);

			container.append(humanPlayerTimeContainer);

			return [container, boardContainer, engineTimeContainer, humanPlayerTimeContainer];
		}


		constructor(FEN, humanPlayer, timeControl) {
			this.humanPlayer = humanPlayer;
			this.gameEnded = false;
			this.currMove = 1;

			var time = parseInt(timeControl.split("|")[0]) * 60;
			this.increment = parseInt(timeControl.split("|")[1]);

			this.humanPlayerTime = time;
			this.engineTime = time;
			this.gameStarted = false;


			this.initGame(FEN, humanPlayer)
		};

		

		appendPieces = function () {
			for (var i = 0; i < this.pieces.length; i++) {
				this.elem.append(this.pieces[i].elem)
			}
		}
		updateBoard = function () {
			for (var i = 0; i < this.pieces.length; i++) {
				this.pieces[i].updatePosition();
			}
		}



		handleMove = function(move) {
			if (this.gameEnded) return;

			var moveStart = Game.squareToCoord((move[0] + move[1]));
			var moveEnd = Game.squareToCoord((move[2] + move[3]));
			// move indexes in 8x16 board
			var startIndex = moveStart[0] + (7 - moveStart[1]) * 16;
			var endIndex = moveEnd[0] + (7 - moveEnd[1]) * 16;

			for (var i = 0; i < this.possibleMoves.length; i++) {
				var possibleMove = Game.readMove(this.possibleMoves[i])
				if (startIndex == possibleMove[0] && endIndex == possibleMove[1]) {
					// can make moke
					if (!(this.possibleMoves[i] & Game.moveflagPromotion)) {
						this.engine.postMessage([2, [this.possibleMoves[i]], false])
					}
					this.makeMove(move, this.possibleMoves[i]);
					return true;
				}
			}
			return false;
		}

		makeMove = async function (move, engineMove) {
			if (this.gameEnded) return;
			if (!this.gameStarted) {
				this.gameStarted = true;
				this.previousTime = (new Date()).getTime();

				this.runClock();
			}

			// updates possible moves in position
			this.engine.postMessage([1, [], true]);
			await this.waitMessage().then((ans) => { this.possibleMoves = ans }, function() {})

			this.changeTurn();

			var moveStart = Game.squareToCoord((move[0] + move[1]));
			var moveEnd = Game.squareToCoord((move[2] + move[3]));

			this.pieceMap[moveStart[0]][7 - moveStart[1]].square = (move[2] + move[3]);
			this.pieceMap[moveStart[0]][7 - moveStart[1]].updatePosition()

			if (this.pieceMap[moveEnd[0]][7 - moveEnd[1]]) {
				this.pieceMap[moveEnd[0]][7 - moveEnd[1]].elem.remove();
				this.pieceMap[moveEnd[0]][7 - moveEnd[1]] = this.pieceMap[moveStart[0]][7 - moveStart[1]];
				this.pieceMap[moveStart[0]][7 - moveStart[1]] = undefined;
			} else {
				if (this.pieceMap[moveStart[0]][7 - moveStart[1]].type == "pawn") {
					if (engineMove & Game.moveflagEPC) { // en passant
						if (this.pieceMap[moveStart[0]][7 - moveStart[1]].color == "white") {
							this.pieceMap[moveEnd[0]][8 - moveEnd[1]].elem.remove();
							this.pieceMap[moveEnd[0]][8 - moveEnd[1]] = undefined;
						} else {
							this.pieceMap[moveEnd[0]][6 - moveEnd[1]].elem.remove();
							this.pieceMap[moveEnd[0]][6 - moveEnd[1]] = undefined;
						}
					}
				} else if (this.pieceMap[moveStart[0]][7 - moveStart[1]].type == "king") {
					if (moveStart[0] - moveEnd[0] == 2) { // castle queen
						this.pieceMap[moveStart[0] - 1][7 - moveStart[1]] = this.pieceMap[0][7 - moveStart[1]];
						this.pieceMap[0][7 - moveStart[1]] = undefined;
						this.pieceMap[moveStart[0] - 1][7 - moveStart[1]].square = "d" + (moveStart[1] + 1)
						this.pieceMap[moveStart[0] - 1][7 - moveStart[1]].updatePosition()
					} else if (moveStart[0] - moveEnd[0] == -2) { // castle king
						this.pieceMap[moveStart[0] + 1][7 - moveStart[1]] = this.pieceMap[7][7 - moveStart[1]];
						this.pieceMap[7][7 - moveStart[1]] = undefined;
						this.pieceMap[moveStart[0] + 1][7 - moveStart[1]].square = "f" + (moveStart[1] + 1)
						this.pieceMap[moveStart[0] + 1][7 - moveStart[1]].updatePosition()
					}
				}
				this.pieceMap[moveEnd[0]][7 - moveEnd[1]] = this.pieceMap[moveStart[0]][7 - moveStart[1]];
				this.pieceMap[moveStart[0]][7 - moveStart[1]] = undefined;
			}

			var flags = (engineMove & 0xFF0000);

			if (flags & Game.moveflagPromotion) { // promotion
				var piece = this.pieceMap[moveEnd[0]][7 - moveEnd[1]];
				piece.elem.remove()

				if (piece.color == this.humanPlayer) {
					var promoteTo = prompt("Promote piece to: ").toLowerCase() || "queen";

					switch (promoteTo) {
						case "knight":
							piece.type = "knight";
							this.engine.postMessage([4, [(engineMove | Game.moveflagPromoteKnight)], false]);
							break;
						case "rook":
							piece.type = "rook";
							this.engine.postMessage([4, [(engineMove | Game.moveflagPromotion)], false]);
							break;
						case "bishop":
							piece.type = "bishop";
							this.engine.postMessage([4, [(engineMove | Game.moveflagPromoteBishop)], false]);
							break;
						default:
							piece.type = "queen";
							this.engine.postMessage([4, [(engineMove | Game.moveflagPromoteQueen)], false]);
							piece.type = "queen";
					}
				} else {
					if (flags & Game.moveflagPromoteKnight) 
						piece.type = "knight";
					else if (flags & Game.moveflagPromoteQueen) 
						piece.type = "queen";
					else if (flags & Game.moveflagPromoteBishop) 
						piece.type = "bishop";
					else 
						piece.type = "rook";
				}

				piece.elem = piece.createPieceElem(piece.type, piece.color, piece.square)
				this.elem.append(piece.elem);
			}

			if (this.pieceMap[moveEnd[0]][7 - moveEnd[1]].color == "black") {
				this.currMove++;
			}

			if (this.pieceMap[moveEnd[0]][7 - moveEnd[1]].color == this.humanPlayer) {

			//	var nMoves = Math.max(this.currMove, 15);
			//	var factor = 2 - nMoves / 10;
			//	var target = this.engineTime / (80 - nMoves);
			//	var time = factor * target * 1000 + this.increment * 1000;
			//	console.log(time);

				// this equation for time management doesn't work well without increment when it get's too low on time
				var time = this.engineTime / 40 / Math.max(2 - Math.min(this.currMove / 20, 40 / this.currMove), 1) + this.increment;
				console.log(time);

				this.engine.postMessage([3, [time * 1000], true]);
				await this.waitMessage().then((ans) => { 
					if (ans[0] != undefined) {
						this.engine.postMessage([4, [ans[0]], false]);

						this.makeMove(Game.moveToNotation(ans[0]), ans[0])
					}

					if (ans[2]) {
						this.gameEnded = true;
						this.alert(ans[2]);
					}
				}, function() {})
			}
		}


		waitMessage = function() {
			return new Promise((resolve, reject) => {
				var functionCall = (e) => {
	       			resolve(e.data)
	       			// not at all a good way to do this I think but I don't know what else to do
	       			this.engine.removeEventListener("message", functionCall)
	       		}
	       		this.engine.addEventListener("message", functionCall)
	    	});
		}


		alert = function(message) {
			var alert = document.createElement("div");
			alert.classList.add("game-alert");
			alert.dataset.message = message;
			this.elem.append(alert);

			var again = document.createElement("a");
			again.classList.add("call-to-action");
			again.href = "/";
			again.innerText = "Jogar Novamente";
			this.elem.parentElement.append(again);
		}



		runClock = async function() {
			while (!this.gameEnded) {
				this.updateTimes()

				await sleep(10);
			}
		}

		changeTurn = function() {
			this.updateTimes();
			if (this.gameEnded) {
				return;
			}

			if (this.sideToMove == this.humanPlayer) {
				this.humanPlayerTime += this.increment;
			} else {
				this.engineTime += this.increment;
			}
			this.updateTimers();

			this.sideToMove = this.sideToMove == "white" ? "black" : "white";
		}

		updateTimes = function() {
			var currentTime = (new Date()).getTime();

			if (this.sideToMove == this.humanPlayer) {
				this.humanPlayerTime -= (currentTime - this.previousTime) / 1000;
				this.previousTime = currentTime;

				if (this.humanPlayerTime <= 0) {
					this.gameEnded = true;
					this.alert("Você perdeu no tempo.")
				}
			} else {
				this.engineTime -= (currentTime - this.previousTime) / 1000;
				this.previousTime = currentTime;

				if (this.engineTime <= 0) {
					this.gameEnded = true;
					this.alert("Você ganhou no tempo.")
				}
			}

			this.updateTimers();
		}

		updateTimers = function() {
			var time = Math.max(Math.ceil(this.engineTime), 0);
			var minutes = Math.floor(time / 60);
			var seconds = time % 60;

			this.engineTimeContainer.innerHTML = `
				<span class="time-holder">${minutes} : ${seconds.toString().length < 2 ? "0" + seconds : seconds}</span>
			`

			time = Math.max(Math.ceil(this.humanPlayerTime), 0);
			minutes = Math.floor(time / 60);
			seconds = time % 60;

			this.humanPlayerTimeContainer.innerHTML = `
				<span class="time-holder">${minutes} : ${seconds.toString().length < 2 ? "0" + seconds : seconds}</span>
			`
		}





		initGame = async function(FEN, humanPlayer) {
			this.engine = new Worker("engine.js");

			//	sets engine position
			this.engine.postMessage([0, [FEN], false]);

			var FENInfo = Game.FENreader(FEN, humanPlayer);

			var elements = Game.createBoardElem();
			this.elem = elements[1];
			this.container = elements[0];
			this.engineTimeContainer = elements[2];
			this.humanPlayerTimeContainer = elements[3];

			this.updateTimers();

			this.pieces = FENInfo[0];
			this.pieceMap = FENInfo[1];
			this.sideToMove = FENInfo[2];

			this.engine.postMessage([1, [], true]);
			await this.waitMessage().then((ans) => { this.possibleMoves = ans }, function() {})

			for (var i = 0; i < this.pieces.length; i++) {
				this.pieces[i].board = this;
			}
			this.appendPieces();

			this.elem.dataset.viewAs = humanPlayer// == "white" ? "black" : "white";

			if (humanPlayer != this.sideToMove) {
				this.engine.postMessage([3, [3500], true]);
				await this.waitMessage().then((ans) => { 
					if (ans[0] != undefined) {
						this.engine.postMessage([4, [ans[0]], false]);

						this.makeMove(Game.moveToNotation(ans[0]), ans[0])
					}

					if (ans[2]) {
						this.gameEnded = true;
						this.alert(ans[2]);
					}
				}, function() {})
			}
		}
	}

	class Piece{
		constructor(type, square, color) {
			this.type = type;
			this.square = square;
			this.cords = Game.squareToCoord(square);
			this.color = color;
			this.mouseIsDown = false;

			this.functionCallMove = this.mousemove.bind(this);
			this.functionCallUp = this.mouseup.bind(this);

			this.elem = this.createPieceElem(type, color, square);
		}


		updatePosition = function () {
			this.cords = Game.squareToCoord(this.square);
			this.elem.style.left = `${this.cords[0] * 12.5}%`;
			this.elem.style.bottom = `${(this.cords[1]) * 12.5}%`
		}

		mousedown = function (e) {

			if (this.board.gameEnded) return;

			if (this.mouseIsDown || this.color != this.board.sideToMove || this.color != this.board.humanPlayer){
				return;
			}

			if (this == this.board.selectedPiece) {
				window.addEventListener("pointermove", this.functionCallMove);
			} else {
				if (this.board.selectedPiece) {
					this.board.selectedPiece.toggleHighlight(this.board.selectedPiece.moveStart);
					window.removeEventListener("pointerup", this.board.selectedPiece.functionCallUp);
					this.board.selectedPiece.elem.style.zIndex = "1";
					this.board.selectedPiece = null;
				}

				this.mouseIsDown = true;

				this.board.selectedPiece = this;

				this.moveStart = this.square;
				this.toggleHighlight(this.moveStart);

				window.addEventListener("pointermove", this.functionCallMove);
				window.addEventListener("pointerup", this.functionCallUp);
				this.elem.style.zIndex = "100";
			}

			var parent = this.board.elem;

			var boardStyle = parent.getBoundingClientRect()
			var x = e.clientX - boardStyle.left;
			var y = e.clientY - boardStyle.top;

			if (parent.dataset.viewAs == "white") {
				this.elem.style.left = `${x - boardStyle.width / 16}px`;
				this.elem.style.bottom = `${(boardStyle.height - y) - boardStyle.height / 16}px`
			} else {
				this.elem.style.left = `${boardStyle.width - x - boardStyle.width / 16}px`;
				this.elem.style.bottom = `${y - boardStyle.height / 16}px`
			}
		}
		mousemove = function (e) {
			var parent = this.board.elem

			var boardStyle = parent.getBoundingClientRect()
			var x = e.clientX - boardStyle.left;
			var y = e.clientY - boardStyle.top;

			if (this.board.elem.dataset.viewAs == "white") {
				this.elem.style.left = `${x - boardStyle.width / 16}px`;
				this.elem.style.bottom = `${(boardStyle.height - y) - boardStyle.height / 16}px`
			} else {
				this.elem.style.left = `${boardStyle.width - x - boardStyle.width / 16}px`;
				this.elem.style.bottom = `${y - boardStyle.height / 16}px`
			}
		}
		mouseup = function (e) {
			this.mouseIsDown = false;
			var cols = {1:"a", 2:"b", 3:"c", 4:"d", 5:"e", 6:"f", 7:"g", 8:"h"};

			window.removeEventListener("pointermove", this.functionCallMove);
			this.updatePosition()

			var parent = this.board.elem;
			var boardStyle = parent.getBoundingClientRect()
			var left = e.clientX - boardStyle.left;
			var top = e.clientY - boardStyle.top;

			if (this.board.elem.dataset.viewAs == "white") {
				var newX = Math.floor(((left / boardStyle.width) * 8) + 1);
				var newY = Math.floor(9 - ((top / boardStyle.width) * 8));
			} else {
				var newX = Math.floor(9 - ((left / boardStyle.width) * 8));
				var newY = Math.floor(((top / boardStyle.width) * 8) + 1);
			}

			if (this.square == cols[newX] + newY) {
				return;
			}

			this.toggleHighlight(this.moveStart);
			window.removeEventListener("pointerup", this.functionCallUp);
			this.elem.style.zIndex = "1";
			this.board.selectedPiece = null;
			
			if ((newX > 0 && newX < 9 && newY > 0 && newY < 9) && (this.moveStart != cols[newX] + newY)) {
				(!this.board.handleMove(this.moveStart + (cols[newX] + newY)) && this.updatePosition())
			}
		}


		toggleHighlight = function (startSquare) {
			var cols = {1:"a", 2:"b", 3:"c", 4:"d", 5:"e", 6:"f", 7:"g", 8:"h"}
			var moveStart = Game.squareToCoord(startSquare);
			// move indexes in 8x16 board
			var startIndex = moveStart[0] + (7 - moveStart[1]) * 16;

			for (var i = 0; i < this.board.possibleMoves.length; i++) {
				var possibleMove = Game.readMove(this.board.possibleMoves[i])
				if (startIndex == possibleMove[0]) {
					var move = Game.getCoordinatesFromIndex(possibleMove[1])
					var square = cols[move[1] + 1] + (move[0] + 1)
					document.getElementById(square).classList.toggle('highlight');
				}
			}
		}




		createPieceElem = function (type, color, square) {
			var piece = document.createElement("div");
			piece.classList.add(color, type, "piece");
			piece.id = "piece-" + square;

			piece.addEventListener("pointerdown", this.mousedown.bind(this))

			var bgImg = "";
			if (color == "white")
				bgImg += "w";
			else
				bgImg += "b"

			switch(type) {
				case "pawn":
					bgImg += "P";
					break;
				case "knight":
					bgImg += "N";
					break;
				case "bishop":
					bgImg += "B";
					break;
				case "rook":
					bgImg += "R";
					break;
				case "queen":
					bgImg += "Q";
					break;
				case "king":
					bgImg += "K";
					break;
			}

			piece.style.backgroundImage = "url('chess pieces/" + bgImg + ".png')";
			piece.style.left = `${this.cords[0] * 12.5}%`;
			piece.style.bottom = `${(this.cords[1]) * 12.5}%`
			return piece;
		}
	}


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}