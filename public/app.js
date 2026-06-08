const sessionLabel = document.getElementById("sessionLabel");
const logoutButton = document.getElementById("logoutButton");
const bookingForm = document.getElementById("bookingForm");
const resourceTypeInput = document.getElementById("resourceType");
const resourceIdInput = document.getElementById("resourceId");
const adminTargetGroup = document.getElementById("adminTargetGroup");
const adminTargetUserNameInput = document.getElementById("adminTargetUserName");
const startAtInput = document.getElementById("startAt");
const endAtInput = document.getElementById("endAt");
const formMessage = document.getElementById("formMessage");
const passwordForm = document.getElementById("passwordForm");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const passwordMessage = document.getElementById("passwordMessage");
const adminUsersPanel = document.getElementById("adminUsersPanel");
const userForm = document.getElementById("userForm");
const editingUserIdInput = document.getElementById("editingUserId");
const managedUserNameInput = document.getElementById("managedUserName");
const managedUserRoleInput = document.getElementById("managedUserRole");
const managedUserActiveInput = document.getElementById("managedUserActive");
const managedUserPasswordInput = document.getElementById("managedUserPassword");
const cancelUserEditButton = document.getElementById("cancelUserEditButton");
const userMessage = document.getElementById("userMessage");
const usersList = document.getElementById("usersList");
const bookingFilter = document.getElementById("bookingFilter");
const bookingsList = document.getElementById("bookingsList");
const calendarGrid = document.getElementById("calendarGrid");
const weekLabel = document.getElementById("weekLabel");
const previousWeekButton = document.getElementById("previousWeekButton");
const todayButton = document.getElementById("todayButton");
const nextWeekButton = document.getElementById("nextWeekButton");

let resources = {
  washer: [],
  drying_room: []
};
let authToken = sessionStorage.getItem("washraumAuthToken");
let userName = sessionStorage.getItem("washraumUserName");
let role = sessionStorage.getItem("washraumUserRole") || "user";
let allBookings = [];
let allUsers = [];
let visibleWeekStart = startOfWeek(new Date());

if (!authToken) {
  window.location.href = "/login.html";
}

logoutButton.addEventListener("click", async () => {
  await fetch("/api/logout", {
    method: "POST",
    headers: authHeaders()
  });
  sessionStorage.removeItem("washraumUserName");
  sessionStorage.removeItem("washraumUserRole");
  sessionStorage.removeItem("washraumAuthToken");
  window.location.href = "/login.html";
});

resourceTypeInput.addEventListener("change", updateResourceOptions);
bookingFilter.addEventListener("change", renderBookings);
previousWeekButton.addEventListener("click", () => moveWeek(-1));
todayButton.addEventListener("click", () => {
  visibleWeekStart = startOfWeek(new Date());
  renderBookings();
});
nextWeekButton.addEventListener("click", () => moveWeek(1));

startAtInput.addEventListener("change", () => {
  updateEndAfterStart({ force: !endAtInput.value });
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordMessage.textContent = "";

  const response = await fetch("/api/me/password", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      currentPassword: currentPasswordInput.value,
      newPassword: newPasswordInput.value
    })
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    passwordMessage.textContent = messageForError(data.error);
    return;
  }

  passwordForm.reset();
  passwordMessage.textContent = "Passwort aktualisiert.";
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  userMessage.textContent = "";

  const editingUserId = editingUserIdInput.value;
  const body = {
    userName: managedUserNameInput.value.trim(),
    role: managedUserRoleInput.value,
    active: managedUserActiveInput.value === "1"
  };

  if (managedUserPasswordInput.value) {
    body.password = managedUserPasswordInput.value;
  }

  const response = await fetch(editingUserId ? `/api/admin/users/${editingUserId}` : "/api/admin/users", {
    method: editingUserId ? "PATCH" : "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    userMessage.textContent = messageForError(data.error);
    return;
  }

  userMessage.textContent = editingUserId ? "Nutzer aktualisiert." : "Nutzer angelegt.";
  resetUserForm();
  await loadUsers();
});

cancelUserEditButton.addEventListener("click", () => {
  resetUserForm();
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const body = {
    resourceType: resourceTypeInput.value,
    resourceId: resourceIdInput.value,
    startAt: startAtInput.value,
    endAt: endAtInput.value
  };

  if (role === "admin" && adminTargetUserNameInput.value.trim()) {
    body.userName = adminTargetUserNameInput.value.trim();
  }

  const response = await fetch(role === "admin" ? "/api/admin/addBooking" : "/api/bookings", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    formMessage.textContent = messageForError(data.error);
    return;
  }

  bookingForm.reset();
  updateResourceOptions();
  updateAdminControls();
  setDefaultBookingTimes();
  formMessage.textContent = "Buchung gespeichert.";
  await loadBookings();
});

