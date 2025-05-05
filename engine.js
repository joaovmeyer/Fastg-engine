	
	// move generetion
	// engine starts on line 894


	// 0x88 board representation
	var board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			   	 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			   	 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			   	 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			   	 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			   	 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			   	 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			   	 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]


	// i >> 3 << 4 | i & 7 -> transform 8x8 index to 8x16 index

	var cols = {0:"a", 1:"b", 2:"c", 3:"d", 4:"e", 5:"f", 6:"g", 7:"h"}

	var moveflagEPC = 0x2 << 16;
	var moveflagCastleKing = 0x4 << 16;
	var moveflagCastleQueen = 0x8 << 16;
	var moveflagPromotion = 0x10 << 16;
	var moveflagPromoteKnight = 0x20 << 16;
	var moveflagPromoteQueen = 0x40 << 16;
	var moveflagPromoteBishop = 0x80 << 16;

	var colorBlack = 0x10;
	var colorWhite = 0x08;

	var pieceEmpty = 0x00;
	var piecePawn = 0x01;
	var pieceKnight = 0x02;
	var pieceBishop = 0x03;
	var pieceRook = 0x04;
	var pieceQueen = 0x05;
	var pieceKing = 0x06;

	var turn = colorWhite;
	var lastMoves = [];

	var castleRights = 0;
	var castleRightsMask = [ 
		 7,15,15,15, 3,15,15,11, 0, 0, 0, 0, 0, 0, 0, 0,
		15,15,15,15,15,15,15,15, 0, 0, 0, 0, 0, 0, 0, 0,
		15,15,15,15,15,15,15,15, 0, 0, 0, 0, 0, 0, 0, 0,
		15,15,15,15,15,15,15,15, 0, 0, 0, 0, 0, 0, 0, 0,
		15,15,15,15,15,15,15,15, 0, 0, 0, 0, 0, 0, 0, 0,
		15,15,15,15,15,15,15,15, 0, 0, 0, 0, 0, 0, 0, 0,
		15,15,15,15,15,15,15,15, 0, 0, 0, 0, 0, 0, 0, 0,
		13,15,15,15,12,15,15,14, 0, 0, 0, 0, 0, 0, 0, 0,]

	var enPassantSquare;
	var isInCheck;
	var mustMoveTo;

	var hashKey;
	// pieceKeys have one pseudo random value for each piece for each square of the board, so that's why
	// 13 * 128, it's 12 piece types for all 128 squares on the board + 128 en passant squares.
	var pieceKeys = new Array(12 * 64);
	var castleKeys = new Array(16);
	var sideKey;

	var TTMaxSize = 838860;
	var repetitionTable = [];


	function getLegalMoves(color = turn, capturesOnly) {
		// clears pin information
		for (var i = 0; i < 64; i++) {
			board[i >> 3 << 4 | i & 7 | 8] = 0;
		}

		var checksAndPins = findCheckAndPins(board.indexOf(color | pieceKing), color);
		var oppositeColor = color ^ 24;
		isInCheck = !!checksAndPins[0];
		mustMoveTo = checksAndPins[1];
		var moves = [];

		if (checksAndPins[0] < 2) {
			for (var i = 0; i < 64; i++) {
				var index = i >> 3 << 4 | i & 7;
				if ((board[index] & color) == color) {
					var piece = board[index];

					switch (piece & 0x7) {
						case piecePawn: pieceMoves = pawnMoves(color, index); break;
						case pieceKnight: pieceMoves = knightMoves(color, index); break;
						case pieceKing: pieceMoves = kingMoves(color, index); break;
						default: pieceMoves = slidingPieceMoves(color, index, piece & 0x7);
					}
					moves = moves.concat(pieceMoves);
				}
			}
		} else { // when in double check only the king can move
			moves = kingMoves(color, board.indexOf((color | pieceKing)));
		}

		if (capturesOnly) {
			var i = 0;
			while (i < moves.length) {
				if (board[(moves[i] >> 8) & 0xFF] == 0) {
					moves.splice(i, 1);
					continue;
				}
				i++;
			}
		}

		return moves;
	}


	function moveToNotation(move) {
		var move = readMove(move);
		var start = getCoordinatesFromIndex(move[0]);
		var end = getCoordinatesFromIndex(move[1]);

		if (move[2] & moveflagPromotion) {
		    if (move[2] & moveflagPromoteKnight) 
		        newPiece = "=N";
		    else if (move[2] & moveflagPromoteQueen) 
		        newPiece = "=Q";
		    else if (move[2] & moveflagPromoteBishop) 
		        newPiece = "=B";
		    else 
		        newPiece ="=R";

		} else {
			var newPiece = "";
		}
	/*	if (move[2] & moveflagCastleKing) {
			return "O-O"
		} else if (move[2] & moveflagCastleQueen) {
			return "O-O-O"
		}*/

		return cols[start[1]] + (start[0] + 1) + cols[end[1]] + (end[0] + 1) + newPiece;
	}


	function perft(depth) {
		var n_moves = {};

		var moves = getLegalMoves(turn);
		var total = 0;

		if (depth == 1 || moves.length == 0) {
			return moves.length;
		}


		for (var i = 0; i < moves.length; i++) {
		//	total++
			makeMove(moves[i]);
			var res = perft(depth - 1);
			total += res
			unmakeMove();
		}

		return total;
	}

	function perfts(from, to) {
		for (from; from <= to; from++) {
			var start = performance.now();
			console.log(`perft(${from}) -> ${perft(from)}. Time taken: ${((performance.now() - start) / 1000).toFixed(3)} seconds`)
		}
	}

	function divide(depth) {
		var movesInPosition = getLegalMoves(turn);
		var totalPositions = 0;
		for (var i = 0; i < movesInPosition.length; i++) {
			makeMove(movesInPosition[i]);
			var result = perft(depth - 1);
			totalPositions += result;
			console.log(moveToNotation(movesInPosition[i]) + ": " + result)
			unmakeMove()
		}

		return totalPositions;
	}

	function testMoveGen(depth, iterations) {
		var moves;
		var now = performance.now();

		for (var i = 0; i < iterations; i++) {
			moves = perft(depth);
		}

		var totalTime = performance.now() - now;
		var time = (totalTime / iterations) / 1000;

		return `${Math.floor(moves / time)} moves per second, or about ${time.toFixed(3)} seconds per perft(${depth})`
	}


	function findCheckAndPins(kingIndex, color) {
		var position = kingIndex;
		var oppColor = (color & 8) + 8;;
		var checks = 0;
		var attackLine = [];

		// find sliding piece checks or pins
		var directions = [[15, 17, -15, -17, pieceBishop], [16, -16, 1, -1, pieceRook]];

		for (var i = 0; i < 2; i++) {
			for (var j = 0; j < 4; j++) {
				var delta = directions[i][j]
				var line = []

				while (!((position + delta) & 0x88)) {
					line.push(position + delta);
					if (board[position + delta] != 0) {
						// we hitted a piece
						var piece = board[position + delta];
						if ((piece & oppColor) == oppColor) {
							if ((piece & 0x07) == directions[i][4] || (piece & 0x07) == pieceQueen) {
								// king is in check
								checks++;
								attackLine = attackLine.concat(line);
							}
						} else {
							// piece is not enemy, so find if it is pinned
							findPin(oppColor, directions[i][j], position + delta, directions[i][4])
						}
						break;
					}
					delta += directions[i][j];
				}
			}
		}

		// find knight checks
		var deltas = [31, 33, 14, -14, -31, -33, 18, -18]
	   
	    for (var i = 0; i < 8; i++) {
	        var curPos = position + deltas[i];
	        if (!(curPos & 0x88) && board[curPos] == (oppColor | pieceKnight)) {
	        	checks++;
	        	attackLine.push(curPos)
	        }
	    }

	    // find pawn checks
	    var curPos = color == colorWhite ? position - 16 : position + 16;
	    var oppColorPawn = (oppColor | piecePawn);
	    if (!((curPos + 1) & 0x88) && board[curPos + 1] == oppColorPawn) {
			checks++;
			attackLine.push(curPos + 1)
		} else if (!((curPos - 1) & 0x88) && board[curPos - 1] == oppColorPawn) {
			checks++;
			attackLine.push(curPos - 1)
		}

		return [checks, attackLine];
	}

	function findPin(oppColor, direction, start, pinnerPiece) {
		var delta = direction;
		while (!((start + delta) & 0x88)) {
			if (board[start + delta] != 0) {
				var piece = board[start + delta]
				if (piece == (oppColor | pinnerPiece) || piece == (oppColor | pieceQueen)) {
					board[start + 8] = direction;
				}
				return;
			}
			delta += direction;
		}
	}

	function validateMove(move, color) {
		makeMove(move)
		var kingPosition = board.indexOf((color | pieceKing));
		var oppColor = color ^ 24;

		// find sliding piece checks or pins
		var directions = [[15, 17, -15, -17, pieceBishop], [16, -16, 1, -1, pieceRook]];

		for (var i = 0; i < directions.length; i++) {
			for (var j = 0; j < 4; j++) {
				var delta = directions[i][j]
				while (!((kingPosition + delta) & 0x88)) {
					if (board[kingPosition + delta] != 0) {
						// we hitted a piece
						var piece = board[kingPosition + delta];
						if (piece == (oppColor | directions[i][4]) || piece == (oppColor | pieceQueen)) {
							// king is in check
							unmakeMove();
							return false;
						} 
						break;
					}
					delta += directions[i][j];
				}
			}
		}

		// find knight checks
		var deltas = [31, 33, 14, -14, -31, -33, 18, -18]
		   
		for (var i = 0; i < 8; i++) {
			var curPos = kingPosition + deltas[i];
			if (!(curPos & 0x88) && board[curPos] == (oppColor | pieceKnight)) {
				unmakeMove();
				return false;
			}
		}

	    // find pawn checks
	    var curPos = color == colorWhite ? kingPosition - 16 : kingPosition + 16;
	    var oppColorPawn = (oppColor | piecePawn);
	    if (!((curPos + 1) & 0x88) && board[curPos + 1] == oppColorPawn) {
			unmakeMove();
	        return false;
		} else if (!((curPos - 1) & 0x88) && board[curPos - 1] == oppColorPawn) {
			unmakeMove();
	        return false;
		}

		// find king checks
		var kingCords = getCoordinatesFromIndex(board.indexOf((color | pieceKing)))
		var oppKingCords = getCoordinatesFromIndex(board.indexOf(((color ^ 24) | pieceKing)));

		unmakeMove();
		return ((kingCords[0] - oppKingCords[0]) ** 2 > 1 || (kingCords[1] - oppKingCords[1]) ** 2 > 1);
	}


	function isSquareAttacked(index, color) {
		var position = index;
		var oppColor = color ^ 24;
		var checks = 0;

		// find sliding piece checks or pins
		var directions = [[15, 17, -15, -17, pieceBishop], [16, -16, 1, -1, pieceRook]];

		for (var i = 0; i < 2; i++) {
			for (var j = 0; j < 4; j++) {
				var delta = directions[i][j]

				while (!((position + delta) & 0x88)) {
					if (board[position + delta] != 0) {
						// we hitted a piece
						var piece = board[position + delta];
						if ((piece & oppColor) == oppColor && ((piece & 0x07) == directions[i][4] || (piece & 0x07) == pieceQueen)) {
							// king is in check
							return true;
						}
						break;
					}
					delta += directions[i][j];
				}
			}
		}

		// find knight checks
		var deltas = [31, 33, 14, -14, -31, -33, 18, -18]
	   
	    for (var i = 0; i < 8; i++) {
	        var curPos = position + deltas[i];
	        if (!(curPos & 0x88) && board[curPos] == (oppColor | pieceKnight)) {
	        	return true
	        }
	    }

	    // find pawn checks
	    var curPos = color == colorWhite ? position - 16 : position + 16;
	    var oppColorPawn = (oppColor | piecePawn);
	    if (!((curPos + 1) & 0x88) && board[curPos + 1] == oppColorPawn) {
			return true
		} else if (!((curPos - 1) & 0x88) && board[curPos - 1] == oppColorPawn) {
			return true
		}

		return false;
	}

















	function FENreader(FEN) {
		var parts = FEN.split(" ")
		var pieceList = parts[0]
		var row = 0, col = 0;

		for (var i = 0; i < 256; i++) {
			if (!(i & 0x88)) {
        		board[i] = 0x80;
        	}
		}

		for (var i = 0; i < pieceList.length; i++) {
			var piece = pieceList[i];
			if (piece == "/") {
				row++;
				col = 0;
			} else {
				if (piece >= "0" && piece <= "9") {
					for (var j = 0; j < parseInt(piece); j++) {
						board[(row * 16) + col] = 0;
						col++;
					}
				} else {
					var isBlack = piece >= 'a' && piece <= 'z';
	                var pieceVal = isBlack ? colorBlack : colorWhite;
	                if (!isBlack) {
						piece = pieceList.toLowerCase()[i];
	                }
	                switch (piece) {
	                    case 'p':
	                        pieceVal |= piecePawn;
	                        break;
	                    case 'b':
	                        pieceVal |= pieceBishop;
	                        break;
	                    case 'n':
	                        pieceVal |= pieceKnight;
	                        break;
	                    case 'r':
	                        pieceVal |= pieceRook;
	                        break;
	                    case 'q':
	                        pieceVal |= pieceQueen;
	                        break;
	                    case 'k':
	                        pieceVal |= pieceKing;
	                        break;
	                }

	                board[(row * 16) + col] = pieceVal;
	                col++;
				}
			}
		}
		turn = parts[1] == "w" ? colorWhite : colorBlack;

		castleRights = 0;

		if (parts[2].indexOf('K') != -1) { 
	        castleRights |= 1;
	    }
	    if (parts[2].indexOf('Q') != -1) {
	        castleRights |= 2;
	    }
	    if (parts[2].indexOf('k') != -1) {
	        castleRights |= 4;
	    }
	    if (parts[2].indexOf('q') != -1) {
	        castleRights |= 8;
	    }

	    initRandomKeys()
		hashKey = generateHashKey();
		initHashTable()
		repetitionTable.length = 0;
		repetitionTable.push(hashKey)
	}

	FENreader("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
//	FENreader("k7/8/8/8/8/8/8/7K w - - 0 1")



	function makeMove(move) {
		if (move == undefined) return;
		var moveParts = readMove(move);
		var from = moveParts[0];
		var to = moveParts[1];
		var flags = moveParts[2];

		var pieceCaptured = board[to];
		if (pieceCaptured != 0) {
			// remove captured piece from hash key
			var pieceType = (pieceCaptured & 0x07);
			var pieceColor = (pieceCaptured & ~0x07)
			hashKey ^= pieceKeys[(pieceType + (pieceColor / 8 - 1) * 6) * 64 + to];
		}

		// remove moved piece from initial square and add to ending square
		var pieceType = (board[from] & 0x07);
		var pieceColor = (board[from] & ~0x07)

		hashKey ^= pieceKeys[(pieceType + (pieceColor / 8 - 1) * 6) * 64 + from];
		hashKey ^= pieceKeys[(pieceType + (pieceColor / 8 - 1) * 6) * 64 + to];

		board[to] = board[from]
		board[from] = 0;

		if (flags) {
			if ((flags & moveflagEPC) == moveflagEPC) {
				var EPCcapture = turn == colorWhite ? to + 16 : to - 16;
				pieceCaptured = board[EPCcapture];

				// remove captured pawn
				var pieceType = (pieceCaptured & 0x07);
				var pieceColor = (pieceCaptured & ~0x07)
				hashKey ^= pieceKeys[(pieceType + (pieceColor / 8 - 1) * 6) * 64 + EPCcapture];

				board[EPCcapture] = 0;
			}  else if (flags & moveflagPromotion) {

				// remove pawn
				hashKey ^= pieceKeys[((board[to] & 0x07) + ((board[to] & ~0x07) / 8 - 1) * 6) * 64 + to];

				var newPiece = board[to] & (~0x7);
		        if (flags & moveflagPromoteKnight) 
		            newPiece |= pieceKnight;
		        else if (flags & moveflagPromoteQueen) 
		            newPiece |= pieceQueen;
		        else if (flags & moveflagPromoteBishop) 
		            newPiece |= pieceBishop;
		        else 
		            newPiece |= pieceRook;

		        board[to] = newPiece;

		        // add promoted piece
				hashKey ^= pieceKeys[((newPiece & 0x07) + ((newPiece & ~0x07) / 8 - 1) * 6) * 64 + to];
			} else if (flags & moveflagCastleKing) {
				var rook = board[to + 1];
				// remove rook and add to correct square
				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to + 1];
				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to - 1];

				board[to - 1] = rook;
				board[to + 1] = 0;
			} else { // castle queenside
				var rook = board[to - 2];
				// remove rook and add to correct square
				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to - 2];
				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to + 2];

				board[to + 1] = rook;
				board[to - 2] = 0;
			}
		}

		lastMoves.push([move, pieceCaptured, castleRights]);

		// update castle rights
		hashKey ^= castleKeys[castleRights]
		castleRights &= castleRightsMask[from] & castleRightsMask[to]
		hashKey ^= castleKeys[castleRights]

		// switch side to move
		turn = turn ^ 24;
		hashKey ^= sideKey

		// add new position to repetition table
		repetitionTable.push(hashKey);
	}

	function unmakeMove() {
		var move = lastMoves.pop();
		repetitionTable.length--;
		var moveParts = readMove(move[0])
		var from = moveParts[0];
		var to = moveParts[1];
		var flags = moveParts[2];
		var pieceCaptured = move[1]

		// remove moved piece from end square and add to starting square
		hashKey ^= pieceKeys[((board[to] & 0x07) + ((board[to] & ~0x07) / 8 - 1) * 6) * 64 + to];
		if (!(flags & moveflagPromotion)) {
			hashKey ^= pieceKeys[((board[to] & 0x07) + ((board[to] & ~0x07) / 8 - 1) * 6) * 64 + from];
		}
		// add captured piece back
		if (pieceCaptured != 0 && !(flags & moveflagEPC)) {
			var pieceType = (pieceCaptured & 0x07);
			var pieceColor = (pieceCaptured & ~0x07)
			hashKey ^= pieceKeys[(pieceType + (pieceColor / 8 - 1) * 6) * 64 + to];
		}

		board[from] = board[to];
		board[to] = pieceCaptured;

		if (flags) {
			if (flags & moveflagEPC) {
				board[to] = 0;
				var EPCcapture = turn == colorWhite ? to - 16 : to + 16;
				board[EPCcapture] = pieceCaptured;

				var pieceType = (pieceCaptured & 0x07);
				var pieceColor = (pieceCaptured & ~0x07)
				hashKey ^= pieceKeys[(pieceType + (pieceColor / 8 - 1) * 6) * 64 + EPCcapture]
			} else if (flags & moveflagPromotion) {
				board[from] = ((board[from] & (~0x7)) | piecePawn);
				hashKey ^= pieceKeys[((board[from] & 0x07) + ((board[from] & ~0x07) / 8 - 1) * 6) * 64 + from];
			} else if (flags & moveflagCastleKing) {
				var rook = board[to - 1];

				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to - 1];
				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to + 1];

				board[to + 1] = rook;
				board[to - 1] = 0;
			} else { // castle queenside
				var rook = board[to + 1];

				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to + 2];
				hashKey ^= pieceKeys[((rook & 0x07) + ((rook & ~0x07) / 8 - 1) * 6) * 64 + to - 2];

				board[to - 2] = rook;
				board[to + 1] = 0;
			}
		}

		hashKey ^= castleKeys[castleRights]
		castleRights = move[2];
		hashKey ^= castleKeys[castleRights]

		turn = turn ^ 24;
		hashKey ^= sideKey;
	}












	function addPromotionMoves(start, finish, movesList) {
		movesList.push(generateMove(start, finish, (moveflagPromotion | moveflagPromoteQueen)));
        movesList.push(generateMove(start, finish, (moveflagPromotion | moveflagPromoteKnight)));
        movesList.push(generateMove(start, finish, (moveflagPromotion | moveflagPromoteBishop)));
        movesList.push(generateMove(start, finish, moveflagPromotion));
	}

	function getCoordinatesFromIndex(index) {
		return [7 - (index >> 4), index & 15]
	}
	function getIndexFromCoordinates(row, column) {
		return (row << 4) | column;
	}

	function generateMove(from, to, flags) {
    	return from | (to << 8) | flags;
	}
	//	flags = move & 0xFF0000
	//	from = move & 0xFF
	//	to = (move >> 8) & 0xFF

	function readMove(move) {
		return [move & 0xFF, (move >> 8) & 0xFF, move & 0xFF0000]
	}


	function knightMoves(color, position) {
		if (board[position + 8] != 0) {
	    	return [];
	    }

		var deltas = [31, 33, 14, -14, -31, -33, 18, -18]
	    var moves = [];

		if (mustMoveTo.length > 0) {
		    for (var i = 0; i < mustMoveTo.length; i++) {
		    	if (deltas.indexOf(position - mustMoveTo[i]) > -1) {
		    		moves.push(generateMove(position, mustMoveTo[i]))
		    	}
		    }
			return moves;
		}
	   
	    for (var i = 0; i < 8; i++) {
	        var curPos = position + deltas[i];

	        if (!(curPos & 0x88) && (board[curPos] & color) != color) {
	        	moves.push(generateMove(position, curPos))
	        }
	    }
	   
	    return moves;
	}

	function pawnMoves(color, position) {
		var direction = color == colorWhite ? -16 : 16;
		var curPos = position + direction;

		var canPush = true;
		var canCaptureLeft = true;
		var canCaptureRight = true;
		// if color is black capturing left turns right and right turns left

		if (board[position + 8] != 0) {
			if (mustMoveTo.length > 0) {
				return [];
			}
			var pinDirection = board[position + 8] * board[position + 8];
			if (pinDirection == 1) {
				return []
			}
			if (pinDirection == 256) {
				canCaptureRight = false;
				canCaptureLeft = false;
			} else if (pinDirection == 225) {
				canPush = false;
				canCaptureLeft = false;
			} else { // pin direction is equal to 289 (17, -17)
				canPush = false;
				canCaptureRight = false;
			}
		}

		var moves = [];

		// push
		if (board[curPos] == 0 && canPush) {
			var row = (position >> 4) * direction
			if ((curPos >> 4) == 0 || (curPos >> 4) == 7) {
				addPromotionMoves(position, curPos, moves);
			} else {
				moves.push(generateMove(position, curPos))
				// double push
				if (board[curPos + direction] == 0 && (row == 16 || row == -96)) {
					moves.push(generateMove(position, curPos + direction))
				}
			}
		}
		// cauptures
		if (((canCaptureRight && color == colorWhite) || (canCaptureLeft && color == colorBlack)) 
			&& !((curPos + 1) & 0x88) && board[curPos + 1] != 0 && (board[curPos + 1] & color) != color) {
			if ((curPos >> 4) == 0 || (curPos >> 4) == 7) {
				addPromotionMoves(position, curPos + 1, moves)
			} else {
				moves.push(generateMove(position, curPos + 1))
			}
		}
		if (((canCaptureLeft && color == colorWhite) || (canCaptureRight && color == colorBlack)) // 
			&& !((curPos - 1) & 0x88) && board[curPos - 1] != 0 && (board[curPos - 1] & color) != color) {
			if ((curPos >> 4) == 0 || (curPos >> 4) == 7) {
				addPromotionMoves(position, curPos - 1, moves)
			}	 else {		
				moves.push(generateMove(position, curPos - 1))
			}
		}
		// en passant
		var lastMove = lastMoves[lastMoves.length - 1];
		if (lastMove) {
			var lastFrom = (lastMove[0] & 0xFF);
			var lastTo = (lastMove[0] >> 8);
			if ((board[lastTo] & 0x07) == piecePawn && lastFrom - lastTo == direction * 2 && (lastTo - position) * (lastTo - position) == 1) {
				var move = generateMove(position, curPos + (lastTo - position), moveflagEPC)
				if (validateMove(move, color)) { // validade every en passant move just cause they are annoying
					moves.push(move)
				}
			}
		}

		if (mustMoveTo.length > 0) {
			var validatedMoves = []
			for (var i = 0; i < moves.length; i++) {
				if ((moves[i] & 0xFF0000) == moveflagEPC || mustMoveTo.indexOf((moves[i] >> 8) & 0xFF) > -1) {
					validatedMoves.push(moves[i])
				}
			}

			return validatedMoves;
		}

		return moves;
	}

	function kingMoves(color, position) {
		var directions = [-15, -16, -17, -1, 1, 15, 16, 17]
		var moves = [];
		var validatedMoves = [];

		for (var i = 0; i < directions.length; i++) {
			var curPos = position + directions[i];

			if (!(curPos & 0x88) && (board[curPos] & color) != color) {
				moves.push(generateMove(position, curPos))
			}
		}

		for (var i = 0; i < moves.length; i++) {
			if (validateMove(moves[i], color)) {
				validatedMoves.push(moves[i])
			}
		}

		// castle
		if (color == colorWhite) {
			var kingside = 1, queenside = 2;
		} else {
			var kingside = 4, queenside = 8;
		}

		if ((castleRights & kingside) && !isInCheck 
			&& validatedMoves.indexOf(generateMove(position, position + 1)) > -1 
			&& board[position + 1] + board[position + 2] == 0 
			&& validateMove(generateMove(position, position + 2), color)) {
				// castle kingside
				validatedMoves.push(generateMove(position, position + 2, moveflagCastleKing))
		}
		if ((castleRights & queenside) && !isInCheck
			&& validatedMoves.indexOf(generateMove(position, position - 1)) > -1 
			&& board[position - 1] + board[position - 2] + board[position - 3] == 0 
			&& validateMove(generateMove(position, position - 2), color)) {
			// castle queenside
			validatedMoves.push(generateMove(position, position - 2, moveflagCastleQueen))
		}

		return validatedMoves;
	}

	function slidingPieceMoves(color, position, piece) {
		if (piece == pieceBishop) {
			var directions = [15, 17, -15, -17]
		} else if (piece == pieceRook) {
			var directions = [16, -16, 1, -1]
		} else {
			// queen
			var directions = [16, -16, 1, -1, 15, 17, -15, -17]
		}

		if (board[position + 8] != 0) {
			if (mustMoveTo.length > 0) {
				return [];
			}
			var i = 0;
			while (i < directions.length) {
				// remove directions not in the pin line
				if (!(directions[i] == board[position + 8] || directions[i] + board[position + 8] == 0)) {
					directions.splice(i, 1);
					continue;
				}
				i++;
			}
		}

		var oppositeColor = color ^ 24;

		var moves = []

		for (var i = 0; i < directions.length; i++) {
			var delta = directions[i]

			while (!((position + delta) & 0x88)) {
				var curPos = position + delta
				if (board[curPos] != 0) {
					// hitted a piece
					if (!((board[curPos] & color) == color)) {
						// piece is of opposite color
						moves.push(generateMove(position, curPos))
					}
					break;
				}
				moves.push(generateMove(position, curPos))
				delta += directions[i];
			}
		}

		if (mustMoveTo.length > 0) {
			var validatedMoves = []
			for (var i = 0; i < moves.length; i++) {
				if (mustMoveTo.indexOf((moves[i] >> 8) & 0xFF) > -1) {
					validatedMoves.push(moves[i])
				}
			}

			return validatedMoves;
		}

		return moves
	}




	// trying to make some sort of zobrist hashing



	var randomState = 1804289383;

	// generate 32-bit pseudo legal numbers
	function random() {
		var number = randomState;
		    
		// 32-bit XOR shift
		number ^= number << 13;
		number ^= number >> 17;
		number ^= number << 5;
		randomState = number;

		return number;
	}
  
	// init random hash keys
	function initRandomKeys() {
		for (var index = 0; index < 13 * 64; index++) {
			pieceKeys[index] = random();
		}
		for (var index = 0; index < 16; index++) {
			castleKeys[index] = random();
		}
		sideKey = random();
	}
  
	// generate hash key
	function generateHashKey() {
		var finalKey = 0;
	    
		// hash board position
		for (var i = 0; i < 64; i++) {
			var square = i >> 3 << 4 | i & 7;
			var piece = board[square];
			if (piece != 0) {
				var pieceType = (piece & 0x07);
				var pieceColor = (piece & ~0x07)
				finalKey ^= pieceKeys[(pieceType + (pieceColor / 8 - 1) * 6) * 64 + i];
			}
		}
	    
		// hash board state variables
		if (turn == colorWhite) {
			finalKey ^= sideKey;
		}
		if (enPassantSquare != null) {
			finalKey ^= pieceKeys[(enPassantSquare)];
		}
		finalKey ^= castleKeys[castleRights];
	    
		return finalKey;
	}



	// hash table. Thanks to wukongJS and https://web.archive.org/web/20071031100051/http://www.brucemo.com/compchess/programming/hashing.htm


 	// 32Mb hash table
	var hashEntries = 1677721;    

	// no hash entry found constant
	const noHashEntry = 100000;

	// transposition table hash flags
	const HASH_EXACT = 0;
	const HASH_ALPHA = 1;
	const HASH_BETA = 2;

	// define TT instance
	var hashTable = [];
  
	// set hash size
	function setHashSize(Mb) {
    	hashTable = [];
    
    	// adjust MB if going beyond the aloowed bounds
    	if(Mb < 4) Mb = 4;
    	if(Mb > 128) Mb = 128;
    
    	hashEntries = parseInt(Mb * 0x100000 / 20);
    	initHashTable();
    
    	console.log('Set hash table size to', Mb, 'Mb');
    	console.log('Hash table initialized with', hashEntries, 'entries');
	}
  
	// clear TT (hash table)
	function initHashTable() {
    	// loop over TT elements
    	for (var index = 0; index < hashEntries; index++) {
      		// reset TT inner fields
      		hashTable[index] = {
        		hashKey: 0,
        		depth: 0,
        		flag: 0,
        		score: 0,
        		bestMove: 0,
        		age: 0
      		}
    	}
	}

	function ageHashTable() {
		for (var index = 0; index < hashEntries; index++) {
      		// increase age
      		hashTable[index].age++;
    	}
	}




	// read hash entry data
	function readHashEntry(alpha, beta, bestMove, depth) {
    	// init hash entry
    	var hashEntry = hashTable[getHashIndex(hashKey)];

    	// match hash key
    	if (hashEntry.hashKey == hashKey) {
      		if (hashEntry.depth >= depth && hashEntry.age < 10) {
        		// init score
        		var score = hashEntry.score;
        
        		// adjust mating scores
        		if (score < -mateValue) score += searchPly;
        		if (score > mateValue) score -= searchPly;
        
        		// match hash flag
        		if (hashEntry.flag == HASH_EXACT) return [score, hashEntry.bestMove];
        		if ((hashEntry.flag == HASH_ALPHA) && (score <= alpha)) return [alpha, hashEntry.bestMove];
        		if ((hashEntry.flag == HASH_BETA) && (score >= beta)) return [beta, hashEntry.bestMove];
      		}

      		// store best move
      		bestMove = hashEntry.bestMove;
    	}
    
    	// if hash entry doesn't exist
    	return [noHashEntry, undefined];
	}

  	// write hash entry data
	function writeHashEntry(score, bestMove, depth, hashFlag) {
    	// init hash entry
    	var hashEntry = hashTable[getHashIndex(hashKey)];

	    // adjust mating scores
	    if (score < -mateValue) score -= searchPly;
	    if (score > mateValue) score += searchPly;

	    // write hash entry data 
	    hashEntry.hashKey = hashKey;
	    hashEntry.score = score;
	    hashEntry.flag = hashFlag;
	    hashEntry.depth = depth;
	    hashEntry.bestMove = bestMove;
	    hashEntry.age = 1;
	}

	function getHashIndex(hashKey) {
		return (hashKey & 0x7fffffff) % hashEntries;
	}







	function isThreeFoldRepetition(positionHash) {
		var repetitions = 0;
		for (var i = 0; i < repetitionTable.length; i++) {
			repetitions += (positionHash == repetitionTable[i])
		}

		return repetitions// >= 3;
	}



	
	// engine


