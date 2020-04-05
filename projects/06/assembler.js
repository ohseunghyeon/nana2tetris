// made by jsclark. https://github.com/jsclark/nand2tetris-hack-assembler-node

var fs = require('fs'),
  symbols = {
    'SP': 0,
    'LCL': 1,
    'ARG': 2,
    'THIS': 3,
    'THAT': 4,
    'SCREEN': 16384,
    'KBD': 24567
  }, i;

for (i = 0; i < 16; i++) {
  symbols['R' + i] = i;
}

var in_buffer = fs.readFileSync(process.argv[2], 'ascii').split("\r\n"),
  out_buffer = [],
  matches, l, line,

  whitespace_comment = /(\/\/.*$)|([\s]+)/g,
  match_label = /^\((.+)\)$/,
  pc = 0;


for (i = 0, l = in_buffer.length; i < l; i++) {
  line = in_buffer[i].replace(whitespace_comment, '');

  if (line !== '') {
    matches = match_label.exec(line);

    if (matches !== null) {
      symbols[matches[1]] = pc;
    } else {
      out_buffer.push(line);
      pc += 1;
    }
  }
}

in_buffer = out_buffer;
out_buffer = [];


var dest_masks = {
  'M': 1 << 3,     // 0000000000001000
  'D': 2 << 3,     // 0000000000010000
  'A': 4 << 3,     // 0000000000100000
},
  jump_masks = {
    'JGT': 1,        // 0000000000000001
    'JEQ': 2,        // 0000000000000010
    'JGE': 3,        // 0000000000000011
    'JLT': 4,        // 0000000000000100
    'JNE': 5,        // 0000000000000101
    'JLE': 6,        // 0000000000000110
    'JMP': 7,        // 0000000000000111
  },
  comp_masks = {
    '0': 42 << 6,  // 0000101010000000
    '1': 63 << 6,  // 0000111111000000
    '-1': 58 << 6,  // 0000111010000000
    'D': 12 << 6,  // 0000001100000000
    'A': 48 << 6,  // 0000110000000000
    '!D': 13 << 6,  // 0000001101000000
    '!A': 49 << 6,  // 0000110001000000
    '-D': 15 << 6,  // 0000001111000000
    '-A': 51 << 6,  // 0000110011000000
    'D+1': 31 << 6,  // 0000011111000000
    'A+1': 55 << 6,  // 0000110111000000
    'D-1': 14 << 6,  // 0000001110000000
    'A-1': 50 << 6,  // 0000110010000000
    'D+A': 2 << 6,  // 0000000010000000
    'D-A': 19 << 6,  // 0000010011000000
    'A-D': 7 << 6,  // 0000000111000000
    'D&A': 0 << 6,  // 0000000000000000
    'D|A': 21 << 6,  // 0000010101000000
  },
  c_base = 57344, // 1110000000000000
  max_address = 32767, // 0111111111111111
  set_a = 4096, // 0001000000000000
  padding = '0000000000000000',
  flippable = /[\+\|\&]/,

  symbol_address = 16,
  symbol, new_symbol,
  match_address = /^\@(([\d]+)|(.+))/,
  dest_match = /[AMD]+/,
  comp_match = /(0)|(\-?[1AMD])|(![AMD])|([AMD][+\-&|][AMD])/,
  jump_match = /J((EQ)|(NE)|(MP)|([GL][TE]))/,

  exception,
  line_masks,
  comp, flip,
  out, j;


for (i = 0, l = in_buffer.length; i < l; i++) {
  line = in_buffer[i];

  // @ADDRESS
  matches = match_address.exec(line);
  if (matches !== null) {
    symbol = matches[3];
    if (symbol !== undefined) {
      if (symbols[symbol] === undefined) {
        symbols[symbol] = symbol_address++;
      }
      line = symbols[symbol];
    } else {
      line = parseInt(matches[2], 10);
    }

    if (line > max_address) {
      throw RangeError('Address out of range: ' + line);
    }

    out_buffer.push((padding + line.toString(2)).substr(-1 * padding.length));

  } else {

    // CMD
    matches = line.split('=');
    line = {};
    line_masks = [];

    exception = new SyntaxError('Error parsing instruction: ' + in_buffer[i]);

    if (matches[1] !== undefined) {
      line.dest = matches[0];
      line.comp = matches[1];
    } else {
      matches = matches[0].split(';');
      line.comp = matches[0];
      line.jump = matches[1];
    }

    if (line.dest) {
      if (dest_match.test(line.dest)) {
        get_dest_masks(line.dest, line_masks);
      } else {
        console.log('--------- DEST ---------');
        console.log(dest_match.exec(line.dest));
        console.log('------------------------');
        throw exception;
      }
    }

    if (line.comp) {
      if (comp_match.test(line.comp)) {
        get_comp_masks(line.comp, line_masks);
      } else {
        console.log('--------- COMP ---------');
        console.log(comp_match.exec(line.comp));
        console.log('------------------------');
        throw exception;
      }
    }

    if (line.jump) {
      if (jump_match.test(line.jump)) {
        get_jump_masks(line.jump, line_masks);
      } else {
        console.log('--------- JUMP ---------');
        console.log(jump_match.exec(line.jump));
        console.log('------------------------');
        throw exception;
      }
    }

    out = c_base;
    for (j = 0; j < line_masks.length; j++) {
      out = out | line_masks[j];
    }

    out_buffer.push(out.toString(2));
  }
}

function get_dest_masks(dest, masks) {
  for (j = 0; j < dest.length; j++) {
    masks.push(dest_masks[dest.charAt(j)]);
  }

  return true;
}

function get_comp_masks(comp, masks) {
  if (comp.indexOf('M') !== -1) {
    comp = comp.replace(/M/g, 'A');
    masks.push(set_a);
  }

  flip = flippable.test(comp) ? comp.split('').reverse().join('') : false;
  if (comp_masks[comp] !== undefined) {
    masks.push(comp_masks[comp]);
  } else if (flip && comp_masks[flip] !== undefined) {
    masks.push(comp_masks[flip]);
  } else {
    throw new SyntaxError('Invalid Command: ' + line.comp);
  }

  return true;
}

function get_jump_masks(jump, masks) {
  if (jump_masks[jump]) {
    masks.push(jump_masks[jump]);
  }

  return true;
}

fs.writeFileSync(process.argv[3], out_buffer.join("\r\n"), 'ascii');
process.exit();