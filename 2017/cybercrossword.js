grid = [
  ", ,,,,,,, , ,  , , , , ,,,,,,,,,,,,,, ,,,,,,,",
  ", ,,,,,,,, ,, ,,,, , , , , , ,,,, , , , , , , , ,,,,",
  ", ,,,,,,, , , , , , , , ,,,,, ,,,,,,,, ,,, ,,,,",
  ", ,,,,,,,, ,,,,,,,, , , , , , , , ,, , , , , , , , , ,",
  ", , , , ,,,,, ,,,,,, ,,,,,, ,,, ,, ,, ,,,, ,,,",
  ", ,, ,,,,,, ,, ,,,, ,,,,,, ,,, , , , , , ,,, , , ,",
  ", , , , , , , , , , , , , , , , , , , , , , ,,,,,, ,,,,,, ,",
  ", ,,,,,, ,, ,, ,,,, ,,,,,, ,,,,,,, ,,,,,, ,",
  ", ,, , , , , , , , , , , , , , , , , ,, ,,,,,,, ,,,,,, ,",
  ", ,, ,,,, ,, ,, ,, ,, ,,,,,, ,,,,,,, ,,, , , , ,",
  ",,, ,,,, ,, , , , , ,, ,,,,,,,, , , , , , , ,, ,,, ,",
  ", ,, ,,,, ,, ,,,,,, ,,,,,,,,,, ,,, ,,, , , , ,",
  " , , , ,,,, ,, ,,,,,, ,,,,,,,,,, ,,, ,,,,,, ,",
  ", ,, ,,,, ,, ,,, , , , , , , , , , , , ,, ,,,,,,,,, ,",
  ", ,, , , , , , , ,,, ,,, ,,, ,,,,,,, ,, , , , , , , , ,",
  ", ,, ,, ,, ,, ,,, ,, , , , , , , , , , , , , ,,,,,, ,,,",
  ", , , ,, ,, ,, ,,, ,,, ,,, ,,,,,,, ,,,,,,, ,,,",
  ",,, ,, ,, ,, ,,, ,,, ,,, ,,,,,,,,,,,,,, ,,,",
  ",,, ,, ,, ,,,,, ,,, , , , , , ,,,,,,,,,, , , ,,,",
  ",, , , , , , , , , ,, ,,, ,,,,,,,,,,,,,,, ,, ,,,",
  " ,, ,,, ,, ,,, , , , , , , , ,,,,,,,, ,,,,, , , , ,,",
  " , , ,,, ,, ,,, ,,,,, ,,,,,,,,,, ,,,,, ,,,,,",
  " ,, ,,,, ,,,,,,,,, ,,,,,, , , , , , , , ,, ,,,, ,",
  " ,, , , , , , , , ,,,,,, ,,, ,,,, ,,, ,,,,, ,,,, ,",
  " ,,,,,, ,,,,,,, , , , , , , , , , , , , , , , , , , , , , ,",
  " , , , , ,, ,,,,,,,,, ,,, ,,,,,,, ,, ,,, ,,,, ,",
  ", ,,,,, ,,,,,,,,,,,, ,,,,,,, ,, , , , , , , , ,",
  ", ,,, ,, ,,,,,,,,,, ,, ,, ,,,, , ,, ,,, ,,,, ,",
  ", ,, , , , , , ,,,,, ,,, ,, ,, ,,,, ,,,,,, ,,,, ,",
  ", ,,, ,,,, ,,,, , , , , , , , , , , , , ,,, , , , , , , , ,",
  " , , , , , ,,, ,,,,, ,,, ,, ,, ,, ,,,,,,,, ,,,, ,",
  ", ,,, ,,,, , , , , , ,,, ,, , , , , , , , , , ,,, ,,,, ,",
  ", ,,, ,,,, ,, ,,,,,, , , ,, ,, ,,,,,,,,,,,,,",
  ",,,, ,,,, , , , , ,,,,,, ,, , , , ,,,,,,,,,,,,",
  ",,,,,,,, ,,,,,,,,,,,,,, ,,,,,,,,,,,,,"
];

if (localStorage.getItem('grid')) {
  grid = JSON.parse(localStorage.getItem('grid'));
}

var down = [];
var across = [];
var counter = 0;

new_grid = grid_create(grid);
document.body.appendChild(grid_render(new_grid));

function get_intersections() {
  var r = [];
  for (var i=0; i<new_grid.length; i++) {
    for (var j=0; j<new_grid[i].length; j++) {
      if (idx(new_grid, i, j).empty) {
        continue;
      }
      // an intersection either has a letter above or below
      if (idx(new_grid, i-1, j).empty && idx(new_grid, i+1, j).empty) {
        continue;
      }
      // also has a letter before or after
      if (idx(new_grid, i, j-1).empty && idx(new_grid, i, j+1).empty) {
        continue;
      }
      r.push(new_grid[i][j].inp.value.toUpperCase().charCodeAt(0));
    }
  }
  return new Uint8Array(r);
}