function updateResourceOptions() {
  const selectedType = resourceTypeInput.value;
  resourceIdInput.innerHTML = "";

  for (const resourceId of resources[selectedType] || []) {
    const option = document.createElement("option");
    option.value = resourceId;
    option.textContent = resourceId;
    resourceIdInput.append(option);
  }
}

function updateDateInputMinimums() {
  const minValue = formatDateTimeInputValue(new Date());
  startAtInput.min = minValue;
  endAtInput.min = minValue;
}

function setDefaultBookingTimes() {
  const start = nextDefaultStart();
  startAtInput.value = formatDateTimeInputValue(start);
  updateEndAfterStart({ force: true });
}

function updateEndAfterStart({ force = false } = {}) {
  if (!startAtInput.value) {
    return;
  }

  const start = new Date(startAtInput.value);
  const suggestedEnd = new Date(start.getTime() + 1000 * 60 * 120);
  endAtInput.min = formatDateTimeInputValue(start);

  if (force || !endAtInput.value || new Date(endAtInput.value) <= start) {
    endAtInput.value = formatDateTimeInputValue(suggestedEnd);
  }
}

async function loadBookings() {
  const response = await fetch("/api/bookings");
  const data = await response.json();
  allBookings = data.bookings;
  renderBookings();
}

async function loadResources() {
  const response = await fetch("/api/resources");
  const data = await response.json();
  resources = data.resources;
}

async function loadUsers() {
  if (role !== "admin") {
    return;
  }

  const response = await fetch("/api/admin/users", {
    headers: authHeaders()
  });
  const data = await response.json();
  allUsers = data.users;
  renderUsers();
}

function renderBookings() {
  const filter = bookingFilter.value;
  const bookings = allBookings.filter((booking) => {
    return filter === "all" || booking.resource_type === filter;
  });

  renderBookingsList(bookings);
  renderCalendar(bookings);
}

function renderBookingsList(bookings) {
  bookingsList.innerHTML = "";

  if (bookings.length === 0) {
    bookingsList.textContent = "Keine Buchungen vorhanden.";
    return;
  }

  for (const booking of bookings) {
    const item = document.createElement("article");
    item.className = "booking-item";

    const title = document.createElement("h3");
    title.textContent = `${resourceLabel(booking.resource_type)} ${booking.resource_id}`;

    const meta = document.createElement("p");
    meta.textContent = `${formatDate(booking.start_at)} bis ${formatDate(booking.end_at)} - ${booking.user_name}`;

    item.append(title, meta);

    if (role === "admin" || booking.user_name === userName) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Loeschen";
      deleteButton.addEventListener("click", () => deleteBooking(booking.id));
      item.append(deleteButton);
    }

    bookingsList.append(item);
  }
}

function renderCalendar(bookings) {
  const weekDays = getWeekDays(visibleWeekStart);
  const weekEnd = addDays(visibleWeekStart, 6);
  weekLabel.textContent = `${formatDateOnly(visibleWeekStart)} bis ${formatDateOnly(weekEnd)}`;
  calendarGrid.innerHTML = "";

  for (const day of weekDays) {
    const column = document.createElement("section");
    column.className = "calendar-day";

    const heading = document.createElement("h3");
    heading.textContent = formatDayHeading(day);
    column.append(heading);

    const dayBookings = bookings.filter((booking) => isSameDay(new Date(booking.start_at), day));

    if (dayBookings.length === 0) {
      const empty = document.createElement("p");
      empty.className = "calendar-empty";
      empty.textContent = "Frei";
      column.append(empty);
    }

    for (const booking of dayBookings) {
      const item = document.createElement("article");
      item.className = `calendar-booking calendar-booking-${booking.resource_type}`;
      item.textContent = `${formatTime(booking.start_at)}-${formatTime(booking.end_at)} ${resourceLabel(booking.resource_type)} ${booking.resource_id}`;
      column.append(item);
    }

    calendarGrid.append(column);
  }
}

function renderUsers() {
  usersList.innerHTML = "";

  for (const user of allUsers) {
    const item = document.createElement("article");
    item.className = "user-item";

    const details = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = user.user_name;

    const meta = document.createElement("p");
    meta.textContent = `${user.role === "admin" ? "Admin" : "Nutzer"} - ${user.active ? "aktiv" : "inaktiv"}`;

    details.append(title, meta);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => editUser(user));

    item.append(details, editButton);
    usersList.append(item);
  }
}