var infinity = 50000;
var mateValue = 49000;


// 1 -> pawn
// 2 -> knight
// 3 -> bishop
// 4 -> rook
// 5 -> queen
// 6 -> king

var weights = { '0': 0, '1': 100, '2': 300, '3': 315, '4': 500, '5': 900, '6': 60000 };

// values from Rofchade: http://www.talkchess.com/forum3/viewtopic.php?f=2&t=68311&start=19

var mg_pst = {
'1': [
      0,   0,   0,   0,   0,   0,  0,   0,
     98, 134,  61,  95,  68, 126, 34, -11,
     -6,   7,  26,  31,  65,  56, 25, -20,
    -14,  13,   6,  21,  23,  12, 17, -23,
    -27,  -2,   13, 14,  18,  10, 10, -25,
    -26,  -4,   2, -10,   3,   3, 33, -12,
    -35,  -1, -17, -23, -25,  24, 38, -22,
      0,   0,   0,   0,   0,   0,  0,   0],

'2': [
    -167, -89, -34, -49,  61, -97, -15, -107,
     -73, -41,  72,  36,  23,  62,   7,  -17,
     -47,  60,  37,  65,  84, 129,  73,   44,
      -9,  17,  19,  53,  37,  69,  18,   22,
     -13,   4,  16,  13,  28,  19,  21,   -8,
     -23,  -9,  14,  10,  19,  17,  25,  -16,
     -29, -53, -12,   1,   0,  18, -14,  -19,
    -105, -17, -58, -33, -17, -28, -19,  -23],

'3': [
    -29,   4, -82, -37, -25, -42,   7,  -8,
    -26,  16, -18, -13,  30,  59,  18, -47,
    -16,  37,  43,  40,  35,  50,  37,  -2,
     -4,   5,  19,  50,  37,  37,   7,  -2,
     -6,  13,  15,  26,  34,  14,  10,   4,
      0,  15,  15,  13,  12,  27,  18,  10,
      4,  15,  16,   0,   7,  21,  33,   1,
    -33,  -3, -14, -21, -13, -12, -39, -21],

'4': [
     32,  42,  32,  51, 63,  9,  31,  43,
     27,  32,  58,  62, 80, 67,  26,  44,
     -5,  19,  26,  36, 17, 45,  61,  16,
    -24, -11,   7,  26, 24, 35,  -8, -20,
    -36, -26, -12,  -1,  9, -7,   6, -23,
    -45, -25, -16, -17,  3,  0,  -5, -33,
    -44, -16, -20,  -9, -1, 11,  -6, -71,
    -19, -13,   1,  17, 16,  7, -37, -26],

'5': [
    -28,   0,  29,  12,  59,  44,  43,  45,
    -24, -39,  -5,   1, -16,  57,  28,  54,
    -13, -17,   7,   8,  29,  56,  47,  57,
    -27, -27, -16, -16,  -1,  17,  -2,   1,
     -9, -26,  -9, -10,  -2,  -4,   3,  -3,
    -14,   2, -11,  -2,  -5,   2,  14,   5,
    -35,  -8,  11,   2,   8,  15,  -3,   1,
     -1, -18,  -9,  10, -15, -25, -31, -50],

'6': [
    -65,  23,  16, -15, -56, -34,   2,  13,
     29,  -1, -20,  -7,  -8,  -4, -38, -29,
     -9,  24,   2, -16, -20,   6,  22, -22,
    -17, -20, -12, -27, -30, -25, -14, -36,
    -49,  -1, -27, -39, -46, -44, -33, -51,
    -14, -14, -22, -46, -44, -30, -15, -27,
      1,   7,  -8, -64, -43, -16,   9,   8,
    -15,  36,  12, -54,   8, -28,  24,  14]
}
var eg_pst = {
'1': [
      0,   0,   0,   0,   0,   0,   0,   0,
    178, 173, 158, 134, 147, 132, 165, 187,
     94, 100,  85,  67,  56,  53,  82,  84,
     32,  24,  13,   5,  -2,   4,  17,  17,
     13,   9,  -3,  -7,  -7,  -8,   3,  -1,
      4,   7,  -6,   1,   0,  -5,  -1,  -8,
     13,   8,   8,  10,  13,   0,   2,  -7,
      0,   0,   0,   0,   0,   0,   0,   0],

'2': [
    -58, -38, -13, -28, -31, -27, -63, -99,
    -25,  -8, -25,  -2,  -9, -25, -24, -52,
    -24, -20,  10,   9,  -1,  -9, -19, -41,
    -17,   3,  22,  22,  22,  11,   8, -18,
    -18,  -6,  16,  25,  16,  17,   4, -18,
    -23,  -3,  -1,  15,  10,  -3, -20, -22,
    -42, -20, -10,  -5,  -2, -20, -23, -44,
    -29, -51, -23, -15, -22, -18, -50, -64],

'3': [
    -14, -21, -11,  -8, -7,  -9, -17, -24,
     -8,  -4,   7, -12, -3, -13,  -4, -14,
      2,  -8,   0,  -1, -2,   6,   0,   4,
     -3,   9,  12,   9, 14,  10,   3,   2,
     -6,   3,  13,  19,  7,  10,  -3,  -9,
    -12,  -3,   8,  10, 13,   3,  -7, -15,
    -14, -18,  -7,  -1,  4,  -9, -15, -27,
    -23,  -9, -23,  -5, -9, -16,  -5, -17],

'4': [
    13, 10, 18, 15, 12,  12,   8,   5,
    11, 13, 13, 11, -3,   3,   8,   3,
     7,  7,  7,  5,  4,  -3,  -5,  -3,
     4,  3, 13,  1,  2,   1,  -1,   2,
     3,  5,  8,  4, -5,  -6,  -8, -11,
    -4,  0, -5, -1, -7, -12,  -8, -16,
    -6, -6,  0,  2, -9,  -9, -11,  -3,
    -9,  2,  3, -1, -5, -13,   4, -20],

'5': [
     -9,  22,  22,  27,  27,  19,  10,  20,
    -17,  20,  32,  41,  58,  25,  30,   0,
    -20,   6,   9,  49,  47,  35,  19,   9,
      3,  22,  24,  45,  57,  40,  57,  36,
    -18,  28,  19,  47,  31,  34,  39,  23,
    -16, -27,  15,   6,   9,  17,  10,   5,
    -22, -23, -30, -16, -16, -23, -36, -32,
    -33, -28, -22, -43,  -5, -32, -20, -41],

'6': [
    -74, -35, -18, -18, -11,  15,   4, -17,
    -12,  17,  14,  17,  17,  38,  23,  11,
     10,  17,  23,  15,  20,  45,  44,  13,
     -8,  22,  24,  27,  26,  33,  26,   3,
    -18,  -4,  21,  24,  27,  23,   9, -11,
    -19,  -3,  11,  21,  23,  16,   7,  -9,
    -27, -11,   4,  13,  14,   4,  -5, -17,
    -53, -34, -21, -11, -28, -14, -24, -43]
}


