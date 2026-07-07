// Terminal renderer: scrollback, prompt echo, command history, verb chips.
// All DOM work lives here; the engine only knows the print callback.

const _term = (() => {
  let _out, _input;
  const _history = [];
  let _histIdx = -1;

  function print(text, cls) {
    if (!_out) return;
    const div = document.createElement("div");
    div.className = "t-line" + (cls ? " t-" + cls : "");
    div.textContent = text;
    _out.appendChild(div);
    _out.scrollTop = _out.scrollHeight;
  }

  function echo(cmd) {
    const div = document.createElement("div");
    div.className = "t-line t-echo";
    div.textContent = "❯ " + cmd;
    _out.appendChild(div);
  }

  function submit(onCommand) {
    const cmd = _input.value.trim();
    if (!cmd) return;
    echo(cmd);
    _history.push(cmd);
    _histIdx = _history.length;
    _input.value = "";
    onCommand(cmd);
    _out.scrollTop = _out.scrollHeight;
  }

  function init(onCommand) {
    _out = document.getElementById("term-out");
    _input = document.getElementById("term-in");

    _input.addEventListener("keydown", e => {
      if (e.key === "Enter") { submit(onCommand); }
      else if (e.key === "ArrowUp") {
        if (_histIdx > 0) { _histIdx--; _input.value = _history[_histIdx]; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (_histIdx < _history.length - 1) { _histIdx++; _input.value = _history[_histIdx]; }
        else { _histIdx = _history.length; _input.value = ""; }
        e.preventDefault();
      }
    });

    // tap anywhere in the output refocuses the input (but let text selection be)
    _out.addEventListener("click", () => {
      if (!window.getSelection().toString()) _input.focus();
    });

    // verb chips: insert text; chips ending in a space wait for an object,
    // bare chips submit immediately
    document.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const t = chip.dataset.cmd;
        if (t.endsWith(" ")) {
          _input.value = t;
          _input.focus();
        } else {
          _input.value = t;
          submit(onCommand);
        }
      });
    });

    _input.focus();
  }

  return { init, print };
})();