/**
 * Turns a grid where each row is comma delimited into a two dimensional array.
 * Throws an exception if the rows don't all have the same length.
 */
function grid_create(grid) {
  var new_grid = [];
  for (var i=0; i<grid.length; i++) {
    var row = grid[i];
    new_grid.push(row.split(',').map(c => {
      if (c == "") {
        return {empty: true};
      } else {
        return {text: c.toUpperCase()};
      }
    }));
  }
  for (var i=1; i<grid.length; i++) {
    if (new_grid[i].length != new_grid[0].length) {
      throw new Error("grid creation failed at row: " + i + ": " + new_grid[i].length + " != " + new_grid[0].length)
    }
  }
  return new_grid;
}

/**
 * Takes a two dimensional array and returns a div that can be inserted in the DOM.
 */
function grid_render(grid) {
  var g = document.createElement('div');
  g.className = "grid";
  for (i=0; i<new_grid.length; i++) {
    var r = document.createElement('div');
    r.className = "row";
    var row = new_grid[i];
    for (var j=0; j<row.length; j++) {
      var cell = row[j];
      var c = document.createElement('div');
      if (cell.empty) {
        c.className = "cell empty"
      } else {
        c.className = "cell notempty"
        var inp = document.createElement('input');
        inp.setAttribute('type', 'text');
        inp.setAttribute('maxlength', 1);
        inp.setAttribute('i', i);
        inp.setAttribute('j', j);
        if (cell.text != " ") {
          inp.value = cell.text;
        }
        c.appendChild(inp);
        // Create a reference to handle keyboard movements
        cell.inp = inp;

        var n = is_numbered(new_grid, i, j);
        if (n != -1) {
          var s = document.createElement('span');
          s.className = "hex";
          s.textContent = n.toString(16);
          inp.setAttribute('id', n.toString(16));
          c.prepend(s);
        }
      }
      r.appendChild(c);
    }
    g.appendChild(r);
  }
  return g;
}

/**
 * Helper function to access out of bounds elements.
 */
function idx(grid, x, y) {
  if ((x < 0) || (x >= grid.length)) {
    return {empty: true, out_of_bounds: true};
  }
  if ((y < 0) || (y >= grid[0].length)) {
    return {empty: true, out_of_bounds: true};
  }
  return grid[x][y];
}

/**
 * Returns true if the left is empty and the right is a letter.
 * Or if the top is empty and the bottom is a letter.
 */
function is_numbered(grid, x, y) {
  var found = false;
  if (idx(grid, x, y-1).empty && !idx(grid, x, y+1).empty) {
    across.push(counter.toString(16));
    found = true;
  }
  if (idx(grid, x-1, y).empty && !idx(grid, x+1, y).empty) {
    down.push(counter.toString(16));
    found = true;
  }
  if (found) {
    return counter++;
  }
  return -1;
}

function move_keyboard(dx, dy) {
  var x = (document.activeElement.getAttribute('i')|0) + dx;
  var y = (document.activeElement.getAttribute('j')|0) + dy;
  while (!idx(new_grid, x, y).out_of_bounds) {
    if (!new_grid[x][y].empty) {
      new_grid[x][y].inp.focus();
      setTimeout(() => new_grid[x][y].inp.select(), 0);
      break;
    } else {
      x += dx;
      y += dy;
    }
  }
}

function validate(key) {
  // Save the grid
  var gridText = JSON.stringify(new_grid.map(r => r.map(c => c.empty ? "" : (c.inp.value + " ")[0]).join(",")));
  localStorage.setItem('grid', gridText);

  // Display flag if the grid is "mostly" correct. Only look at intersections to keep things solvable.
  window.crypto.subtle.sign(
    {name: "HMAC"},
    key,
    get_intersections()
  ).then(sig => {
    var r = [...new Uint8Array(sig)].map(i => i.toString(16)).join('')
    if (r.substr(0,10) == "d7d9fcd45b") {
      flag.textContent = "🚩  = flag-" + r.substr(10, 10);
    } else {
      flag.textContent = "";
      console.log("sorry, no bueno.");
    }
  }).catch(err => console.log(err));
}

window.crypto.subtle.importKey(
  "raw",
  new Uint8Array([65,108,111,107]),
  {name: "HMAC", hash: {name: "SHA-256"}},
  false,
  ["sign", "verify"]
).then(function(key) {
  validate(key);
  document.body.addEventListener('input', () => validate(key));
}).catch(err => console.log(err));
document.body.addEventListener('keydown', (ev) => {
  if (ev.key == "ArrowUp") {
    move_keyboard(-1, 0);
  } else if (ev.key == 'ArrowDown') {
    move_keyboard(1, 0);
  } else if (ev.key == 'ArrowLeft') {
    move_keyboard(0, -1);
  } else if (ev.key == 'ArrowRight') {
    move_keyboard(0, 1);
  }
});