function evaluatePosition() {
	var mg_whiteScore = 0, mg_blackScore = 0, eg_whiteScore = 0, eg_blackScore = 0;

	var whiteScoreWithoutPawns = -59999, blackScoreWithoutPawns = -59999;
	var whitePawnsByColumn = [[], [], [], [], [], [], [], []], 
		blackPawnsByColumn = [[], [], [], [], [], [], [], []];

	// gets material without considering the panws and gives information on pawn structure
	for (var i = 0; i < 64; i++) {
		var index = i >> 3 << 4 | i & 7
		if (board[index] != 0) {
			if ((board[index] & 0x07) != piecePawn) {
				if ((board[index] & ~0x07) == colorWhite) {
					whiteScoreWithoutPawns += weights[(board[index] & 0x07)]
				} else {
					blackScoreWithoutPawns += weights[(board[index] & 0x07)]
				}
			} else {
				if ((board[index] & ~0x07) == colorWhite) {
					whitePawnsByColumn[i & 7].push((i >> 3))
				} else {
					blackPawnsByColumn[i & 7].push((i >> 3))
				}
			}
		}
	}

	if (whiteScoreWithoutPawns + blackScoreWithoutPawns >= 5600) {
		var mg_weight = 1;
		var eg_weight = 0;
	} else {
		var mg_weight = (whiteScoreWithoutPawns + blackScoreWithoutPawns) / 3500;
		var eg_weight = 3500 / (whiteScoreWithoutPawns + blackScoreWithoutPawns)
		var both = mg_weight + eg_weight;
		mg_weight /= both;
		eg_weight /= both;
	}

	// discount points for doubled or isolated pawns
	for (var i = 0; i < 8; i++) {
		var blackDoubled = Math.max((blackPawnsByColumn[i].length - 1), 0);
		var whiteDoubled = Math.max((whitePawnsByColumn[i].length - 1), 0);

		mg_whiteScore -= whiteDoubled * 20;
		mg_blackScore -= blackDoubled * 20;

		eg_whiteScore -= whiteDoubled * 30;
		eg_blackScore -= blackDoubled * 30;
	}

	// value position based on piece valuesand location
	for (var i = 0; i < 64; i++) {
		var index = i >> 3 << 4 | i & 7
		if (board[index] !== 0) {
			if ((board[index] & ~0x07) == colorWhite) {
				var piece = (board[index] & 0x07)
				mg_whiteScore += weights[piece] + mg_pst[piece][i]

				eg_whiteScore += weights[piece] + eg_pst[piece][i]
			} else {
				var piece = (board[index] & 0x07)
				mg_blackScore += weights[piece] + mg_pst[piece][(i ^ 56)]

				eg_blackScore += weights[piece] + eg_pst[piece][(i ^ 56)]
			}
		}
	}

	eg_whiteScore += mopUpEval(colorWhite, whiteScoreWithoutPawns, blackScoreWithoutPawns, eg_weight)
	eg_blackScore += mopUpEval(colorBlack, blackScoreWithoutPawns, whiteScoreWithoutPawns, eg_weight)


	if (turn == colorWhite) {
	//	mg_whiteScore += 150;
	//	mg_whiteScore += 200;
		var perspective = 1
	} else {
	//	mg_blackScore += 150;
	//	mg_blackScore += 200;
		var perspective = -1
	}

	var mg_evaluation = (mg_whiteScore - mg_blackScore) * mg_weight,
		eg_evaluation = (eg_whiteScore - eg_blackScore) * eg_weight

	var evaluation = mg_evaluation + eg_evaluation;

	return evaluation * perspective;
}

