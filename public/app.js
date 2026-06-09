const sessionLabel = document.getElementById("sessionLabel");
const logoutButton = document.getElementById("logoutButton");
const bookingForm = document.getElementById("bookingForm");
const resourceTypeInput = document.getElementById("resourceType");
const resourceIdInput = document.getElementById("resourceId");
const slotGroup = document.getElementById("slotGroup");
const bookingSlotInput = document.getElementById("bookingSlot");
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
const managedDisplayNameInput = document.getElementById("managedDisplayName");
const managedApartmentLabelInput = document.getElementById("managedApartmentLabel");
const managedUserRoleInput = document.getElementById("managedUserRole");
const managedUserActiveInput = document.getElementById("managedUserActive");
const managedUserPasswordInput = document.getElementById("managedUserPassword");
const cancelUserEditButton = document.getElementById("cancelUserEditButton");
const userMessage = document.getElementById("userMessage");
const usersList = document.getElementById("usersList");
const adminBlockedDatesPanel = document.getElementById("adminBlockedDatesPanel");
const blockedDateForm = document.getElementById("blockedDateForm");
const blockedDateInput = document.getElementById("blockedDateInput");
const blockedDateLabelInput = document.getElementById("blockedDateLabelInput");
const blockedDateMessage = document.getElementById("blockedDateMessage");
const blockedDatesList = document.getElementById("blockedDatesList");
const adminOpsPanel = document.getElementById("adminOpsPanel");
const downloadBackupButton = document.getElementById("downloadBackupButton");
const opsMessage = document.getElementById("opsMessage");
const bookingFilter = document.getElementById("bookingFilter");
const bookingsList = document.getElementById("bookingsList");
const calendarGrid = document.getElementById("calendarGrid");
const weekLabel = document.getElementById("weekLabel");
const previousWeekButton = document.getElementById("previousWeekButton");
const todayButton = document.getElementById("todayButton");
const nextWeekButton = document.getElementById("nextWeekButton");
const monthlyPlanGrid = document.getElementById("monthlyPlanGrid");
const planMonthInput = document.getElementById("planMonthInput");
const previousMonthButton = document.getElementById("previousMonthButton");
const currentMonthButton = document.getElementById("currentMonthButton");
const nextMonthButton = document.getElementById("nextMonthButton");
const printMonthButton = document.getElementById("printMonthButton");

let resources = {
  washer: [],
  drying_room: [],
  tumbler: []
};
let slotConfig = {
  washer: [],
  drying_room: [],
  tumbler: []
};
let authToken = sessionStorage.getItem("washraumAuthToken");
let userName = sessionStorage.getItem("washraumUserName");
let role = sessionStorage.getItem("washraumUserRole") || "user";
let allBookings = [];
let allUsers = [];
let blockedDates = [];
let visibleWeekStart = startOfWeek(new Date());
let visibleMonth = startOfMonth(new Date());

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

resourceTypeInput.addEventListener("change", () => {
  updateResourceOptions();
  updateSlotControls();
});
bookingFilter.addEventListener("change", renderBookings);
previousWeekButton.addEventListener("click", () => moveWeek(-1));
todayButton.addEventListener("click", () => {
  visibleWeekStart = startOfWeek(new Date());
  renderBookings();
});
nextWeekButton.addEventListener("click", () => moveWeek(1));
previousMonthButton.addEventListener("click", () => moveMonth(-1));
currentMonthButton.addEventListener("click", () => {
  visibleMonth = startOfMonth(new Date());
  renderBookings();
});
nextMonthButton.addEventListener("click", () => moveMonth(1));
planMonthInput.addEventListener("change", () => {
  const selectedMonth = monthInputDate(planMonthInput.value);
  if (selectedMonth) {
    visibleMonth = selectedMonth;
    renderBookings();
  }
});
printMonthButton.addEventListener("click", () => window.print());

startAtInput.addEventListener("change", () => {
  applySelectedSlot();
  updateEndAfterStart({ force: !endAtInput.value });
});

bookingSlotInput.addEventListener("change", () => {
  applySelectedSlot();
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
    displayName: managedDisplayNameInput.value.trim(),
    apartmentLabel: managedApartmentLabelInput.value.trim(),
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

blockedDateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  blockedDateMessage.textContent = "";

  const response = await fetch("/api/admin/blocked-dates", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      date: blockedDateInput.value,
      label: blockedDateLabelInput.value.trim()
    })
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    blockedDateMessage.textContent = messageForError(data.error);
    return;
  }

  blockedDateForm.reset();
  blockedDateMessage.textContent = "Sperrtag gespeichert.";
  await loadBlockedDates();
});

