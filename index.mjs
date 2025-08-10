
// Oh no the only thing I know is javascript

export class Board {
	constructor(board, height) {
		if (board instanceof Board) {
			this.width = board.width;
			this.height = board.height;
			this.blocks = new Uint8Array(board.blocks); // copy
		} else if (typeof board == "number") {
			this.width = board;
			if (typeof height == "number") {
				this.height = height;
			} else {
				this.height = this.width;
			}
			this.blocks = new Uint8Array(this.width * this.height);
		}
	}

	get(x, y) {
		// todo I would like blocks to be stored as an array of bits, because that would be fun
		return !!this.blocks[y * this.width + x];
	}

	set_mutate(x, y, board) {
		if (board instanceof Board) {
			// essentially set the blocks for the given board and shit
			for (let j = 0; j < board.height && (j + y) < this.height; j++) {
				for (let i = 0; i < board.width && (i + x) < this.width; i++) {
					if (board.get(i, j)) {
						this.set_mutate((x + i), (y + j))
					}
				}
			}
		} else {
			this.blocks[y * this.width + x] = typeof board == "undefined" ? 1 : new Number(!!board);
		}

		return this;
	}

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 * @param {Board | undefined} board 
	 * @returns {this}
	 */
	set(x, y, board) {
		let copy = new this.constructor(this);
		copy.set_mutate(x, y, board);
		return copy;
	}

	transpose() {
		let copy = new this.constructor(this.height, this.width);
		for (let y = 0; y < copy.height; y++) {
			for (let x = 0; x < copy.width; x++) {
				copy.set_mutate(x, y, this.get(y, x))
			}
		}
		return copy;
	}

	flip() {
		let copy = new this.constructor(this.width, this.height);

		for (let y = 0; y < copy.height; y++) {
			for (let x = 0; x < copy.width; x++) {
				copy.set_mutate(x, y, this.get(this.width - x - 1, this.height - y - 1))
			}
		}
		return copy;
	}

	print() {
		for (let y = 0; y < this.height; y++) {
			let row = "";
			for (let x = 0; x < this.width; x++) {
				row += (this.get(x, y)) ? "X" : "-"
			}
			console.log(row);
		}
	}
}

export class Piece extends Board {
	/** Check whether a this given piece fits into the board */
	fit(x, y, board) {
		if (!(board instanceof Board)) return false;

		// assume that the pieces have the smallest rectangle possible
		if (board.width < x + this.width || board.height < y + this.height) return false;

		// Check there are overlapping blocks
		for (let j = 0; j < this.height; j++) {
			for (let i = 0; i < this.width; i++) {
				if (this.get(i, j) && board.get(i + x, j + y)) return false;
			}
		}

		return true
	}
}

export class Game extends Board {
	remove_full_rows() {
		let rows = [], cols = [];
		row_loop: for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				if (!this.get(x, y)) continue row_loop;
			}
			rows.push(y);
		}

		col_loop: for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				if (!this.get(x, y)) continue col_loop;
			}
			cols.push(x);
		}

		let copy = new Game(this);
		for (let row of rows) {
			for (let x = 0; x < copy.width; x++) {
				copy.set_mutate(x, row, 0);
			}
		}
		for (let col of cols) {
			for (let y = 0; y < copy.height; y++) {
				copy.set_mutate(col, y, 0);
			}
		}

		return copy;
	}

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 * @param {Piece} piece 
	 */
	set_remove(x, y, piece) {
		return this.set(x, y, piece).remove_full_rows();
	}

}

function* piece_placer(game, piece) {
	for (let y = 0; y <= (game.height - piece.height); y++) {
		for (let x = 0; x <= (game.width - piece.width); x++) {
			if (piece.fit(x, y, game)) {
				yield [x, y]
			}
		}
	}
	return;
}

/**
 * 
 * @param {Game} game 
 * @param  {...Piece} pieces 
 * @returns 
 */
export function find_placements(game, ...pieces) {
	const final_moves = [];

	const moves_set = new Set();

	// this is the stack
	/** @type {{game: Game, moves: any}[]}*/
	const stack = [{ game: game, moves: final_moves }];

	while (stack.length) {
		const v = stack.pop();
		if (!v) throw "unreachable"
		const { game, moves } = v;

		if (moves.length > pieces.length) {
			throw new Error("this should not happen")
		}

		for (let pidx = 0; pidx < pieces.length; pidx++) {
			if (!!moves.find(([p]) => p === pidx)) continue;

			let piece = pieces[pidx];
			for (let [x, y] of piece_placer(game, piece)) {
				let g = game.set_remove(x, y, piece);

				if (pieces.length == (moves.length + 1)) {
					// the we push this to permutations
					final_moves.push([...moves, [pidx, x, y]])
					// now the issue is how do we record moves
				} else {
					let moves_to_push = [...moves, [pidx, x, y]]
					let s = JSON.stringify(moves_to_push.sort((a, b) => a[0] - b[0]))

					if (!moves_set.has(s)) {
						moves_set.add(s)
						stack.push({
							game: g,
							moves: moves_to_push
						})
					}
				}
			}
		}

	}

	return final_moves;
}

function board_maker(grid) {
	let board = new Board(grid[0].length, grid.length);

	for (let y = 0; y < grid.length; y++) {
		let row = grid[y];
		for (let x = 0; x < row.length; x++) {
			board.set_mutate(x, y, row[x]);
		}
	}

	return board
}


const stick_2h = new Piece(board_maker([[1, 1]]))
const stick_2v = stick_2h.transpose();
const stick_3h = new Piece(board_maker([[1, 1, 1]]))
const stick_3v = stick_3h.transpose()
const stick_4h = new Piece(board_maker([[1, 1, 1, 1]]))
const stick_4v = stick_4h.transpose()
const stick_5h = new Piece(board_maker([[1, 1, 1, 1, 1]]))
const stick_5v = stick_5h.transpose()

const twobytwo = new Piece(board_maker([
	[1, 1],
	[1, 1]
]));
const threebythree = new Piece(board_maker([
	[1, 1, 1],
	[1, 1, 1],
	[1, 1, 1],
]))

const twobythree = new Piece(board_maker([
	[1, 1],
	[1, 1],
	[1, 1],
]))

const threebytwo = twobythree.transpose()

const big_l = new Piece(board_maker([
	[1, 1, 1],
	[1, 0, 0],
	[1, 0, 0],
]));

const big_l2 = big_l.flip();

export const pieces = [
	stick_2h,
	stick_2v,
	stick_3h,
	stick_3v,
	stick_4h,
	stick_4v,
	stick_5h,
	stick_5v,
	twobytwo,
	twobythree,
	threebytwo,
	threebythree,
	big_l,
	big_l2
]

export let game = new Game(board_maker([
	[0, 1, 1, 0, 1, 1, 1, 1],
	[0, 1, 1, 0, 1, 1, 1, 1],
	[0, 1, 1, 0, 1, 1, 1, 1],
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 1, 0, 0, 0, 0],
	[0, 0, 1, 1, 0, 0, 0, 0],
	[0, 1, 1, 1, 1, 1, 1, 1],
	[0, 0, 1, 1, 1, 0, 0, 0],
]));

game.print()