var dstToCornersMap = [
0, 1, 2, 3, 3, 2, 1, 0,
1, 2, 3, 4, 4, 3, 2, 1,
2, 3, 4, 5, 5, 4, 3, 2,
3, 4, 5, 6, 6, 5, 4, 3,
3, 4, 5, 6, 6, 5, 4, 3,
2, 3, 4, 5, 5, 4, 3, 2,
1, 2, 3, 4, 4, 3, 2, 1,
0, 1, 2, 3, 3, 2, 1, 0
];
var dstToCenterMap = [
6, 5, 4, 3, 3, 4, 5, 6,
5, 4, 3, 2, 2, 3, 4, 5,
4, 3, 2, 1, 1, 2, 3, 4,
3, 2, 1, 0, 0, 1, 2, 3,
3, 2, 1, 0, 0, 1, 2, 3,
4, 3, 2, 1, 1, 2, 3, 4,
5, 4, 3, 2, 2, 3, 4, 5,
6, 5, 4, 3, 3, 4, 5, 6
];
var dstToBlackCornerMap = [
7, 6, 5, 4, 3, 2, 1, 0,
6, 7, 6, 5, 4, 3, 2, 1,
5, 6, 7, 6, 5, 4, 3, 2,
4, 5, 6, 7, 6, 5, 4, 3,
3, 4, 5, 6, 7, 6, 5, 4,
2, 3, 4, 5, 6, 7, 6, 5,
1, 2, 3, 4, 5, 6, 7, 6,
0, 1, 2, 3, 4, 5, 6, 7
];
var dstToWhiteCornerMap = [
0, 1, 2, 3, 4, 5, 6, 7,
1, 2, 3, 4, 5, 6, 7, 6,
2, 3, 4, 5, 6, 7, 6, 5,
3, 4, 5, 6, 7, 6, 5, 4,
4, 5, 6, 7, 6, 5, 4, 3,
5, 6, 7, 6, 5, 4, 3, 2,
6, 7, 6, 5, 4, 3, 2, 1,
7, 6, 5, 4, 3, 2, 1, 0
]

