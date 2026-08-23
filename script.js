(() => {
  "use strict";

  const STORAGE_KEY = "taskLog.tasks.v1";

  /** @type {{id:number, text:string, done:boolean, createdAt:number}[]} */
  let tasks = loadTasks();
  let activeFilter = "all"; // "all" | "pending" | "completed"
  let searchQuery = "";

  // ---- DOM refs ----
  const taskInput = document.getElementById("taskInput");
  const addBtn = document.getElementById("addBtn");
  const inputHint = document.getElementById("inputHint");
  const searchBox = document.getElementById("searchBox");
  const filterTabs = document.getElementById("filterTabs");
  const taskList = document.getElementById("taskList");
  const rowTemplate = document.getElementById("taskRowTemplate");

  const statTotal = document.getElementById("statTotal");
  const statOpen = document.getElementById("statOpen");
  const statDone = document.getElementById("statDone");

  // ---- Storage helpers ----
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Could not read tasks from localStorage:", err);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error("Could not save tasks to localStorage:", err);
      showHint("Storage is full or unavailable — changes may not persist.");
    }
  }

  // ---- CRUD ----
  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      showHint("Task cannot be empty.");
      return false;
    }
    tasks.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: trimmed,
      done: false,
      createdAt: Date.now(),
    });
    saveTasks();
    render();
    return true;
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }

  function toggleTask(id) {
    const t = tasks.find((t) => t.id === id);
    if (t) t.done = !t.done;
    saveTasks();
    render();
  }

  function editTask(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return false;
    const t = tasks.find((t) => t.id === id);
    if (t) t.text = trimmed;
    saveTasks();
    render();
    return true;
  }

  // ---- UI helpers ----
  function showHint(msg) {
    inputHint.textContent = msg;
    if (msg) {
      clearTimeout(showHint._t);
      showHint._t = setTimeout(() => (inputHint.textContent = ""), 2500);
    }
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function matchesFilter(task) {
    if (activeFilter === "pending") return !task.done;
    if (activeFilter === "completed") return task.done;
    return true;
  }

  function matchesSearch(task) {
    if (!searchQuery) return true;
    return task.text.toLowerCase().includes(searchQuery);
  }

  // ---- Render ----
  function render() {
    taskList.innerHTML = "";

    tasks.forEach((task, idx) => {
      const node = rowTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = String(task.id);
      node.classList.toggle("is-done", task.done);

      const visible = matchesFilter(task) && matchesSearch(task);
      node.classList.toggle("is-hidden", !visible);

      node.querySelector(".task-index").textContent =
        "#" + String(idx + 1).padStart(3, "0");
      node.querySelector(".task-text").textContent = task.text;
      node.querySelector(".task-edit-input").value = task.text;
      node.querySelector(".task-time").textContent = formatTime(task.createdAt);

      taskList.appendChild(node);
    });

    updateStats();
  }

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    statTotal.textContent = total;
    statDone.textContent = done;
    statOpen.textContent = total - done;
  }

  // ---- Event wiring ----
  addBtn.addEventListener("click", () => {
    if (addTask(taskInput.value)) {
      taskInput.value = "";
      taskInput.focus();
    }
  });

  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBtn.click();
    }
  });

  searchBox.addEventListener("input", () => {
    searchQuery = searchBox.value.trim().toLowerCase();
    render();
  });

  filterTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    [...filterTabs.querySelectorAll(".filter-tab")].forEach((tab) => {
      const isActive = tab === btn;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    render();
  });

  // Event delegation for row actions (toggle / edit / save / delete)
  taskList.addEventListener("click", (e) => {
    const row = e.target.closest(".ledger__row");
    if (!row) return;
    const id = Number(row.dataset.id);
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === "toggle") {
      toggleTask(id);
    } else if (action === "delete") {
      deleteTask(id);
    } else if (action === "edit") {
      row.classList.add("is-editing");
      const input = row.querySelector(".task-edit-input");
      input.focus();
      input.select();
    } else if (action === "save") {
      commitEdit(row, id);
    }
  });

  taskList.addEventListener("keydown", (e) => {
    const row = e.target.closest(".ledger__row");
    if (!row || !e.target.classList.contains("task-edit-input")) return;
    const id = Number(row.dataset.id);
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit(row, id);
    } else if (e.key === "Escape") {
      row.classList.remove("is-editing");
      e.target.value = tasks.find((t) => t.id === id)?.text ?? "";
    }
  });

  function commitEdit(row, id) {
    const input = row.querySelector(".task-edit-input");
    if (editTask(id, input.value)) {
      row.classList.remove("is-editing");
    } else {
      showHint("Task cannot be empty.");
    }
  }

  // ---- Init ----
  render();
})();
