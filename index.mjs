// Snorkungen 2025

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

	/** @returns {this} */
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

	/** @returns {this} */
	transpose() {
		let copy = new this.constructor(this.height, this.width);
		for (let y = 0; y < copy.height; y++) {
			for (let x = 0; x < copy.width; x++) {
				copy.set_mutate(x, y, this.get(y, x))
			}
		}
		return copy;
	}

	/** @returns {this} */
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

	/** @returns number */
	count() {
		let sum = 0;
		for (let v of this.blocks) {
			sum += !!v ? 1 : 0;
		}
		return sum;
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
	const stack = [{ game: game, moves: [] }];

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

					// reduce the infinite permutations event, and since this is a depth-first search it's fine
					if (final_moves.length >= 200) {
						stack.length = 0;
					}
				} else {
					let s = JSON.stringify([...moves, [pidx, x, y]].sort((a, b) => a[0] - b[0]))

					if (!moves_set.has(s)) {
						moves_set.add(s)
						stack.push({
							game: g,
							moves: [...moves, [pidx, x, y]]
						})
					}
				}
			}
		}

	}

	// sort the moves in an ascending order with the least remaining blocks
	return final_moves.sort((a, b) => play_moves(game, a, pieces).count() - play_moves(game, b, pieces).count())
}

/**
 * 
 * @param {Game} init_game 
 * @param {[number, number, number][]} moves 
 * @param {Piece[]} pieces 
 * @returns {Game}
 */
function play_moves(init_game, moves, pieces) {
	let game = init_game;
	for (let [pidx, x, y] of moves) {
		game = game.set_remove(x, y, pieces[pidx]);
	}
	return game;
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

const onebyone = new Piece(1, 1).set_mutate(0, 0);
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
const big_l3 = new Piece(board_maker([
	[1, 0, 0],
	[1, 0, 0],
	[1, 1, 1],
]))
const big_l4 = big_l3.transpose();

const small_lv = new Piece(board_maker([
	[1, 0],
	[1, 0],
	[1, 1],
]));

const small_lv2 = small_lv.flip();
const small_lv3 = new Piece(board_maker([
	[1, 1],
	[1, 0],
	[1, 0],
]));
const small_lv4 = small_lv3.flip();
const small_lh = small_lv.transpose();
const small_lh2 = small_lh.flip();
const small_lh3 = small_lv3.transpose();
const small_lh4 = small_lh3.flip();

const tiny_l = twobytwo.set(0, 0, 0);
const tiny_l2 = twobytwo.set(0, 1, 0);
const tiny_l3 = twobytwo.set(1, 0, 0);
const tiny_l4 = twobytwo.set(1, 1, 0);


const stairs = new Piece(board_maker([
	[0, 1, 0],
	[1, 1, 1]
]));
const stairs2 = stairs.flip()
const stairs3 = stairs.transpose();
const stairs4 = stairs.transpose().flip();

const step = new Piece(board_maker([
	[1, 1, 0],
	[0, 1, 1]
]));
const step2 = new Piece(board_maker([
	[0, 1, 1],
	[1, 1, 0]
]));
const step3 = step.transpose();
const step4 = step2.transpose();

function cornertocorner_generator(size, dir = 1) {
	const piece = new Piece(size);

	for (let i = 0; i < size; i++) {
		piece.set_mutate(dir >= 0 ? (size - 1) - i : i, i);
	}

	return piece;
}

const ctoc_2rl = cornertocorner_generator(2, -1);
const ctoc_3rl = cornertocorner_generator(3, -1);
const ctoc_4rl = cornertocorner_generator(4, -1);
const ctoc_5rl = cornertocorner_generator(5, -1);
const ctoc_2lr = cornertocorner_generator(2, 1);
const ctoc_3lr = cornertocorner_generator(3, 1);
const ctoc_4lr = cornertocorner_generator(4, 1);
const ctoc_5lr = cornertocorner_generator(5, 1);

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
	onebyone,
	twobythree,
	threebytwo,
	threebythree,
	big_l,
	big_l2,
	big_l3,
	big_l4,
	small_lv,
	small_lv2,
	small_lv3,
	small_lv4,
	small_lh,
	small_lh2,
	small_lh3,
	small_lh4,
	tiny_l,
	tiny_l2,
	tiny_l3,
	tiny_l4,
	stairs,
	stairs2,
	stairs3,
	stairs4,
	step, step2, step3, step4,
	ctoc_2rl,
	ctoc_3rl,
	ctoc_4rl,
	ctoc_5rl,
	ctoc_2lr,
	ctoc_3lr,
	ctoc_4lr,
	ctoc_5lr,
]

export let game = new Game(board_maker([
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0],
]));

game.print()