var corners = [dstToWhiteCornerMap, dstToBlackCornerMap];
var curCorner = 0;


function mopUpEval(color, myMaterial, enemyMaterial, eg_weight) {
	var mopUpScore = 0;

	if (myMaterial > enemyMaterial + 200 && eg_weight > 0.4) {
		var myKing = board.indexOf(color | pieceKing);
		var enemyKing = board.indexOf((color ^ 24) | pieceKing);

		var enemyDstFromCenter = dstToCenterMap[(enemyKing >> 3 << 2 | enemyKing & 7)]
		mopUpScore -= enemyDstFromCenter * 6;

		myKing = getCoordinatesFromIndex(myKing);
		enemyKing = getCoordinatesFromIndex(enemyKing);

		// move our king closer to enemy
		var dstBetweenKingsFile = Math.abs(myKing[0] - enemyKing[0]);
		var dstBetweenKingsRank = Math.abs(myKing[1] - enemyKing[1]);
		var dstBetweenKings = dstBetweenKingsRank + dstBetweenKingsFile;

		mopUpScore += (14 - dstBetweenKings) * 12;

		return mopUpScore;
	}
	return 0;
}


function isEndgame() {
	var materialCount = -120000; // negative value of two kings
	for (var i = 0; i < 64; i++) {
		var index = i >> 3 << 4 | i & 7;
		materialCount += weights[(board[index] & 0x07)];
	}

	return materialCount < 3500
}