function editUser(user) {
  editingUserIdInput.value = user.id;
  managedUserNameInput.value = user.user_name;
  managedUserRoleInput.value = user.role;
  managedUserActiveInput.value = user.active ? "1" : "0";
  managedUserPasswordInput.value = "";
  managedUserPasswordInput.placeholder = "Leer lassen, wenn unveraendert";
  userMessage.textContent = "";
}

function resetUserForm() {
  userForm.reset();
  editingUserIdInput.value = "";
  managedUserRoleInput.value = "user";
  managedUserActiveInput.value = "1";
  managedUserPasswordInput.placeholder = "";
}

async function deleteBooking(id) {
  const response = await fetch("/api/user/deleteBooking", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ id })
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    formMessage.textContent = messageForError(data.error);
    return;
  }

  await loadBookings();
}

function resourceLabel(type) {
  return type === "washer" ? "Waschmaschine" : "Trockenraum";
}

function authHeaders() {
  return {
    "Authorization": `Bearer ${authToken}`,
    "Content-Type": "application/json"
  };
}

async function loadSession() {
  const response = await fetch("/api/session", {
    headers: authHeaders()
  });

  if (!response.ok) {
    sessionStorage.removeItem("washraumUserName");
    sessionStorage.removeItem("washraumUserRole");
    sessionStorage.removeItem("washraumAuthToken");
    window.location.href = "/login.html";
    return false;
  }

  const data = await response.json();
  userName = data.user.userName;
  role = data.user.role;
  sessionStorage.setItem("washraumUserName", userName);
  sessionStorage.setItem("washraumUserRole", role);
  sessionLabel.textContent = `${userName} (${role})`;
  updateAdminControls();

  return true;
}

function updateAdminControls() {
  const isAdmin = role === "admin";
  adminTargetGroup.classList.toggle("hidden", !isAdmin);
  adminUsersPanel.classList.toggle("hidden", !isAdmin);
  adminTargetUserNameInput.required = false;
  adminTargetUserNameInput.placeholder = isAdmin ? userName : "";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDateOnly(value) {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium"
  }).format(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDayHeading(value) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(value);
}

function formatDateTimeInputValue(value) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function nextDefaultStart() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);

  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0);
  }

  return date;
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function getWeekDays(weekStart) {
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(weekStart, offset));
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function moveWeek(direction) {
  visibleWeekStart = addDays(visibleWeekStart, direction * 7);
  renderBookings();
}

function messageForError(error) {
  const messages = {
    missing_required_fields: "Bitte alle Felder ausfuellen.",
    missing_login_fields: "Bitte Name und Passwort eingeben.",
    invalid_login: "Name oder Passwort stimmt nicht.",
    user_inactive: "Dieses Nutzerkonto ist deaktiviert.",
    not_authenticated: "Bitte neu einloggen.",
    admin_required: "Diese Aktion ist nur fuer Admins moeglich.",
    missing_user_fields: "Bitte Name, Rolle und Passwort ausfuellen.",
    invalid_user_role: "Unbekannte Rolle.",
    invalid_user_name: "Der Name muss 2 bis 60 Zeichen lang sein.",
    password_too_short: "Das Passwort braucht mindestens 6 Zeichen.",
    invalid_current_password: "Das aktuelle Passwort stimmt nicht.",
    last_admin_required: "Mindestens ein Admin muss bestehen bleiben.",
    user_already_exists: "Dieser Nutzer existiert bereits.",
    user_not_found: "Nutzer nicht gefunden.",
    invalid_resource_type: "Unbekannter Bereich.",
    invalid_resource_id: "Unbekannte Maschine oder unbekannter Raum.",
    invalid_time_range: "Bitte Start und Ende pruefen.",
    booking_must_be_in_future: "Buchungen muessen in der Zukunft liegen.",
    sunday_not_allowed: "Am Sonntag sind keine Buchungen moeglich.",
    only_one_future_booking_allowed: "Bitte nur 1 x im Voraus eintragen.",
    time_range_already_booked: "Dieser Zeitraum ist bereits belegt.",
    booking_id_required: "Keine Buchung ausgewaehlt.",
    booking_not_found: "Buchung nicht gefunden.",
    not_allowed: "Diese Buchung kann nicht geloescht werden."
  };

  return messages[error] || "Die Aktion konnte nicht ausgefuehrt werden.";
}

async function boot() {
  const validSession = await loadSession();
  if (!validSession) {
    return;
  }

  await loadResources();
  updateResourceOptions();
  updateDateInputMinimums();
  setDefaultBookingTimes();
  await loadUsers();
  await loadBookings();
}

boot();