downloadBackupButton.addEventListener("click", async () => {
  opsMessage.textContent = "";

  const response = await fetch("/api/admin/backup", {
    headers: authHeaders()
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    opsMessage.textContent = messageForError(data.error);
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName(response.headers.get("Content-Disposition"));
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  opsMessage.textContent = "Backup wurde vorbereitet.";
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
  updateSlotControls();
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

function updateSlotControls() {
  const resourceType = resourceTypeInput.value;
  const configuredSlots = slotConfig[resourceType] || [];
  const hasSlots = configuredSlots.length > 0;
  slotGroup.classList.toggle("hidden", !hasSlots);
  bookingSlotInput.innerHTML = "";

  for (const slot of configuredSlots) {
    const option = document.createElement("option");
    option.value = slot.id;
    option.textContent = slot.label;
    bookingSlotInput.append(option);
  }

  startAtInput.readOnly = hasSlots;
  endAtInput.readOnly = hasSlots;
  if (hasSlots) {
    applySelectedSlot();
  }
}

function updateDateInputMinimums() {
  const minValue = formatDateTimeInputValue(new Date());
  startAtInput.min = minValue;
  endAtInput.min = minValue;
}

function setDefaultBookingTimes() {
  if ((slotConfig[resourceTypeInput.value] || []).length > 0) {
    const selection = nextDefaultSlotSelection(resourceTypeInput.value);
    if (selection) {
      startAtInput.value = formatDateTimeInputValue(selection.date);
      bookingSlotInput.value = selection.slot.id;
      applySelectedSlot();
      return;
    }
  }

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

function applySelectedSlot() {
  const resourceType = resourceTypeInput.value;
  if (!bookingSlotInput.value) {
    return;
  }

  const slot = (slotConfig[resourceType] || []).find((entry) => entry.id === bookingSlotInput.value);
  if (!slot) {
    return;
  }

  const baseDate = startAtInput.value ? new Date(startAtInput.value) : nextDefaultStart();
  const start = withTime(baseDate, slot.start);
  const end = withTime(baseDate, slot.end);
  startAtInput.value = formatDateTimeInputValue(start);
  endAtInput.value = formatDateTimeInputValue(end);
  endAtInput.min = startAtInput.value;
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
  slotConfig = data.slots || {};
  blockedDates = data.blockedDates || [];
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

async function loadBlockedDates() {
  if (role !== "admin") {
    return;
  }

  const response = await fetch("/api/admin/blocked-dates", {
    headers: authHeaders()
  });
  const data = await response.json();
  blockedDates = data.blockedDates || [];
  renderBlockedDates();
  renderBookings();
}

function renderBookings() {
  const filter = bookingFilter.value;
  const bookings = allBookings.filter((booking) => {
    return filter === "all" || booking.resource_type === filter;
  });

  renderBookingsList(bookings);
  renderCalendar(bookings);
  renderMonthlyPlan(allBookings);
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
    meta.textContent = `${formatDate(booking.start_at)} bis ${formatDate(booking.end_at)} - ${partyLabel(booking)}`;

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
    if (day.getDay() === 0 || blockedDateForDay(day)) {
      column.classList.add("calendar-day-closed");
    }

    const heading = document.createElement("h3");
    heading.textContent = formatDayHeading(day);
    column.append(heading);

    const blockedDate = blockedDateForDay(day);
    if (day.getDay() === 0 || blockedDate) {
      const closed = document.createElement("p");
      closed.className = "calendar-closed";
      closed.textContent = blockedDate ? `Gesperrt: ${blockedDate.label}` : "Sonntag geschlossen";
      column.append(closed);
    }

    const dayBookings = bookings
      .filter((booking) => isSameDay(new Date(booking.start_at), day))
      .sort((left, right) => new Date(left.start_at) - new Date(right.start_at));

    if (dayBookings.length === 0) {
      const empty = document.createElement("p");
      empty.className = "calendar-empty";
      empty.textContent = "Frei";
      column.append(empty);
    }

    for (const booking of dayBookings) {
      const item = document.createElement("article");
      item.className = `calendar-booking calendar-booking-${booking.resource_type}`;

      const time = document.createElement("strong");
      time.textContent = `${formatTime(booking.start_at)}-${formatTime(booking.end_at)}`;
      const resource = document.createElement("span");
      resource.textContent = `${resourceLabel(booking.resource_type)} ${booking.resource_id}`;
      const user = document.createElement("small");
      user.textContent = partyLabel(booking);

      item.append(time, resource, user);
      column.append(item);
    }

    calendarGrid.append(column);
  }
}

function renderMonthlyPlan(bookings) {
  planMonthInput.value = monthInputValue(visibleMonth);
  monthlyPlanGrid.innerHTML = "";

  const resourceTypes = ["washer", "drying_room", "tumbler"];
  for (const resourceType of resourceTypes) {
    for (const resourceId of resources[resourceType] || []) {
      monthlyPlanGrid.append(monthResourceTable({
        bookings,
        resourceType,
        resourceId,
        month: visibleMonth
      }));
    }
  }
}

function monthResourceTable({ bookings, resourceType, resourceId, month }) {
  const section = document.createElement("section");
  section.className = "month-resource";

  const heading = document.createElement("h3");
  heading.textContent = `${resourceLabel(resourceType)} ${resourceId}`;
  section.append(heading);

  const table = document.createElement("table");
  table.className = "month-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.append(monthHeaderCell("Tag"), monthHeaderCell("WT"));
  for (const slot of slotConfig[resourceType] || []) {
    headerRow.append(monthHeaderCell(slot.label));
  }
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  for (const day of daysInMonth(month)) {
    tbody.append(monthDayRow({ bookings, resourceType, resourceId, day }));
  }
  table.append(tbody);
  section.append(table);

  return section;
}

function monthHeaderCell(text) {
  const cell = document.createElement("th");
  cell.scope = "col";
  cell.textContent = text;
  return cell;
}

function monthDayRow({ bookings, resourceType, resourceId, day }) {
  const row = document.createElement("tr");
  const blockedDate = blockedDateForDay(day);
  const isClosed = day.getDay() === 0 || Boolean(blockedDate);
  if (isClosed) {
    row.className = "month-row-closed";
  }

  const dayCell = document.createElement("th");
  dayCell.scope = "row";
  dayCell.textContent = String(day.getDate());
  row.append(dayCell);

  const weekdayCell = document.createElement("td");
  weekdayCell.textContent = shortWeekday(day);
  row.append(weekdayCell);

  for (const slot of slotConfig[resourceType] || []) {
    const cell = document.createElement("td");
    const booking = bookings.find((entry) => isBookingInSlot({ entry, resourceType, resourceId, day, slot }));

    if (isClosed) {
      cell.className = "month-slot-closed";
      cell.textContent = blockedDate ? blockedDate.label : "So";
    } else if (booking) {
      cell.className = "month-slot-booked";
      cell.textContent = partyLabel(booking);
    }

    row.append(cell);
  }

  return row;
}

function renderBlockedDates() {
  blockedDatesList.innerHTML = "";

  if (blockedDates.length === 0) {
    blockedDatesList.textContent = "Keine Sperrtage gepflegt.";
    return;
  }

  for (const blockedDate of blockedDates) {
    const item = document.createElement("article");
    item.className = "blocked-date-item";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = blockedDate.label;
    const meta = document.createElement("p");
    meta.textContent = formatDateKey(blockedDate.date);
    details.append(title, meta);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Entfernen";
    deleteButton.addEventListener("click", () => deleteBlockedDate(blockedDate.date));

    item.append(details, deleteButton);
    blockedDatesList.append(item);
  }
}

function renderUsers() {
  usersList.innerHTML = "";

  for (const user of allUsers) {
    const item = document.createElement("article");
    item.className = "user-item";

    const details = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = user.apartment_label
      ? `${user.apartment_label} - ${user.user_name}`
      : user.user_name;

    const meta = document.createElement("p");
    const displayName = user.display_name ? `${user.display_name} - ` : "";
    meta.textContent = `${displayName}${user.role === "admin" ? "Admin" : "Nutzer"} - ${user.active ? "aktiv" : "inaktiv"}`;

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
  managedDisplayNameInput.value = user.display_name || "";
  managedApartmentLabelInput.value = user.apartment_label || "";
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

async function deleteBlockedDate(date) {
  const response = await fetch(`/api/admin/blocked-dates/${date}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  const data = await response.json();

  if (!response.ok || !data.ok) {
    blockedDateMessage.textContent = messageForError(data.error);
    return;
  }

  blockedDateMessage.textContent = "Sperrtag entfernt.";
  await loadBlockedDates();
}

function backupFileName(contentDisposition) {
  const fallback = `washraum-backup-${dateKey(new Date())}.sqlite`;
  const match = String(contentDisposition || "").match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

function resourceLabel(type) {
  const labels = {
    washer: "Waschmaschine",
    drying_room: "Trockenraum",
    tumbler: "Tumbler"
  };

  return labels[type] || type;
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
  adminBlockedDatesPanel.classList.toggle("hidden", !isAdmin);
  adminOpsPanel.classList.toggle("hidden", !isAdmin);
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

function formatDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return formatDateOnly(new Date(year, month - 1, day));
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

function shortWeekday(value) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short"
  }).format(value).replace(".", "");
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

function nextDefaultSlotSelection(resourceType) {
  const configuredSlots = slotConfig[resourceType] || [];
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const date = addDays(candidate, dayOffset);
    if (date.getDay() === 0 || blockedDateForDay(date)) {
      continue;
    }

    for (const slot of configuredSlots) {
      const slotStart = withTime(date, slot.start);
      if (slotStart > now) {
        return { date: slotStart, slot };
      }
    }
  }

  return configuredSlots[0] ? { date: nextDefaultStart(), slot: configuredSlots[0] } : null;
}

function withTime(date, time) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function daysInMonth(value) {
  const days = [];
  const date = startOfMonth(value);

  while (date.getMonth() === value.getMonth()) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

function getWeekDays(weekStart) {
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => addDays(weekStart, offset));
}

function isSameDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function blockedDateForDay(day) {
  const key = dateKey(day);
  return blockedDates.find((blockedDate) => blockedDate.date === key);
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function moveWeek(direction) {
  visibleWeekStart = addDays(visibleWeekStart, direction * 7);
  renderBookings();
}

function moveMonth(direction) {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + direction, 1);
  renderBookings();
}

function monthInputValue(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function monthInputDate(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) {
    return null;
  }

  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
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
    invalid_display_name: "Der Anzeigename darf maximal 80 Zeichen lang sein.",
    invalid_apartment_label: "Partei/Wohnung darf maximal 40 Zeichen lang sein.",
    password_too_short: "Das Passwort braucht mindestens 6 Zeichen.",
    invalid_current_password: "Das aktuelle Passwort stimmt nicht.",
    last_admin_required: "Mindestens ein Admin muss bestehen bleiben.",
    user_already_exists: "Dieser Nutzer existiert bereits.",
    user_not_found: "Nutzer nicht gefunden.",
    missing_blocked_date_fields: "Bitte Datum und Bezeichnung ausfuellen.",
    invalid_blocked_date: "Bitte ein gueltiges Datum waehlen.",
    invalid_blocked_date_label: "Die Bezeichnung muss 2 bis 80 Zeichen lang sein.",
    blocked_date_already_exists: "Dieser Sperrtag existiert bereits.",
    blocked_date_not_found: "Sperrtag nicht gefunden.",
    invalid_resource_type: "Unbekannter Bereich.",
    invalid_resource_id: "Unbekannte Maschine oder unbekannter Raum.",
    invalid_booking_slot: "Bitte ein gueltiges Zeitfenster waehlen.",
    washer_daily_limit_reached: "Pro Tag koennen maximal drei Waschmaschinen gebucht werden.",
    invalid_time_range: "Bitte Start und Ende pruefen.",
    booking_must_be_in_future: "Buchungen muessen in der Zukunft liegen.",
    sunday_not_allowed: "Am Sonntag sind keine Buchungen moeglich.",
    blocked_date: "An diesem Feiertag sind keine Buchungen moeglich.",
    only_one_future_booking_allowed: "Bitte nur 1 x im Voraus eintragen.",
    time_range_already_booked: "Dieser Zeitraum ist bereits belegt.",
    booking_id_required: "Keine Buchung ausgewaehlt.",
    booking_not_found: "Buchung nicht gefunden.",
    not_allowed: "Diese Buchung kann nicht geloescht werden."
  };

  return messages[error] || "Die Aktion konnte nicht ausgefuehrt werden.";
}

function partyLabel(booking) {
  const parts = [];
  if (booking.apartment_label) {
    parts.push(booking.apartment_label);
  }
  if (booking.user_display_name) {
    parts.push(booking.user_display_name);
  }
  if (parts.length === 0) {
    parts.push(booking.user_name);
  }

  return parts.join(" - ");
}

function isBookingInSlot({ entry, resourceType, resourceId, day, slot }) {
  if (entry.resource_type !== resourceType || entry.resource_id !== resourceId) {
    return false;
  }

  const start = new Date(entry.start_at);
  const end = new Date(entry.end_at);
  return isSameDay(start, day) && timeKey(start) === slot.start && timeKey(end) === slot.end;
}

function timeKey(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function boot() {
  const validSession = await loadSession();
  if (!validSession) {
    return;
  }

  await loadResources();
  updateResourceOptions();
  updateSlotControls();
  updateDateInputMinimums();
  setDefaultBookingTimes();
  await loadUsers();
  await loadBlockedDates();
  await loadBookings();
}

boot();