function moveOrder(moves, suggestedMove) {
	var moveScores = []
	for (var i = 0; i < moves.length; i++) {
		var moveScore = 0;
		var move = readMove(moves[i])
		var movePiece = board[move[0]] & 0x07;
		var capturedPiece = board[move[1]] & 0x07;
		
		if (capturedPiece) {
			moveScore += 10 * (weights[capturedPiece] - weights[movePiece])
		}

		if (move[2] & moveflagPromotion) {
		    if (move[2] & moveflagPromoteKnight) 
		        var promotedPiece = '2';
		    else if (move[2] & moveflagPromoteQueen) 
		        var promotedPiece = '5';
		    else if (move[2] & moveflagPromoteBishop) 
		        var promotedPiece = '3';
		    else 
		        var promotedPiece = '4';

			moveScore += weights[promotedPiece]
		}

		var pieceColor = movePiece & ~0x07;
		var pawnFile = move[0] + (pieceColor - 12) * 4
		if (board[pawnFile + 1] == ((pieceColor ^ 24) | piecePawn) || board[pawnFile - 1] == ((pieceColor ^ 24) | piecePawn)) {
			moveScore -= 350;
		}

		if (moves[i] == suggestedMove) {
			moveScore += 1000;
		}

		moveScores[i] = moveScore;
	}


	// Sort the moves list based on scores. This sorting method is very slow (I think) gotta redo it
	for (var i = 0; i < moves.length - 1; i++) {
		for (var j = i + 1; j > 0; j--) {
			var swapIndex = j - 1;
			if (moveScores[swapIndex] < moveScores[j]) {
				var swap = moveScores[swapIndex];
				moveScores[swapIndex] = moveScores[j]
				moveScores[j] = swap;
		         
				swap = moves[swapIndex];
				moves[swapIndex] = moves[j]
				moves[j] = swap;
			}
		}
	}

	return moves
}


// search variables
var bestMoveThisIteration,
	bestEvalThisIteration,
	bestMove,
	bestEval,
	gameState;

var searchStart,
	searchLimit;



function search(maxTime) {
//	initHashTable() // clear transposition table (aging problem I think)
	ageHashTable()  // aging the hash table is not working I must be doing something wrong

	searchStart = (new Date()).getTime();
	searchLimit = searchStart + maxTime;

	// iterative deepening
	var targetDepth = 100;

	// aspiration window variables
	var alpha = -infinity;
	var beta = infinity
	var valWindow = 40;

	for (var searchDepth = 1; searchDepth <= targetDepth; searchDepth++) {
		bestMoveThisIteration = null;
		bestEvalThisIteration = null;

		var score = negamax(searchDepth, 0, alpha, beta, true);

		// stop search if mate found
		if (score > 45000 || score < -45000) {
			bestEval = score;
			bestMove = bestMoveThisIteration;
			break;
		}

		if ((new Date()).getTime() > searchLimit) { // reached time limit
			console.log("time limit");
			break;
		}

		// aspiration window
	    if ((score <= alpha) || (score >= beta)) { // eval outside window
	        alpha = -infinity;    // We fell outside the window, so try again with a
	        beta = infinity;      //  full-width window (and the same depth).
	        searchDepth--; // call function with same depth

	        searchLimit += maxTime / 3; // probably the position is complicated, so give some more time to the engine
	        console.log((maxTime / 3000).toFixed(1) + " extra seconds given to engine.");
			continue;
	    } else {
	    	alpha = score - valWindow;  // Set up the window for the next iteration.
	    	beta = score + valWindow;
	    }

		bestMove = bestMoveThisIteration;
		bestEval = bestEvalThisIteration;

		console.log("depth " + searchDepth + ": " + moveToNotation(bestMove));
	}

	// detect mates
	makeMove(bestMove);
	var isInCheck = isSquareAttacked((board.indexOf(turn | pieceKing)), turn);
	var moves = getLegalMoves(turn);
	// detect checkmate or stalemate
	if (moves.length == 0) {
		if (isInCheck) {
			if (score > 0) {
				gameState = "Você perdeu por xeque-mate.";
			} else if (score < 0) {
				gameState = "Você ganhou por xeque-mate.";
			}
		}
	}
	unmakeMove();

	console.log(moveToNotation(bestMove), bestEval, "\n ");

	return [bestMove, bestEval, gameState];
}

function negamax(depth, plyFromRoot, alpha, beta, nullMove) {
	if ((new Date()).getTime() > searchLimit) {
		return 0;
	}

	gameState = null;

	var hashFlag = HASH_ALPHA;
	var pvNode = beta - alpha > 1;
	var foundPV = false;
	var futilityPruning = false;
	var movesSearched = 0;
	var bestTTmove;

	var endgame = isEndgame();

	if (plyFromRoot >= 0 && isThreeFoldRepetition(hashKey) > 2) {
		gameState = "Empate por tripla repetição.";
		return 0;
	}

	if (depth <= 0) {
		return quiescenceSearch(alpha, beta, 8);
	}


	// use transposition table result if depth if equal or higher to search depth
	var score = readHashEntry(alpha, beta, bestTTmove, depth);
	if (score[0] != noHashEntry) {
		if (plyFromRoot == 0) {
			bestEvalThisIteration = score[0];
			bestMoveThisIteration = score[1];
		}
		return score[0]
	}
	var score = 0;

	// mate distance prunning
	alpha = Math.max(alpha, -mateValue + plyFromRoot);
	beta = Math.min(beta, mateValue - plyFromRoot);
	if (alpha >= beta) {
		return alpha;
	}


	var isInCheck = isSquareAttacked((board.indexOf(turn | pieceKing)), turn);

	// check extension
	if (isInCheck) depth++;

	if (!isInCheck && pvNode == 0) {
      	// static evaluation for pruning purposes
      	let staticEval = evaluatePosition();
    
      	// evalution pruning
      	if (depth < 3 && Math.abs(beta - 1) > -mateValue + 100) {
        	let evalMargin = weights["1"] * depth;
        	if (staticEval - evalMargin >= beta) return staticEval - evalMargin;
      	}
      
     	if (nullMove) {
       		// null move pruning
        	if (plyFromRoot && depth > 2 && staticEval >= beta && !endgame) {
          		turn ^ 24	//	makeNullMove(); 
          		hashKey ^= sideKey;
          		score = -negamax(depth - 1 - 2, plyFromRoot + 1, -beta, -beta + 1, false);
          		turn ^ 24	//	takeNullMove();
          		hashKey ^= sideKey;
          
          		if (score >= beta) {
          			return beta;
          		} else if (zeroWindowSearch(mateValue / 2, depth - 1 - 2) > mateValue / 2) {
          			depth++; // mate threat extension
          		}
        	}	
        
        	// razoring
        	score = staticEval + weights["1"];
        	var newScore;
        
        	if (score < beta && depth == 1) {
            	newScore = quiescenceSearch(alpha, beta, 6);
            	return (newScore > score) ? newScore : score;
        	}
        
        	score += weights["1"];

        	if (score < beta && depth < 4) {
          		newScore = quiescenceSearch(alpha, beta, 6);
          		if (newScore < beta) return (newScore > score) ? newScore : score;
        	}
		}

	    // futility pruning condition
      	let futilityMargin = [
        	0, weights["1"], weights["2"], weights["4"]
      	];
      
        futilityPruning = (depth < 4 && Math.abs(alpha) < mateScore && staticEval + futilityMargin[depth] <= alpha);
	}


	
	var moves = moveOrder(getLegalMoves(turn), bestTTmove);
	// detect checkmate or stalemate
	if (moves.length == 0) {
		if (isInCheck) {
			var mateScore = mateValue - plyFromRoot;
			return -mateScore;
		}

		gameState = "Empate por afogamento.";
		return 0
	} else if (moves.length == 1 && plyFromRoot == 0) { // if we only have one move available, play it
		bestMoveThisIteration = moves[0];
		return 0;
	}

	var bestMoveInThisPosition;
	for (var i = 0; i < moves.length; i++) {
		// futility pruning
      	if (futilityPruning &&
          	movesSearched < 4 &&
          	board[((moves[i] >> 8) & 0xFF)] == 0 && // move is not capture
          	((moves[i] & 0xFF0000)) != moveflagPromotion && // move is not promotion
          	!isInCheck
         	) { 
         		continue; 
     	}

		makeMove(moves[i]);

     	if (movesSearched == 0 || endgame) {
     		var score = -negamax(depth - 1, plyFromRoot + 1, -beta, -alpha, true);
     	} else {
     		// late move reduction
     		if (pvNode == 0 &&
	            movesSearched > 3 &&
	            depth > 2 &&
	            !isInCheck &&
	            board[((moves[i] >> 8) & 0xFF)] == 0 && // move is not capture
	            ((moves[i] & 0xFF0000)) != moveflagPromotion == 0 // move is not promotion
          	) {
            	var score = -negamax(depth - 2, plyFromRoot + 1, -alpha - 1, -alpha, true);
	     	} else {
	     		var score = alpha + 1;
	     	}

			// principal variation search
			if (score > alpha) {
	            score = -negamax(depth - 1, plyFromRoot + 1, -alpha - 1, -alpha, true);
	            if ((score > alpha) && (score < beta)) { // Check for failure.
	                score = -negamax(depth - 1, plyFromRoot + 1, -beta, -alpha, true);
	            }
	        }/* else {
				score = -negamax(depth - 1, plyFromRoot + 1, -beta, -alpha, true);
	        }*/
    	}
		unmakeMove();
		movesSearched++;

		if (score >= beta) {
			// store result in TT (lowerBound)
			writeHashEntry(alpha, moves[i], depth, HASH_BETA)
			return beta;
		}
		// found new best move
		if (score > alpha) {
			foundPV = true;

			// change evalType to exact
			hashFlag = HASH_EXACT
			bestMoveInThisPosition = moves[i];

			alpha = score;
			if (plyFromRoot == 0) {
				bestMoveThisIteration = moves[i];
				bestEvalThisIteration = score;
			}
		}
	}

	writeHashEntry(alpha, bestMoveInThisPosition, depth, hashFlag)
	return alpha;
}

// search captures to reach 'quiet' position
function quiescenceSearch(alpha, beta, depth) {
	var score = evaluatePosition();
	if (score >= beta) {
		return beta;
	}
	if (depth == 0) {
		return score;
	}
	if (score > alpha) {
		alpha = score;
	}

/*	var isInCheck = isSquareAttacked((board.indexOf(turn | pieceKing)), turn);
	if (isInCheck) {
		var moves = moveOrder(getLegalMoves(turn))
	} else {*/
		// generate capture moves
		var moves = moveOrder(getLegalMoves(turn, true));
//	}

	for (var i = 0; i < moves.length; i++) {
		makeMove (moves[i]);
		score = -quiescenceSearch(-beta, -alpha, depth - 1);
		unmakeMove ();

		if (score >= beta) {
			return beta;
		}
		if (score > alpha) {
			alpha = score;
		}
	}

	return alpha;
}


// fail-hard zero window search, returns either beta-1 or beta
function zeroWindowSearch(beta, depth) {
   // this is either a cut- or all-node
   if (depth <= 0) return quiescenceSearch(beta-1, beta);
   var moves = moveOrder(getLegalMoves(turn));
   for (var i = 0; i < moves.length; i++) {
    	makeMove(moves[i]);
     	score = -zeroWindowSearch(1 - beta, depth - 1);
     	unmakeMove();
     	if (score >= beta)
        	return beta;   // fail-hard beta-cutoff
   }
   return beta - 1; // fail-hard, return alpha
}





//	trying to set the worker :)

self.addEventListener("message", function(e) {
    var actions = [FENreader, getLegalMoves, makeMove, search, makeMove];

    var ans = actions[e.data[0]](...e.data[1]);

    if (ans && e.data[2]) {
   		postMessage(ans)
    }
}, false);